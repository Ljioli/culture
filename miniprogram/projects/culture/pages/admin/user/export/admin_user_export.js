const AdminBiz = require('../../../../../../comm/biz/admin_biz.js');
const pageHelper = require('../../../../../../helper/page_helper.js');
const cloudHelper = require('../../../../../../helper/cloud_helper.js');
const fileHelper = require('../../../../../../helper/file_helper.js');
const projectSetting = require('../../../../public/project_setting.js');

Page({
	data: {
		url: '',
		time: '',
		condition: '',
		isLoad: false,
	},

	onLoad: function (options) {
		if (!AdminBiz.isAdmin(this)) return;

		if (options && options.condition) {
			this.setData({
				condition: options.condition
			});
		}

		this._loadDetail(1);
	},

	_loadDetail: async function (isDel) {
		if (!AdminBiz.isAdmin(this)) return;

		let params = {
			isDel
		};
		let options = {
			title: 'bar'
		};
		let data = await cloudHelper.callCloudData('admin/user_data_get', params, options);
		if (!data) return;

		this.setData({
			isLoad: true,
			url: data.url || '',
			time: data.time || ''
		});
	},

	onReady: function () { },
	onShow: function () { },
	onHide: function () { },
	onUnload: function () { },

	onPullDownRefresh: async function () {
		await this._loadDetail(1);
		wx.stopPullDownRefresh();
	},

	bindOpenTap: function () {
		fileHelper.openDoc('用户数据', this.data.url);
	},

	bindCopyTap: function () {
		if (!this.data.url) {
			return pageHelper.showNoneToast('暂无可复制的链接');
		}

		wx.setClipboardData({
			data: this.data.url,
			success() {
				pageHelper.showNoneToast('已复制到剪贴板');
			}
		});
	},

	url: async function (e) {
		pageHelper.url(e, this);
	},

	onReachBottom: function () { },

	bindExportTap: async function () {
		try {
			let options = {
				title: '数据生成中'
			};

			let params = {
				condition: this.data.condition,
				fields: projectSetting.USER_FIELDS
			};

			await cloudHelper.callCloudData('admin/user_data_export', params, options).then(async (res) => {
				if (!res) {
					pageHelper.showNoneToast('数据生成失败，请稍后重试');
					return;
				}

				await this._loadDetail(0);
				pageHelper.showModal('数据文件生成成功(' + res.total + '条记录), 请点击“直接打开”按钮或者复制文件地址下载');
			});
		} catch (err) {
			console.log(err);
			pageHelper.showNoneToast('导出失败，请重试');
		}
	},

	bindDelTap: async function () {
		try {
			let options = {
				title: '数据删除中'
			};
			await cloudHelper.callCloudData('admin/user_data_del', {}, options).then(() => {
				this.setData({
					url: '',
					time: ''
				});
				pageHelper.showSuccToast('删除成功');
			});
		} catch (err) {
			console.log(err);
			pageHelper.showNoneToast('删除失败，请重试');
		}
	},
});
