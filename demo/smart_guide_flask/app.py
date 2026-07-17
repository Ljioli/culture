from pathlib import Path

from flask import Flask, jsonify, request

from rag_demo import SmartGuideDemo

BASE_DIR = Path(__file__).resolve().parent
app = Flask(__name__)
rag = SmartGuideDemo(BASE_DIR)


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
    if not question:
        return jsonify({'code': 400, 'msg': 'question is required'}), 400

    try:
        result = rag.ask(question)
        return jsonify({'code': 0, 'data': result})
    except Exception as exc:
        return jsonify({'code': 500, 'msg': str(exc)}), 500


if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000, debug=False)
