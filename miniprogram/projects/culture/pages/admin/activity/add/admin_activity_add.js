const AdminBiz = require('../../../../../../comm/biz/admin_biz.js');
const pageHelper = require('../../../../../../helper/page_helper.js');
const cloudHelper = require('../../../../../../helper/cloud_helper.js');
const AdminActivityBiz = require('../../../../biz/admin_activity_biz.js');
const ActivityBiz = require('../../../../biz/activity_biz.js');
const validate = require('../../../../../../helper/validate.js');
const PublicBiz = require('../../../../../../comm/biz/public_biz.js');
const projectSetting = require('../../../../public/project_setting.js');

Page({

	/**
	 * 页面的初始数据
	 */
	data: {

	},

	/**
	 * 生命周期函数--监听页面加载
	 */
	onLoad: async function (options) {
		if (!AdminBiz.isAdmin(this)) return;

		wx.setNavigationBarTitle({
			title: projectSetting.ACTIVITY_NAME + '-添加',
		});

		this.setData(AdminActivityBiz.initFormData());
		this.setData({
			isLoad: true
		});
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

	url: function (e) {
		pageHelper.url(e, this);
	},
	switchModel: function (e) {
		pageHelper.switchModel(this, e);
	},

	// Keep the selected values in the fields validated before submission.
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
		return values;
	},

	bindFormSubmit: async function () {
		if (!AdminBiz.isAdmin(this)) return;

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

			// 创建
			let result = await cloudHelper.callCloudSumbit('admin/activity_insert', data);
			let activityId = result.data.id;

			// 图片
			await cloudHelper.transFormsTempPics(forms, 'activity/', activityId, 'admin/activity_update_forms');

			let callback = async function () {
				PublicBiz.removeCacheList('admin-activity-list');
				PublicBiz.removeCacheList('activity-list');
				wx.navigateBack();

			}
			pageHelper.showSuccToast('添加成功', 2000, callback);

		} catch (err) {
			console.log(err);
		}
	},

	bindJoinFormsCmpt: function (e) {
		this.setData({
			formJoinForms: e.detail,
		});
	},

	bindMapTap: function (e) {
		AdminActivityBiz.selectLocation(this);
	}
})
