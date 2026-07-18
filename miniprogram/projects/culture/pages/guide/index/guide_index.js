const pageHelper = require('../../../../../helper/page_helper.js');
const ProjectBiz = require('../../../biz/project_biz.js');

const GUIDE_ENDPOINT = 'http://127.0.0.1:5000/api/guide/ask';
const HEALTH_ENDPOINT = 'http://127.0.0.1:5000/api/guide/health';
const GUIDE_REQUEST_TIMEOUT = 30000;

function buildMessage(role, content, sources, isError) {
	return {
		id: 'msg-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
		role,
		roleLabel: role === 'assistant' ? '智能导览' : '你',
		content,
		sources: sources || [],
		isError: !!isError
	};
}

function buildVisitorId() {
	return 'visitor-' + Date.now() + '-' + Math.floor(Math.random() * 100000);
}

Page({
	data: {
		serviceStatus: '检测中',
		question: '',
		placeholder: '请输入问题，例如：景区几点开门？',
		loading: false,
		toView: '',
		visitorId: '',
		quickQuestions: [
			'请介绍一下云溪山谷文旅度假区',
			'这周末有什么活动安排？',
			'景区开放时间是什么？',
			'门票和预约规则是怎样的？',
			'怎么停车比较方便？'
		],
		messages: [
			{
				id: 'msg-0',
				role: 'assistant',
				roleLabel: '智能导览',
				content: '你好，我是智能导览助手，可以帮你快速查询景区介绍、活动安排、开放时间、门票预约、交通停车和酒店餐饮信息。',
				sources: [],
				isError: false
			}
		]
	},

	onLoad: function () {
		ProjectBiz.initPage(this);
		this._initVisitorId();
		this.checkServiceStatus();
	},

	_initVisitorId: function () {
		let visitorId = '';
		try {
			visitorId = wx.getStorageSync('GUIDE_VISITOR_ID') || '';
			if (!visitorId) {
				visitorId = buildVisitorId();
				wx.setStorageSync('GUIDE_VISITOR_ID', visitorId);
			}
		} catch (e) {
			visitorId = buildVisitorId();
		}
		this.setData({ visitorId });
	},

	checkServiceStatus: function () {
		const that = this;
		wx.request({
			url: HEALTH_ENDPOINT,
			method: 'GET',
			timeout: 8000,
			success(res) {
				if (res.statusCode === 200 && res.data && res.data.code === 0) {
					that.setData({ serviceStatus: '已连接' });
					return;
				}
				that.setData({ serviceStatus: '连接异常' });
			},
			fail() {
				that.setData({ serviceStatus: '未连接' });
			}
		});
	},

	bindInput: function (e) {
		this.setData({ question: e.detail.value || '' });
	},

	useQuickQuestion: function (e) {
		const question = pageHelper.dataset(e, 'question');
		this.setData({ question: question || '' });
	},

	sendQuestion: function () {
		const question = (this.data.question || '').trim();
		if (!question) return pageHelper.showNoneToast('请输入问题');
		if (this.data.loading) return;

		const messages = this.data.messages.concat(buildMessage('user', question, [], false));
		this.setData({ messages, question: '', loading: true });

		const that = this;
		wx.request({
			url: GUIDE_ENDPOINT,
			method: 'POST',
			timeout: GUIDE_REQUEST_TIMEOUT,
			header: { 'content-type': 'application/json' },
			data: {
				question,
				visitor_id: this.data.visitorId,
				client_type: 'miniprogram'
			},
			success(res) {
				if (res.statusCode === 200 && res.data && res.data.code === 0) {
					const payload = res.data.data || {};
					that._appendAssistant(
						payload.answer || '暂未查询到相关信息',
						Array.isArray(payload.sources) ? payload.sources : [],
						false
					);
					return;
				}
				that._appendAssistant('智能导览暂时不可用，请稍后重试。', ['本地服务连接失败'], true);
			},
			fail(err) {
				const errMsg = err && err.errMsg ? err.errMsg : '本地服务连接失败';
				that._appendAssistant('智能导览暂时不可用。\n\n失败原因：' + errMsg, ['本地服务连接失败'], true);
			},
			complete() {
				that.setData({ loading: false });
				that._scrollToBottom();
			}
		});
	},

	_appendAssistant: function (content, sources, isError) {
		const messages = this.data.messages.concat(buildMessage('assistant', content, sources, isError));
		this.setData({ messages });
	},

	_scrollToBottom: function () {
		const list = this.data.messages || [];
		if (!list.length) return;
		this.setData({ toView: list[list.length - 1].id });
	},

	onShareAppMessage: function () {
		return {
			title: '智能导览',
			path: '/projects/culture/pages/guide/index/guide_index'
		};
	}
});
