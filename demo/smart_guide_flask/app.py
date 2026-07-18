from pathlib import Path

from flask import Flask, jsonify, request, send_from_directory

from rag_demo import SmartGuideDemo

BASE_DIR = Path(__file__).resolve().parent
app = Flask(__name__)
rag = SmartGuideDemo(BASE_DIR)


@app.route('/')
def demo_page():
    return send_from_directory(str(BASE_DIR / 'templates'), 'demo.html')


@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
    response.headers['Access-Control-Allow-Methods'] = 'GET,POST,OPTIONS'
    return response


@app.route('/api/guide/health', methods=['GET'])
def health():
    return jsonify({'code': 0, 'data': rag.health()})


@app.route('/api/guide/rebuild', methods=['POST'])
def rebuild():
    data = rag.rebuild_vector_store()
    return jsonify({'code': 0, 'data': data})


@app.route('/api/guide/ask', methods=['POST'])
def ask():
    payload = request.get_json(silent=True) or {}
    question = (payload.get('question') or '').strip()
    visitor_id = (payload.get('visitor_id') or '').strip()
    client_type = (payload.get('client_type') or 'miniprogram').strip()
    if not question:
        return jsonify({'code': 400, 'msg': 'question is required'}), 400

    try:
        result = rag.ask(question, visitor_id=visitor_id, client_type=client_type)
        return jsonify({'code': 0, 'data': result})
    except Exception as exc:
        return jsonify({'code': 500, 'msg': str(exc)}), 500


@app.route('/api/guide/history', methods=['GET'])
def history():
    limit = request.args.get('limit', 50)
    try:
        data = rag.list_chat_logs(limit=limit)
        return jsonify({'code': 0, 'data': data})
    except Exception as exc:
        return jsonify({'code': 500, 'msg': str(exc)}), 500


if __name__ == '__main__':
    print(f'Browser demo: http://127.0.0.1:5000/')
    print(f'API:         http://127.0.0.1:5000/api/guide/ask')
    print('LAN access:  http://<this-computer-LAN-IP>:5000/api/guide/ask')
    app.run(host='0.0.0.0', port=5000, debug=False)
