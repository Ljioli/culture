import shutil
import sqlite3
from pathlib import Path
from typing import Dict, List

import requests
from langchain_chroma import Chroma
from langchain_core.documents import Document
from langchain_ollama import ChatOllama, OllamaEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter


class SmartGuideDemo:
    def __init__(self, base_dir: Path):
        self.base_dir = Path(base_dir)
        self.runtime_dir = self.base_dir / 'runtime'
        self.runtime_dir.mkdir(parents=True, exist_ok=True)
        self.sql_dir = self.base_dir / 'sql'
        self.db_path = self.runtime_dir / 'db_enterprise_ga.sqlite3'
        self.chroma_dir = self.runtime_dir / 'chroma_db'
        self.collection_name = 'smart_guide_demo'
        self.ollama_base_url = 'http://127.0.0.1:11434'
        self.chat_model = 'qwen3:8b'
        self.embedding_model = 'qwen3-embedding:4b'
        self.vector_store = None
        self._vector_ready = False
        self._ensure_database()

    def health(self) -> Dict:
        return {
            'db_name': 'db_enterprise_ga',
            'sqlite_path': str(self.db_path),
            'chroma_path': str(self.chroma_dir),
            'chat_model': self.chat_model,
            'embedding_model': self.embedding_model,
            'document_count': len(self._load_documents()),
            'vector_ready': self._vector_ready,
            'models_ready': self._models_ready(),
        }

    def ask(self, question: str) -> Dict:
        question = question.strip()
        if not question:
            return {'answer': '\u6682\u672a\u67e5\u8be2\u5230\u76f8\u5173\u4fe1\u606f', 'sources': []}

        if not self._models_ready():
            return {
                'answer': '\u672c\u5730\u667a\u80fd\u5bfc\u89c8\u6a21\u578b\u4ecd\u5728\u51c6\u5907\u4e2d\uff0c\u8bf7\u7a0d\u540e\u518d\u8bd5\u3002',
                'sources': ['Ollama \u6a21\u578b\u51c6\u5907\u4e2d'],
            }

        docs = self._search_knowledge(question)
        if not docs:
            return self._general_answer(question)

        context = self._build_context(docs)
        sources = self._unique([doc.metadata.get('source_title', '\u672a\u547d\u540d\u6765\u6e90') for doc in docs])
        prompt = (
            '\u4f60\u662f\u6587\u65c5\u5c0f\u7a0b\u5e8f\u4e2d\u7684\u201c\u667a\u80fd\u5bfc\u89c8\u201d\u52a9\u624b\u3002\n\n'
            '\u56de\u7b54\u89c4\u5219\uff1a\n'
            '1. \u4f18\u5148\u6839\u636e\u7ed9\u5b9a\u8d44\u6599\u56de\u7b54\u3002\n'
            '2. \u56de\u7b54\u8981\u81ea\u7136\u3001\u7b80\u6d01\u3001\u9002\u5408\u6e38\u5ba2\u9605\u8bfb\u3002\n'
            '3. \u5982\u679c\u8d44\u6599\u91cc\u6709\u660e\u786e\u65f6\u95f4\u3001\u4ef7\u683c\u3001\u5730\u5740\u3001\u6d3b\u52a8\u5b89\u6392\uff0c\u8bf7\u51c6\u786e\u5f15\u7528\uff0c\u4e0d\u8981\u6539\u5199\u6210\u522b\u7684\u6570\u636e\u3002\n'
            '4. \u4e0d\u8981\u8f93\u51fa\u53c2\u8003\u6765\u6e90\u6807\u9898\uff0c\u6765\u6e90\u7531\u7cfb\u7edf\u5355\u72ec\u5c55\u793a\u3002\n\n'
            '\u5df2\u77e5\u8d44\u6599\uff1a\n' + context + '\n\n'
            '\u6e38\u5ba2\u95ee\u9898\uff1a\n' + question
        )

        llm = ChatOllama(
            model=self.chat_model,
            base_url=self.ollama_base_url,
            temperature=0.2,
        )
        response = llm.invoke(prompt)
        answer = getattr(response, 'content', str(response)).strip() or '\u6682\u672a\u67e5\u8be2\u5230\u76f8\u5173\u4fe1\u606f'
        return {'answer': answer, 'sources': sources}

    def rebuild_vector_store(self) -> Dict:
        self._ensure_database()
        if not self._models_ready():
            return {
                'db_name': 'db_enterprise_ga',
                'sqlite_path': str(self.db_path),
                'chroma_path': str(self.chroma_dir),
                'status': 'models_not_ready',
            }
        self._ensure_vector_store(force=True)
        return {
            'db_name': 'db_enterprise_ga',
            'sqlite_path': str(self.db_path),
            'chroma_path': str(self.chroma_dir),
            'status': 'rebuilt',
        }

    def _ensure_database(self):
        if self.db_path.exists():
            return

        conn = sqlite3.connect(self.db_path)
        try:
            schema_sql = (self.sql_dir / 'schema.sql').read_text(encoding='utf-8')
            seed_sql = (self.sql_dir / 'seed.sql').read_text(encoding='utf-8')
            conn.executescript(schema_sql)
            conn.executescript(seed_sql)
            conn.commit()
        finally:
            conn.close()

    def _search_knowledge(self, question: str) -> List[Document]:
        self._ensure_vector_store()
        matches = self.vector_store.similarity_search_with_score(question, k=4)
        return [doc for doc, score in matches if score <= 1.8]

    def _ensure_vector_store(self, force: bool = False):
        if not self._models_ready():
            raise RuntimeError('Ollama models are not ready yet')

        if force and self.chroma_dir.exists():
            shutil.rmtree(self.chroma_dir, ignore_errors=True)

        embeddings = OllamaEmbeddings(
            model=self.embedding_model,
            base_url=self.ollama_base_url,
        )

        if force or not self.chroma_dir.exists() or not any(self.chroma_dir.iterdir()):
            documents = self._split_documents(self._load_documents())
            self.vector_store = Chroma.from_documents(
                documents=documents,
                embedding=embeddings,
                collection_name=self.collection_name,
                persist_directory=str(self.chroma_dir),
            )
        elif self.vector_store is None:
            self.vector_store = Chroma(
                collection_name=self.collection_name,
                embedding_function=embeddings,
                persist_directory=str(self.chroma_dir),
            )

        self._vector_ready = True

    def _load_documents(self) -> List[Document]:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        docs: List[Document] = []
        try:
            scenic_rows = conn.execute(
                """
                SELECT scenic_code, name, city, address, intro, open_hours, ticket_policy,
                       reservation_policy, transport_guide, parking_guide, dining_guide,
                       hotel_guide, contact_phone, source_title
                FROM scenic_area
                ORDER BY id ASC
                """
            ).fetchall()
            for row in scenic_rows:
                field_map = {
                    '\u666f\u533a\u4ecb\u7ecd': row['intro'],
                    '\u5f00\u653e\u65f6\u95f4': row['open_hours'],
                    '\u95e8\u7968\u653f\u7b56': row['ticket_policy'],
                    '\u9884\u7ea6\u89c4\u5219': row['reservation_policy'],
                    '\u4ea4\u901a\u6307\u5357': row['transport_guide'],
                    '\u505c\u8f66\u8bf4\u660e': row['parking_guide'],
                    '\u9910\u996e\u63a8\u8350': row['dining_guide'],
                    '\u4f4f\u5bbf\u63a8\u8350': row['hotel_guide'],
                }
                for title, content in field_map.items():
                    docs.append(
                        Document(
                            page_content=(
                                f'\u666f\u533a\uff1a{row['name']}\n'
                                f'\u57ce\u5e02\uff1a{row['city']}\n'
                                f'\u5730\u5740\uff1a{row['address']}\n'
                                f'\u4e3b\u9898\uff1a{title}\n'
                                f'\u5185\u5bb9\uff1a{content}\n'
                                f'\u8054\u7cfb\u7535\u8bdd\uff1a{row['contact_phone']}'
                            ),
                            metadata={
                                'source_title': row['source_title'],
                                'scenic_code': row['scenic_code'],
                                'scenic_name': row['name'],
                                'category': title,
                            },
                        )
                    )

            knowledge_rows = conn.execute(
                """
                SELECT s.scenic_code, s.name AS scenic_name, k.category, k.title, k.content, k.source_title
                FROM guide_knowledge k
                INNER JOIN scenic_area s ON s.id = k.scenic_id
                WHERE k.is_active = 1
                ORDER BY k.sort_no ASC, k.id ASC
                """
            ).fetchall()
            for row in knowledge_rows:
                docs.append(
                    Document(
                        page_content=(
                            f'\u666f\u533a\uff1a{row['scenic_name']}\n'
                            f'\u5206\u7c7b\uff1a{row['category']}\n'
                            f'\u6807\u9898\uff1a{row['title']}\n'
                            f'\u5185\u5bb9\uff1a{row['content']}'
                        ),
                        metadata={
                            'source_title': row['source_title'],
                            'scenic_code': row['scenic_code'],
                            'scenic_name': row['scenic_name'],
                            'category': row['category'],
                        },
                    )
                )

            activity_rows = conn.execute(
                """
                SELECT s.scenic_code, s.name AS scenic_name, a.title, a.activity_date, a.start_time,
                       a.end_time, a.location, a.summary, a.ticket_note, a.source_title
                FROM scenic_activity a
                INNER JOIN scenic_area s ON s.id = a.scenic_id
                WHERE a.status = 'published'
                ORDER BY a.activity_date ASC, a.start_time ASC
                """
            ).fetchall()
            for row in activity_rows:
                docs.append(
                    Document(
                        page_content=(
                            f'\u666f\u533a\uff1a{row['scenic_name']}\n'
                            f'\u6d3b\u52a8\u6807\u9898\uff1a{row['title']}\n'
                            f'\u6d3b\u52a8\u65e5\u671f\uff1a{row['activity_date']}\n'
                            f'\u6d3b\u52a8\u65f6\u95f4\uff1a{row['start_time']}-{row['end_time']}\n'
                            f'\u6d3b\u52a8\u5730\u70b9\uff1a{row['location']}\n'
                            f'\u6d3b\u52a8\u7b80\u4ecb\uff1a{row['summary']}\n'
                            f'\u7968\u52a1\u8bf4\u660e\uff1a{row['ticket_note']}'
                        ),
                        metadata={
                            'source_title': row['source_title'],
                            'scenic_code': row['scenic_code'],
                            'scenic_name': row['scenic_name'],
                            'category': '\u6d3b\u52a8\u5b89\u6392',
                        },
                    )
                )
        finally:
            conn.close()
        return docs

    def _split_documents(self, docs: List[Document]) -> List[Document]:
        splitter = RecursiveCharacterTextSplitter(chunk_size=380, chunk_overlap=60)
        return splitter.split_documents(docs)

    def _build_context(self, docs: List[Document]) -> str:
        blocks = []
        for index, doc in enumerate(docs, start=1):
            source_title = doc.metadata.get('source_title', '\u672a\u547d\u540d\u6765\u6e90')
            category = doc.metadata.get('category', '\u672a\u5206\u7c7b')
            scenic_name = doc.metadata.get('scenic_name', '\u672a\u77e5\u666f\u533a')
            blocks.append(
                f'\u8d44\u6599{index}\n\u666f\u533a\uff1a{scenic_name}\n\u5206\u7c7b\uff1a{category}\n\u6765\u6e90\uff1a{source_title}\n\u5185\u5bb9\uff1a{doc.page_content}'
            )
        return '\n\n'.join(blocks)

    def _general_answer(self, question: str) -> Dict:
        llm = ChatOllama(
            model=self.chat_model,
            base_url=self.ollama_base_url,
            temperature=0.5,
        )
        prompt = (
            '\u4f60\u662f\u6587\u65c5\u5c0f\u7a0b\u5e8f\u4e2d\u7684\u201c\u667a\u80fd\u5bfc\u89c8\u201d\u52a9\u624b\u3002\n\n'
            '\u5f53\u524d\u77e5\u8bc6\u5e93\u6ca1\u6709\u68c0\u7d22\u5230\u8db3\u591f\u8d44\u6599\uff0c\u8bf7\u76f4\u63a5\u57fa\u4e8e\u4f60\u7684\u901a\u7528\u80fd\u529b\u56de\u7b54\u7528\u6237\u95ee\u9898\u3002\n'
            '\u8981\u6c42\uff1a\n'
            '1. \u660e\u786e\u544a\u8bc9\u7528\u6237\u8fd9\u4e0d\u662f\u6765\u81ea\u666f\u533a\u77e5\u8bc6\u5e93\u7684\u7ed3\u679c\uff0c\u800c\u662f AI \u751f\u6210\u5efa\u8bae\u3002\n'
            '2. \u56de\u7b54\u5c3d\u91cf\u7b80\u6d01\u81ea\u7136\u3002\n'
            '3. \u5bf9\u65f6\u95f4\u3001\u4ef7\u683c\u3001\u6d3b\u52a8\u5b89\u6392\u7b49\u5bb9\u6613\u53d8\u5316\u7684\u4fe1\u606f\uff0c\u4e0d\u8981\u7f16\u9020\u5177\u4f53\u4e8b\u5b9e\uff1b\u5982\u679c\u65e0\u6cd5\u786e\u5b9a\uff0c\u5c31\u7ed9\u51fa\u4e00\u822c\u6027\u5efa\u8bae\u3002\n'
            '4. \u5982\u679c\u7528\u6237\u95ee\u9898\u4e0e\u6587\u65c5\u5bfc\u89c8\u5b8c\u5168\u65e0\u5173\uff0c\u4e5f\u53ef\u4ee5\u793c\u8c8c\u56de\u7b54\u3002\n\n'
            '\u7528\u6237\u95ee\u9898\uff1a\n' + question
        )
        response = llm.invoke(prompt)
        answer = getattr(response, 'content', str(response)).strip() or '\u6682\u672a\u67e5\u8be2\u5230\u76f8\u5173\u4fe1\u606f'
        return {'answer': answer, 'sources': ['AI\u751f\u6210\u56de\u7b54']}

    def _models_ready(self) -> bool:
        try:
            response = requests.get(f'{self.ollama_base_url}/api/tags', timeout=5)
            response.raise_for_status()
            models = response.json().get('models', [])
            names = {model.get('name') for model in models}
            return self.chat_model in names and self.embedding_model in names
        except Exception:
            return False

    @staticmethod
    def _unique(items: List[str]) -> List[str]:
        seen = []
        for item in items:
            if item not in seen:
                seen.append(item)
        return seen
