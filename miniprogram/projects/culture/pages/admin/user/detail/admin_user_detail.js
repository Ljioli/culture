const AdminBiz = require('../../../../../../comm/biz/admin_biz.js');
const pageHelper = require('../../../../../../helper/page_helper.js');
const cloudHelper = require('../../../../../../helper/cloud_helper.js');

const PAGE_SIZE = 8;
const TABS = [
	{ key: 'fav', title: '收藏记录', filterAll: '全部类型' },
	{ key: 'join', title: '活动报名', filterAll: '全部状态' },
	{ key: 'info', title: '发布游记', filterAll: '全部状态' },
	{ key: 'history', title: '浏览历史', filterAll: '全部类型' }
];

Page({
	data: {
		isLoad: false,
		activeTab: 'fav',
		keyword: '',
		filter: 'all',
		currentPage: 1,
		pageSize: PAGE_SIZE,
		tabs: TABS,
		filterOptions: ['全部类型'],
		currentRecords: [],
		currentTotal: 0,
		totalPage: 1,
		expandedInfoId: ''
	},

	async onLoad(options) {
		if (!AdminBiz.isAdmin(this)) return;
		if (!pageHelper.getOptions(this, options)) return;
		this._loadDetail();
	},

	async onPullDownRefresh() {
		await this._loadDetail();
		wx.stopPullDownRefresh();
	},

	_loadDetail: async function () {
		if (!AdminBiz.isAdmin(this)) return;

		const id = this.data.id;
		if (!id) return;

		const user = await cloudHelper.callCloudData('admin/user_detail', { id }, { hint: false });
		if (!user) {
			this.setData({ isLoad: null });
			return;
		}

		const viewUser = this._buildUserView(user);
		this.setData({
			isLoad: true,
			user: viewUser,
			activeTab: this.data.activeTab || 'fav',
			keyword: '',
			filter: 'all',
			currentPage: 1,
			expandedInfoId: ''
		}, () => this._refreshRecordView());
	},

	_buildUserView(user) {
		const userData = user.userData || {};
		const counts = userData.counts || {};
		const favList = (userData.favList || []).map((item) => ({
			...item,
			title: item.FAV_TITLE || '未命名内容',
			typeDesc: this._typeDesc(item.FAV_TYPE),
			thumb: this._typeThumb(item.FAV_TYPE),
			time: item.FAV_ADD_TIME || '-',
			path: item.FAV_PATH || ''
		}));

		const joinList = (userData.joinList || []).map((item) => ({
			...item,
			title: item.activity && item.activity.ACTIVITY_TITLE ? item.activity.ACTIVITY_TITLE : '活动已删除',
			activityTime: this._activityTime(item.activity),
			time: item.ACTIVITY_JOIN_ADD_TIME || '-',
			statusText: item.ACTIVITY_JOIN_STATUS == 1 ? '报名成功' : item.ACTIVITY_JOIN_STATUS == 0 ? '待审核' : '已取消',
			statusClass: item.ACTIVITY_JOIN_STATUS == 1 ? 'ok' : item.ACTIVITY_JOIN_STATUS == 0 ? 'wait' : 'disabled',
			path: item.ACTIVITY_JOIN_ACTIVITY_ID ? '../../../activity/detail/activity_detail?id=' + item.ACTIVITY_JOIN_ACTIVITY_ID : ''
		}));

		const infoList = (userData.infoList || []).map((item) => {
			const obj = item.INFO_OBJ || {};
			const desc = Array.isArray(obj.desc) ? obj.desc : [];
			const text = desc.filter(node => node.type === 'text').map(node => node.val).join(' ');
			const imageCount = desc.filter(node => node.type === 'img').length + (Array.isArray(obj.cover) ? obj.cover.length : 0);
			return {
				...item,
				title: obj.title || '未填写标题',
				time: item.INFO_ADD_TIME || '-',
				cover: obj.cover && obj.cover[0] ? obj.cover[0] : '/projects/culture/images/none.png',
				summary: text || '暂无内容摘要',
				imageCount,
				viewCount: item.INFO_VIEW_CNT || 0,
				statusText: item.INFO_STATUS == 1 ? '正常' : item.INFO_STATUS == 2 ? '推荐' : '禁用',
				statusClass: item.INFO_STATUS == 0 ? 'disabled' : 'ok',
				path: '../../../info/detail/info_detail?id=' + item._id
			};
		});

		const historyList = (userData.historyList || []).map((item) => ({
			...item,
			title: item.HISTORY_TITLE || '未命名内容',
			typeDesc: item.HISTORY_TYPE_DESC || this._typeDesc(item.HISTORY_TYPE),
			time: item.HISTORY_ADD_TIME || '-',
			path: item.HISTORY_PATH || ''
		}));

		return {
			...user,
			statusText: user.USER_STATUS == 1 ? '正常' : '禁用',
			statusClass: user.USER_STATUS == 1 ? 'ok' : 'disabled',
			sexText: (user.USER_OBJ && user.USER_OBJ.sex) || this._findFormVal(user.USER_FORMS, 'sex') || '未填写',
			mobileText: user.USER_MOBILE || '未填写',
			miniOpenId: user.USER_MINI_OPENID || user.USER_ID || '-',
			userData: {
				counts: {
					fav: counts.fav || favList.length,
					join: counts.join || joinList.length,
					info: counts.info || infoList.length,
					history: counts.history || historyList.length
				},
				favList,
				joinList,
				infoList,
				historyList
			}
		};
	},

	_refreshRecordView() {
		if (!this.data.user) return;
		const activeTab = this.data.activeTab;
		const keyword = (this.data.keyword || '').trim().toLowerCase();
		const filter = this.data.filter || 'all';
		let list = this._getTabList(activeTab);

		if (keyword) {
			list = list.filter(item => JSON.stringify(item).toLowerCase().includes(keyword));
		}
		if (filter !== 'all') {
			list = list.filter(item => this._matchFilter(activeTab, item, filter));
		}

		const total = list.length;
		const totalPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
		const currentPage = Math.min(this.data.currentPage || 1, totalPage);
		const start = (currentPage - 1) * PAGE_SIZE;
		const currentRecords = list.slice(start, start + PAGE_SIZE);

		this.setData({
			currentRecords,
			currentTotal: total,
			currentPage,
			totalPage,
			filterOptions: this._getFilterOptions(activeTab)
		});
	},

	_getTabList(tab) {
		const data = this.data.user.userData || {};
		if (tab === 'join') return data.joinList || [];
		if (tab === 'info') return data.infoList || [];
		if (tab === 'history') return data.historyList || [];
		return data.favList || [];
	},

	_getFilterOptions(tab) {
		const all = TABS.find(item => item.key === tab).filterAll;
		if (tab === 'join') return [all, '报名成功', '待审核', '已取消'];
		if (tab === 'info') return [all, '正常', '推荐', '禁用'];
		const values = this._getTabList(tab).map(item => item.typeDesc).filter(Boolean);
		return [all].concat(Array.from(new Set(values)));
	},

	_matchFilter(tab, item, filter) {
		if (tab === 'join') return item.statusText === filter;
		if (tab === 'info') return item.statusText === filter;
		return item.typeDesc === filter;
	},

	bindTabTap(e) {
		this.setData({
			activeTab: e.currentTarget.dataset.tab,
			filter: 'all',
			currentPage: 1,
			expandedInfoId: ''
		}, () => this._refreshRecordView());
	},

	bindKeywordInput(e) {
		this.setData({ keyword: e.detail.value || '', currentPage: 1 }, () => this._refreshRecordView());
	},

	bindFilterChange(e) {
		const index = Number(e.detail.value || 0);
		const options = this.data.filterOptions || [];
		this.setData({ filter: index === 0 ? 'all' : options[index], currentPage: 1 }, () => this._refreshRecordView());
	},

	bindPrevPageTap() {
		if (this.data.currentPage <= 1) return;
		this.setData({ currentPage: this.data.currentPage - 1 }, () => this._refreshRecordView());
	},

	bindNextPageTap() {
		if (this.data.currentPage >= this.data.totalPage) return;
		this.setData({ currentPage: this.data.currentPage + 1 }, () => this._refreshRecordView());
	},

	bindInfoExpandTap(e) {
		const id = e.currentTarget.dataset.id;
		this.setData({ expandedInfoId: this.data.expandedInfoId === id ? '' : id });
	},

	bindRecordDetailTap(e) {
		const url = e.currentTarget.dataset.url;
		if (!url) return pageHelper.showNoneToast('暂无详情链接');
		pageHelper.url(e, this);
	},

	bindHistoryDelTap(e) {
		const historyId = e.currentTarget.dataset.id;
		if (!historyId) return;
		pageHelper.showConfirm('确认删除这条浏览历史？', async () => {
			await cloudHelper.callCloudSumbit('admin/user_history_del', {
				userId: this.data.id,
				historyId
			});
			this._removeHistoryLocal(historyId);
			pageHelper.showSuccToast('删除成功');
		});
	},

	bindHistoryClearTap() {
		if (!this.data.user || !this.data.user.userData.counts.history) return pageHelper.showNoneToast('暂无浏览历史');
		pageHelper.showConfirm('确认清空该用户全部浏览历史？', async () => {
			await cloudHelper.callCloudSumbit('admin/user_history_clear', {
				userId: this.data.id
			});
			const user = this.data.user;
			user.userData.historyList = [];
			user.userData.counts.history = 0;
			this.setData({ user, currentPage: 1 }, () => this._refreshRecordView());
			pageHelper.showSuccToast('已清空');
		});
	},

	_removeHistoryLocal(historyId) {
		const user = this.data.user;
		user.userData.historyList = (user.userData.historyList || []).filter(item => item._id !== historyId);
		user.userData.counts.history = user.userData.historyList.length;
		this.setData({ user }, () => this._refreshRecordView());
	},

	_findFormVal(forms, mark) {
		if (!Array.isArray(forms)) return '';
		const form = forms.find(item => item.mark === mark || item.title === '性别');
		return form ? form.val : '';
	},

	_typeDesc(type) {
		const map = { product: '旅行攻略', activity: '活动', info: '游记', news: '公告/服务' };
		return map[type] || type || '其他';
	},

	_typeThumb(type) {
		const map = {
			product: '/projects/culture/images/menu/p3.png',
			activity: '/projects/culture/images/menu/p5.png',
			info: '/projects/culture/images/menu/p4.png',
			news: '/projects/culture/images/menu/p1.png'
		};
		return map[type] || '/projects/culture/images/none.png';
	},

	_activityTime(activity) {
		if (!activity) return '-';
		if (activity.ACTIVITY_START) return this._fmtTime(activity.ACTIVITY_START);
		return '-';
	},

	_fmtTime(timestamp) {
		const date = new Date(Number(timestamp));
		if (isNaN(date.getTime())) return timestamp;
		const pad = n => String(n).padStart(2, '0');
		return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
	},

	url(e) {
		pageHelper.url(e, this);
	}
});
