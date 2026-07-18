import json
import os
import sqlite3
from pathlib import Path
from typing import Dict, List, Optional

import requests
from langchain_core.documents import Document


class SmartGuideDemo:
    def __init__(self, base_dir: Path):
        self.base_dir = Path(base_dir)
        self.runtime_dir = self.base_dir / "runtime"
        self.runtime_dir.mkdir(parents=True, exist_ok=True)
        self.sql_dir = self.base_dir / "sql"
        self.db_path = self.runtime_dir / "db_enterprise_ga.sqlite3"
        self.chroma_dir = self.runtime_dir / "chroma_db"
        self.collection_name = "smart_guide_demo"

        self._load_local_env()
        self.zhipu_api_key = os.getenv("ZHIPU_API_KEY", "").strip()
        self.zhipu_base_url = os.getenv("ZHIPU_BASE_URL", "https://open.bigmodel.cn/api/paas/v4/chat/completions")
        self.zhipu_model = os.getenv("ZHIPU_MODEL", "glm-4-flash")

        self._vector_ready = False
        self._ensure_database()
        self._ensure_history_table()

    def _load_local_env(self) -> None:
        env_path = self.base_dir / ".env"
        if not env_path.exists():
            return
        for line in env_path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip())

    def health(self) -> Dict:
        return {
            "db_name": "db_enterprise_ga",
            "sqlite_path": str(self.db_path),
            "chroma_path": str(self.chroma_dir),
            "chat_model": self.zhipu_model,
            "embedding_model": "qwen3-embedding:4b",
            "document_count": len(self._load_documents()),
            "vector_ready": self._vector_ready,
            "models_ready": bool(self.zhipu_api_key),
        }

    def ask(self, question: str, visitor_id: str = "", client_type: str = "miniprogram") -> Dict:
        question = (question or "").strip()
        visitor_id = (visitor_id or "").strip()
        client_type = (client_type or "miniprogram").strip()

        if not question:
            return {"answer": "暂未查询到相关信息", "sources": []}

        docs = self._search_structured_knowledge(question)
        if docs:
            result = self._answer_from_docs(docs)
            self._save_chat_log(
                visitor_id=visitor_id,
                question=question,
                answer=result["answer"],
                sources=result["sources"],
                hit_mode="knowledge",
                scenic_code=docs[0].metadata.get("scenic_code", ""),
                client_type=client_type,
            )
            return result

        result = self._general_answer(question)
        self._save_chat_log(
            visitor_id=visitor_id,
            question=question,
            answer=result["answer"],
            sources=result["sources"],
            hit_mode="ai_fallback",
            scenic_code="",
            client_type=client_type,
        )
        return result

    def rebuild_vector_store(self) -> Dict:
        self._ensure_database()
        self._vector_ready = False
        return {
            "db_name": "db_enterprise_ga",
            "sqlite_path": str(self.db_path),
            "chroma_path": str(self.chroma_dir),
            "status": "rebuilt",
            "vector_ready": self._vector_ready,
        }

    def list_chat_logs(self, limit: int = 50) -> Dict:
        limit = max(1, min(int(limit or 50), 200))
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        try:
            rows = conn.execute(
                "SELECT id, visitor_id, question, answer, sources, hit_mode, scenic_code, client_type, created_at "
                "FROM guide_chat_log ORDER BY id DESC LIMIT ?",
                (limit,),
            ).fetchall()
            items = []
            for row in rows:
                try:
                    sources = json.loads(row["sources"] or "[]")
                except Exception:
                    sources = []
                items.append(
                    {
                        "id": row["id"],
                        "visitor_id": row["visitor_id"] or "",
                        "question": row["question"],
                        "answer": row["answer"],
                        "sources": sources,
                        "hit_mode": row["hit_mode"],
                        "scenic_code": row["scenic_code"] or "",
                        "client_type": row["client_type"],
                        "created_at": row["created_at"],
                    }
                )
            return {"list": items, "total": len(items)}
        finally:
            conn.close()

    def _ensure_database(self):
        if self.db_path.exists():
            return
        conn = sqlite3.connect(self.db_path)
        try:
            schema_sql = (self.sql_dir / "schema.sql").read_text(encoding="utf-8")
            seed_sql = (self.sql_dir / "seed.sql").read_text(encoding="utf-8")
            conn.executescript(schema_sql)
            conn.executescript(seed_sql)
            conn.commit()
        finally:
            conn.close()

    def _ensure_history_table(self):
        conn = sqlite3.connect(self.db_path)
        try:
            conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS guide_chat_log (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    visitor_id TEXT,
                    question TEXT NOT NULL,
                    answer TEXT NOT NULL,
                    sources TEXT,
                    hit_mode TEXT NOT NULL DEFAULT 'knowledge',
                    scenic_code TEXT,
                    client_type TEXT NOT NULL DEFAULT 'miniprogram',
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                );
                CREATE INDEX IF NOT EXISTS idx_guide_chat_log_created_at
                ON guide_chat_log (created_at DESC);
                """
            )
            conn.commit()
        finally:
            conn.close()

    def _search_structured_knowledge(self, question: str) -> List[Document]:
        scenic = self._infer_scenic(question)
        category = self._infer_category(question)
        if not category:
            return []

        if category == "activity":
            return self._build_activity_docs(scenic)

        docs = self._build_scenic_docs(category, scenic)
        if docs:
            return docs

        return self._build_knowledge_docs(category, scenic)

    def _build_activity_docs(self, scenic: Optional[str]) -> List[Document]:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        docs: List[Document] = []
        try:
            sql = (
                "SELECT s.scenic_code, s.name AS scenic_name, a.title, a.activity_date, "
                "a.start_time, a.end_time, a.location, a.summary, a.ticket_note, a.source_title "
                "FROM scenic_activity a "
                "INNER JOIN scenic_area s ON s.id = a.scenic_id "
                "WHERE a.status = 'published' "
            )
            params: List[str] = []
            if scenic:
                sql += "AND s.scenic_code = ? "
                params.append(scenic)
            sql += "ORDER BY a.activity_date ASC, a.start_time ASC LIMIT 5"
            rows = conn.execute(sql, params).fetchall()
            for row in rows:
                docs.append(
                    Document(
                        page_content=(
                            f"景区：{row['scenic_name']}\n"
                            f"活动标题：{row['title']}\n"
                            f"活动日期：{row['activity_date']}\n"
                            f"活动时间：{row['start_time']}-{row['end_time']}\n"
                            f"活动地点：{row['location']}\n"
                            f"活动简介：{row['summary']}\n"
                            f"参与说明：{row['ticket_note']}"
                        ),
                        metadata={
                            "source_title": row["source_title"],
                            "scenic_code": row["scenic_code"],
                            "scenic_name": row["scenic_name"],
                            "category": "活动安排",
                        },
                    )
                )
        finally:
            conn.close()
        return docs

    def _build_scenic_docs(self, category: str, scenic: Optional[str]) -> List[Document]:
        field_map = {
            "intro": ("intro", "景区介绍"),
            "hours": ("open_hours", "开放时间"),
            "ticket": ("ticket_policy", "门票政策"),
            "reservation": ("reservation_policy", "预约规则"),
            "traffic": ("transport_guide", "交通指南"),
            "parking": ("parking_guide", "停车说明"),
            "dining": ("dining_guide", "餐饮推荐"),
            "hotel": ("hotel_guide", "住宿推荐"),
        }
        field, label = field_map[category]
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        docs: List[Document] = []
        try:
            sql = (
                f"SELECT scenic_code, name, city, address, {field} AS content, source_title "
                "FROM scenic_area WHERE 1=1 "
            )
            params: List[str] = []
            if scenic:
                sql += "AND scenic_code = ? "
                params.append(scenic)
            sql += "ORDER BY id ASC LIMIT 3"
            rows = conn.execute(sql, params).fetchall()
            for row in rows:
                content = (row["content"] or "").strip()
                if not content:
                    continue
                docs.append(
                    Document(
                        page_content=(
                            f"景区：{row['name']}\n"
                            f"城市：{row['city']}\n"
                            f"地址：{row['address']}\n"
                            f"{label}：{content}"
                        ),
                        metadata={
                            "source_title": row["source_title"],
                            "scenic_code": row["scenic_code"],
                            "scenic_name": row["name"],
                            "category": label,
                        },
                    )
                )
        finally:
            conn.close()
        return docs

    def _build_knowledge_docs(self, category: str, scenic: Optional[str]) -> List[Document]:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        docs: List[Document] = []
        try:
            sql = (
                "SELECT s.scenic_code, s.name AS scenic_name, k.category, k.title, k.content, k.source_title "
                "FROM guide_knowledge k "
                "INNER JOIN scenic_area s ON s.id = k.scenic_id "
                "WHERE k.is_active = 1 "
            )
            params: List[str] = []
            if scenic:
                sql += "AND s.scenic_code = ? "
                params.append(scenic)
            sql += "ORDER BY k.sort_no ASC, k.id ASC"
            rows = conn.execute(sql, params).fetchall()
            for row in rows:
                if row["category"] != category:
                    continue
                docs.append(
                    Document(
                        page_content=(
                            f"景区：{row['scenic_name']}\n"
                            f"分类：{row['category']}\n"
                            f"标题：{row['title']}\n"
                            f"内容：{row['content']}"
                        ),
                        metadata={
                            "source_title": row["source_title"],
                            "scenic_code": row["scenic_code"],
                            "scenic_name": row["scenic_name"],
                            "category": row["category"],
                        },
                    )
                )
        finally:
            conn.close()
        return docs

    def _answer_from_docs(self, docs: List[Document]) -> Dict:
        category = docs[0].metadata.get("category", "")

        if category == "活动安排":
            blocks = []
            for doc in docs:
                payload = self._parse_lines(doc.page_content)
                blocks.append(
                    "\n".join(
                        [
                            payload.get("活动标题", "活动"),
                            f"时间：{payload.get('活动日期', '-')} {payload.get('活动时间', '-')}",
                            f"地点：{payload.get('活动地点', '-')}",
                            f"简介：{payload.get('活动简介', '-')}",
                            f"参与说明：{payload.get('参与说明', '-')}",
                        ]
                    )
                )
            return {
                "answer": "为你查到以下活动安排：\n\n" + "\n\n".join(blocks),
                "sources": self._doc_sources(docs),
            }

        blocks = []
        for doc in docs:
            payload = self._parse_lines(doc.page_content)
            scenic_name = payload.get("景区", doc.metadata.get("scenic_name", "景区"))
            address = payload.get("地址", "")
            value = ""
            for key in [
                "景区介绍",
                "开放时间",
                "门票政策",
                "预约规则",
                "交通指南",
                "停车说明",
                "餐饮推荐",
                "住宿推荐",
            ]:
                if key in payload:
                    value = payload[key]
                    break

            lines = [scenic_name]
            if address:
                lines.append(f"地址：{address}")
            if value:
                lines.append(f"{category}：{value}")
            blocks.append("\n".join(lines))

        return {
            "answer": "\n\n".join(blocks) if blocks else "暂未查询到相关信息",
            "sources": self._doc_sources(docs),
        }

    def _general_answer(self, question: str) -> Dict:
        fallback = self._rule_based_fallback(question)
        if fallback:
            return {"answer": fallback, "sources": ["AI生成回答"]}

        if not self.zhipu_api_key:
            return {
                "answer": "当前知识库没有直接命中这条问题，且未配置智谱 API Key。",
                "sources": ["AI生成回答"],
            }

        try:
            response = requests.post(
                self.zhipu_base_url,
                headers={
                    "Authorization": f"Bearer {self.zhipu_api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": self.zhipu_model,
                    "stream": False,
                    "temperature": 0.4,
                    "max_tokens": 1024,
                    "messages": [
                        {
                            "role": "system",
                            "content": (
                                "你是文旅小程序中的智能导览助手。"
                                "当前本地知识库没有命中，请基于常识给出简洁回答。"
                                "如果问题涉及具体票价、开放时间、活动安排等易变信息，"
                                "不要编造具体事实，要明确说明这是 AI 生成建议。"
                            ),
                        },
                        {
                            "role": "user",
                            "content": question,
                        },
                    ],
                },
                timeout=10,
            )
            response.raise_for_status()
            data = response.json()
            answer = (
                data.get("choices", [{}])[0]
                .get("message", {})
                .get("content", "")
                .strip()
            )
            if answer:
                return {"answer": answer, "sources": ["AI生成回答"]}
        except Exception as e:
            print(f"[SmartGuide] Zhipu API error: {e}")

        return {
            "answer": "当前知识库没有直接命中这条问题，AI 服务暂时不可用。",
            "sources": ["AI生成回答"],
        }

    def _rule_based_fallback(self, question: str) -> str:
        if "拍照" in question or "穿搭" in question:
            return (
                "当前知识库没有直接命中这条问题。以下内容为 AI 生成建议：\n"
                "如果是第一次去景区拍照，建议优先选择浅色、纯色或低饱和度穿搭，画面会更干净；"
                "鞋子尽量以舒适为主，方便长时间步行；如果计划夜游，可以带一件轻薄外套。"
            )
        if "攻略" in question or "怎么玩" in question:
            return (
                "当前知识库没有直接命中这条问题。以下内容为 AI 生成建议：\n"
                "建议先确认你想去的具体景区，再按“开放时间、交通、门票、活动、餐饮”这几个维度安排行程，"
                "通常半日游适合打卡主线，一日游适合叠加活动或夜游。"
            )
        return ""

    def _save_chat_log(
        self,
        visitor_id: str,
        question: str,
        answer: str,
        sources: List[str],
        hit_mode: str,
        scenic_code: str,
        client_type: str,
    ):
        conn = sqlite3.connect(self.db_path)
        try:
            conn.execute(
                "INSERT INTO guide_chat_log "
                "(visitor_id, question, answer, sources, hit_mode, scenic_code, client_type) "
                "VALUES (?, ?, ?, ?, ?, ?, ?)",
                (
                    visitor_id,
                    question,
                    answer,
                    json.dumps(sources or [], ensure_ascii=False),
                    hit_mode,
                    scenic_code,
                    client_type,
                ),
            )
            conn.commit()
        finally:
            conn.close()

    def _infer_scenic(self, question: str) -> Optional[str]:
        if "云溪" in question or "山谷" in question:
            return "YXSG"
        if "湖湾" in question or "古镇" in question:
            return "HWGZ"
        return None

    def _infer_category(self, question: str) -> Optional[str]:
        if "拍照" in question or "穿搭" in question:
            return None
        if "活动" in question or "演出" in question or "排期" in question or "周末" in question:
            return "activity"
        if "开放时间" in question or "营业时间" in question or ("几点" in question and ("开" in question or "营业" in question)):
            return "hours"
        if "门票" in question or "票价" in question or "多少钱" in question:
            return "ticket"
        if "预约" in question or "预定" in question:
            return "reservation"
        if "停车" in question or "停车场" in question:
            return "parking"
        if "交通" in question or "怎么去" in question or "到达" in question or "路线" in question:
            return "traffic"
        if "酒店" in question or "住宿" in question or "民宿" in question:
            return "hotel"
        if "餐饮" in question or "美食" in question or ("吃" in question and "小吃" in question) or "咖啡" in question:
            return "dining"
        if "介绍" in question or "简介" in question or "景区" in question or "导览" in question:
            return "intro"
        return None

    def _load_documents(self) -> List[Document]:
        docs: List[Document] = []
        docs.extend(self._build_scenic_docs("intro", None))
        docs.extend(self._build_scenic_docs("hours", None))
        docs.extend(self._build_scenic_docs("ticket", None))
        docs.extend(self._build_scenic_docs("reservation", None))
        docs.extend(self._build_scenic_docs("traffic", None))
        docs.extend(self._build_scenic_docs("parking", None))
        docs.extend(self._build_scenic_docs("dining", None))
        docs.extend(self._build_scenic_docs("hotel", None))
        docs.extend(self._build_activity_docs(None))
        return docs

    @staticmethod
    def _parse_lines(text: str) -> Dict[str, str]:
        payload: Dict[str, str] = {}
        for line in text.splitlines():
            if "：" not in line:
                continue
            key, value = line.split("：", 1)
            payload[key.strip()] = value.strip()
        return payload

    @staticmethod
    def _doc_sources(docs: List[Document]) -> List[str]:
        seen: List[str] = []
        for doc in docs:
            source = doc.metadata.get("source_title", "未命名来源")
            if source not in seen:
                seen.append(source)
        return seen
