# 智能导览本地 Demo

这是一个基于 Flask + LangChain + Ollama + Chroma + SQLite 的本地文旅问答演示服务。

## 技术栈
- Flask
- SQLite，数据库名：db_enterprise_ga
- Chroma 向量数据库
- 智谱清言 API：glm-4-flash（知识库未命中时兜底回答）
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
   - `qwen3-embedding:4b`
5. 复制 `.env.example` 为 `.env`，填写 `ZHIPU_API_KEY`。
6. 在当前目录执行：
   - `python app.py`
7. 服务默认启动在：
   - `http://127.0.0.1:5000`
   - Flask 同时监听局域网地址，真机联调时使用运行 Flask 电脑的局域网 IPv4 地址。

## 接口
- `GET /api/guide/health`
- `POST /api/guide/ask`
- `POST /api/guide/rebuild`
- `GET /api/guide/history`

## 小程序联调说明
这版是本地 demo，微信开发者工具可请求 `http://127.0.0.1:5000/api/guide/ask`。
真机中的 `127.0.0.1` 指向手机本身，真机联调时请把小程序页面顶部的接口地址改为 `http://<运行 Flask 电脑的局域网 IPv4>:5000`，并确保手机和电脑位于同一局域网。
你需要在微信开发者工具中关闭“校验合法域名、web-view（业务域名）、TLS 版本以及 HTTPS 证书”，否则本地 HTTP 请求会被拦截。
Ollama 首次加载模型可能耗时较长，小程序问答请求的超时应不低于服务端模型调用超时（当前为 180 秒）。

## 说明
- 当前知识库为模拟景区数据，仅用于演示。
- 如果修改了 SQL 测试数据，可调用 `POST /api/guide/rebuild` 重建向量索引。
- 如果问题命中知识库，会基于知识库回答；知识库未命中时，会调用智谱 API 做补充回答。
