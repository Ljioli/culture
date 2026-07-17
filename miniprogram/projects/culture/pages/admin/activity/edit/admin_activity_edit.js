const AdminBiz = require('../../../../../../comm/biz/admin_biz.js');
const pageHelper = require('../../../../../../helper/page_helper.js');
const cloudHelper = require('../../../../../../helper/cloud_helper.js');
const validate = require('../../../../../../helper/validate.js');
const timeHelper = require('../../../../../../helper/time_helper.js');
const ActivityBiz = require('../../../../biz/activity_biz.js');
const AdminActivityBiz = require('../../../../biz/admin_activity_biz.js');
const formSetHelper = require('../../../../../../cmpts/public/form/form_set_helper.js');
const projectSetting = require('../../../../public/project_setting.js');

Page({

	/**
	 * 页面的初始数据
	 */
	data: {
		isLoad: false,
	},

	/**
	 * 生命周期函数--监听页面加载
	 */
	onLoad: async function (options) {
		if (!AdminBiz.isAdmin(this)) return;
		if (!pageHelper.getOptions(this, options)) return;

		wx.setNavigationBarTitle({
			title: projectSetting.ACTIVITY_NAME + '-修改',
		});

		this._loadDetail();
	},

	/**
	 * 生命周期函数--监听页面初次渲染完成
	 */
	onReady: function () { },

	/**
	 * 生命周期函数--监听页面显示
	 */
	onShow: function () { },

	/**
	 * 生命周期函数--监听页面隐藏
	 */
	onHide: function () { },

	/**
	 * 生命周期函数--监听页面卸载
	 */
	onUnload: function () { },

	/**
	 * 页面相关事件处理函数--监听用户下拉动作
	 */
	onPullDownRefresh: async function () {
		await this._loadDetail();
		this.selectComponent("#cmpt-form").reload();
		wx.stopPullDownRefresh();
	},

	model: function (e) {
		pageHelper.model(this, e);
	},

	_loadDetail: async function () {
		if (!AdminBiz.isAdmin(this)) return;

		let id = this.data.id;
		if (!id) return;

		if (!this.data.isLoad) this.setData(AdminActivityBiz.initFormData(id)); // 初始化表单数据

		let params = {
			id
		};
		let opt = {
			title: 'bar'
		};
		let activity = await cloudHelper.callCloudData('admin/activity_detail', params, opt);
		if (!activity) {
			this.setData({
				isLoad: null
			})
			return;
		};

		if (!Array.isArray(activity.ACTIVITY_JOIN_FORMS) || activity.ACTIVITY_JOIN_FORMS.length == 0)
		activity.ACTIVITY_JOIN_FORMS = projectSetting.ACTIVITY_JOIN_FIELDS;


		this.setData({
			isLoad: true,

			formTitle: activity.ACTIVITY_TITLE,
			formCateId: activity.ACTIVITY_CATE_ID,
			formOrder: activity.ACTIVITY_ORDER,

			formMaxCnt: activity.ACTIVITY_MAX_CNT,
			formStart: this._fmtTime(activity.ACTIVITY_START),
			formEnd: this._fmtTime(activity.ACTIVITY_END),
			formStop: this._fmtTime(activity.ACTIVITY_STOP),

			formAddress: activity.ACTIVITY_ADDRESS,
			formAddressGeo: activity.ACTIVITY_ADDRESS_GEO,

			formCheckSet: activity.ACTIVITY_CHECK_SET,
			formCancelSet: activity.ACTIVITY_CANCEL_SET,
			formIsMenu: activity.ACTIVITY_IS_MENU,

			formForms: activity.ACTIVITY_FORMS,
			formJoinForms: formSetHelper.initFields(activity.ACTIVITY_JOIN_FORMS),

		});

	},

	bindFormSubmit: async function () {
		if (!AdminBiz.isAdmin(this)) return;

		// 数据校验
		let timeFields = this._syncTimeFields();
		let data = Object.assign({}, this.data, timeFields);
		data = validate.check(data, AdminActivityBiz.CHECK_FORM, this);
		if (!data) return;

		if (data.end < data.start) {
			return pageHelper.showModal('结束时间不能早于开始时间');
		}

		let forms = this.selectComponent("#cmpt-form").getForms(true);
		if (!forms) return;
		data.forms = forms;
		data.formForms = forms;
		data.formTitle = data.title;
		data.formCateId = data.cateId;
		data.formOrder = data.order;
		data.formMaxCnt = data.maxCnt;
		data.formStart = data.start;
		data.formEnd = data.end;
		data.formStop = data.stop;
		data.formAddress = data.address;
		data.formAddressGeo = data.addressGeo;
		data.formCheckSet = data.checkSet;
		data.formCancelSet = data.cancelSet;
		data.formIsMenu = data.isMenu;
		data.formJoinForms = data.joinForms;

		data.cateName = ActivityBiz.getCateName(data.cateId);

		try {
			let activityId = this.data.id;
			data.id = activityId;

			// 先修改，再上传 
			await cloudHelper.callCloudSumbit('admin/activity_edit', data).then(res => {
				// 更新列表页面数据
				let node = {
					'ACTIVITY_TITLE': data.title,
					'ACTIVITY_CATE_NAME': data.cateName,
					'ACTIVITY_ORDER': data.order,
					'ACTIVITY_START': data.start,
					'ACTIVITY_END': data.end,
					'ACTIVITY_STOP': data.stop,
					'ACTIVITY_MAX_CNT': data.maxCnt,
					'ACTIVITY_CHECK_SET': data.checkSet,
					'ACTIVITY_CANCEL_SET': data.cancelSet,
					'ACTIVITY_IS_MENU': data.isMenu,
					statusDesc: res.data && res.data.statusDesc
				}
				pageHelper.modifyPrevPageListNodeObject(activityId, node);
			});

			if (this._hasTempMedia(forms))
				await cloudHelper.transFormsTempPics(forms, 'activity/', activityId, 'admin/activity_update_forms');

			let callback = () => {
				wx.navigateBack();
			}
			pageHelper.showSuccToast('修改成功', 2000, callback);

		} catch (err) {
			console.error('admin/activity_edit failed:', err);
			return pageHelper.showModal('活动修改失败：' + this._fmtErr(err));
		}

	},

	_hasTempMedia: function (forms = []) {
		const isTemp = val => typeof val === 'string' && (val.includes('tmp') || val.includes('temp') || val.includes('wxfile'));
		return forms.some(item => {
			if (!item) return false;
			if (item.type == 'image' && Array.isArray(item.val)) return item.val.some(isTemp);
			if (item.type == 'content' && Array.isArray(item.val)) return item.val.some(node => node && node.type == 'img' && isTemp(node.val));
			if (item.type == 'file' && Array.isArray(item.val)) return item.val.some(file => file && isTemp(file.path));
			return false;
		});
	},

	_fmtErr: function (err) {
		if (!err) return '未知错误';
		return err.msg || err.message || err.errMsg || JSON.stringify(err);
	},

	_fmtTime: function (val) {
		if (!val) return '';
		if (typeof val === 'number') return timeHelper.timestamp2Time(val, 'Y-M-D h:m');
		return val;
	},

	// Time picker events write directly to the form fields used by validation.
	bindStartTime: function (e) {
		this.setData({ formStart: e.detail || '' });
	},

	bindEndTime: function (e) {
		this.setData({ formEnd: e.detail || '' });
	},

	bindStopTime: function (e) {
		this.setData({ formStop: e.detail || '' });
	},

	_syncTimeFields: function () {
		const pickerMap = {
			formStart: '#activity-start-time',
			formEnd: '#activity-end-time',
			formStop: '#activity-stop-time'
		};
		let values = {};
		for (let field in pickerMap) {
			let picker = this.selectComponent(pickerMap[field]);
			if (picker && picker.getSelectedTime) values[field] = picker.getSelectedTime() || this.data[field] || '';
		}
		this.setData(values);
		console.log('activity time fields:', values);
		return values;
	},

	bindMapTap: function (e) {
		AdminActivityBiz.selectLocation(this);
	},

	url: function (e) {
		pageHelper.url(e, this);
	},

	switchModel: function (e) {
		pageHelper.switchModel(this, e);
	},

	bindJoinFormsCmpt: function (e) {
		this.setData({
			formJoinForms: e.detail,
		});
	},

})
