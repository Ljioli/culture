# 智能导览本地 Demo

这是一个基于 Flask + LangChain + Ollama + Chroma + SQLite 的本地文旅问答演示服务。

## 技术栈
- Flask
- SQLite，数据库名：db_enterprise_ga
- Chroma 向量数据库
- Ollama LLM：qwen3:8b
- Ollama Embedding：qwen3-embedding:4b

## 目录说明
- `app.py`：Flask 入口
- `rag_demo.py`：RAG 逻辑
- `sql/schema.sql`：建表 SQL
- `sql/seed.sql`：测试数据 SQL
- `runtime/db_enterprise_ga.sqlite3`：运行后自动生成的 SQLite 数据库
- `runtime/chroma_db`：运行后自动生成的向量索引目录

## 本地运行步骤
1. 创建 Python 虚拟环境。
2. 安装 `requirements.txt` 里的依赖。
3. 确认 Ollama 已启动。
4. 确认本机已拉取以下模型：
   - `qwen3:8b`
   - `qwen3-embedding:4b`
5. 在当前目录执行：
   - `python app.py`
6. 服务默认启动在：
   - `http://127.0.0.1:5000`

## 接口
- `GET /api/guide/health`
- `POST /api/guide/ask`
- `POST /api/guide/rebuild`

## 小程序联调说明
这版是本地 demo，小程序页面直接请求 `http://127.0.0.1:5000/api/guide/ask`。
你需要在微信开发者工具中关闭“校验合法域名、web-view（业务域名）、TLS 版本以及 HTTPS 证书”，否则本地 HTTP 请求会被拦截。

## 说明
- 当前知识库为模拟景区数据，仅用于演示。
- 如果修改了 SQL 测试数据，可调用 `POST /api/guide/rebuild` 重建向量索引。
- 如果问题超出知识库范围，系统会返回：`暂未查询到相关信息`。
