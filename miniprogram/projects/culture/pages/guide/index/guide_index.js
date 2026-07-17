const pageHelper = require('../../../../../helper/page_helper.js');
const ProjectBiz = require('../../../biz/project_biz.js');

const GUIDE_ENDPOINT = 'http://127.0.0.1:5000/api/guide/ask';

Page({
	data: {
		endpoint: GUIDE_ENDPOINT,
		question: '',
		loading: false,
		toView: '',
		quickQuestions: [
			'请介绍一下云溪山谷文旅度假区',
			'这周末有什么活动安排？',
			'景区开放时间是什么？',
			'门票和预约规则是怎样的？',
			'怎么停车比较方便？',
			'附近有什么酒店和餐饮推荐？'
		],
		messages: [
			{
				id: 'msg-0',
				role: 'assistant',
				content: '欢迎使用智能导览。你可以直接提问景区介绍、活动安排、开放时间、门票预约、交通停车、酒店餐饮等问题。',
				sources: ['本地 RAG Demo'],
				isError: false
			}
		]
	},

	onLoad() {
		ProjectBiz.initPage(this);
	},

	bindInput(e) {
		this.setData({ question: e.detail.value || '' });
	},

	async sendQuestion() {
		const question = (this.data.question || '').trim();
		if (!question) return pageHelper.showNoneToast('请输入问题');
		if (this.data.loading) return;

		const userMessage = this._buildMessage('user', question);
		const messages = this.data.messages.concat(userMessage);
		this.setData({ messages, question: '', loading: true }, () => this._scrollToBottom());

		try {
			const result = await this._requestGuide(question);
			const answer = result.answer || '暂未查询到相关信息';
			const sources = Array.isArray(result.sources) ? result.sources : [];
			this._appendAssistant(answer, sources, false);
		} catch (err) {
			console.log(err);
			this._appendAssistant('本地智能导览服务暂不可用，请先启动 Flask 服务后再试。', ['本地服务连接失败'], true);
		}
	},

	async useQuickQuestion(e) {
		const question = pageHelper.dataset(e, 'question');
		this.setData({ question }, async () => {
			await this.sendQuestion();
		});
	},

	_buildMessage(role, content, sources = [], isError = false) {
		const id = 'msg-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
		return { id, role, content, sources, isError };
	},

	_appendAssistant(content, sources, isError) {
		const messages = this.data.messages.concat(this._buildMessage('assistant', content, sources, isError));
		this.setData({ messages, loading: false }, () => this._scrollToBottom());
	},

	_scrollToBottom() {
		const list = this.data.messages || [];
		if (!list.length) return;
		this.setData({ toView: list[list.length - 1].id });
	},

	_requestGuide(question) {
		return new Promise((resolve, reject) => {
			wx.request({
				url: GUIDE_ENDPOINT,
				method: 'POST',
				timeout: 90000,
				header: { 'content-type': 'application/json' },
				data: { question },
				success: (res) => {
					if (res.statusCode !== 200 || !res.data || res.data.code !== 0) {
						reject(res.data || res);
						return;
					}
					resolve(res.data.data || {});
				},
				fail: reject
			});
		});
	},

	onShareAppMessage() {
		return {
			title: '智能导览',
			path: '/projects/culture/pages/guide/index/guide_index'
		};
	}
});
