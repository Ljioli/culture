/**
 * Notes: 用户管理
 * Ver : CCMiniCloud Framework 2.0.1 ALL RIGHTS RESERVED BY cclinux0730 (wechat)
 * Date: 01-22  07:48:00 
 */

const BaseProjectAdminService = require('./base_project_admin_service.js');

const util = require('../../../../framework/utils/util.js');
const exportUtil = require('../../../../framework/utils/export_util.js');
const timeUtil = require('../../../../framework/utils/time_util.js');
const dataUtil = require('../../../../framework/utils/data_util.js');
const UserModel = require('../../model/user_model.js');
const AdminHomeService = require('./admin_home_service.js');
const FavModel = require('../../model/fav_model.js');
const ActivityJoinModel = require('../../model/activity_join_model.js');
const ActivityModel = require('../../model/activity_model.js');
const InfoModel = require('../../model/info_model.js');
const HistoryModel = require('../../model/history_model.js');

// 导出用户数据KEY
const EXPORT_USER_DATA_KEY = 'EXPORT_USER_DATA';

class AdminUserService extends BaseProjectAdminService {
	/** 获得某个用户信息 */
	async getUser({
		userId,
		fields = '*'
	}) {
		let where = {
			USER_MINI_OPENID: userId,
		}
		return await UserModel.getOne(where, fields);
	}

	/** 取得用户行为数据，供后台用户详情查看 */
	async getUserActivityData(userId) {
		const favList = await FavModel.getAll({ FAV_USER_ID: userId }, '*', { FAV_ADD_TIME: 'desc' }, 100);
		const joinList = await ActivityJoinModel.getAll({ ACTIVITY_JOIN_USER_ID: userId }, '*', { ACTIVITY_JOIN_ADD_TIME: 'desc' }, 100);
		for (const item of joinList) {
			item.ACTIVITY_JOIN_ADD_TIME = timeUtil.timestamp2Time(item.ACTIVITY_JOIN_ADD_TIME);
			item.activity = await ActivityModel.getOne({ _id: item.ACTIVITY_JOIN_ACTIVITY_ID }, 'ACTIVITY_TITLE,ACTIVITY_START,ACTIVITY_END');
		}

		const infoList = await InfoModel.getAll({ INFO_USER_ID: userId }, '*', { INFO_ADD_TIME: 'desc' }, 100);
		for (const item of infoList) {
			item.INFO_ADD_TIME = timeUtil.timestamp2Time(item.INFO_ADD_TIME);
			item.INFO_OBJ = item.INFO_OBJ || {};
			if (!item.INFO_OBJ.title && Array.isArray(item.INFO_FORMS)) {
				const titleForm = item.INFO_FORMS.find(form => form.mark === 'title');
				if (titleForm) item.INFO_OBJ.title = titleForm.val || '';
			}
		}

		let historyList = [];
		try {
			historyList = await HistoryModel.getAll({ HISTORY_USER_ID: userId }, '*', { HISTORY_ADD_TIME: 'desc' }, 100);
		} catch (err) {
			historyList = [];
		}
		const typeDesc = { product: '旅行攻略', activity: '活动', info: '游记', news: '公告/服务' };
		for (const item of historyList) {
			item.HISTORY_TYPE_DESC = typeDesc[item.HISTORY_TYPE] || item.HISTORY_TYPE;
			item.HISTORY_ADD_TIME = timeUtil.timestamp2Time(item.HISTORY_ADD_TIME);
		}
		for (const item of favList) item.FAV_ADD_TIME = timeUtil.timestamp2Time(item.FAV_ADD_TIME);

		return {
			favList,
			joinList,
			infoList,
			historyList,
			counts: {
				fav: favList.length,
				join: joinList.length,
				info: infoList.length,
				history: historyList.length
			}
		};
	}

	async delUserHistory(userId, historyId) {
		await HistoryModel.del({
			_id: historyId,
			HISTORY_USER_ID: userId
		});
	}

	async clearUserHistory(userId) {
		await HistoryModel.del({
			HISTORY_USER_ID: userId
		});
	}

	/** 取得用户分页列表 */
	async getUserList({
		search,
		sortType,
		sortVal,
		orderBy,
		whereEx,
		page,
		size,
		oldTotal = 0
	}) {
		orderBy = orderBy || {
			USER_ADD_TIME: 'desc'
		};
		let fields = '*';

		let where = {};
		where.and = {
			_pid: this.getProjectId()
		};

		if (util.isDefined(search) && search) {
			where.or = [{
				USER_NAME: ['like', search]
			},
			{
				USER_MOBILE: ['like', search]
			},
			{
				USER_MEMO: ['like', search]
			},
			];
		} else if (sortType && util.isDefined(sortVal)) {
			switch (sortType) {
				case 'status':
					where.and.USER_STATUS = Number(sortVal);
					break;
				case 'sort': {
					orderBy = this.fmtOrderBySort(sortVal, 'USER_ADD_TIME');
					break;
				}
			}
		}
		let result = await UserModel.getList(where, fields, orderBy, page, size, true, oldTotal, false);
		result.condition = encodeURIComponent(JSON.stringify(where));
		return result;
	}

	async statusUser(id, status, reason) {
		await UserModel.edit({ _id: id, _pid: this.getProjectId() }, {
			USER_STATUS: Number(status),
			USER_CHECK_REASON: reason || ''
		});
	}

	/** 删除用户 */
	async delUser(id) {
		await UserModel.del({ _id: id, _pid: this.getProjectId() });
	}

	// #####################导出用户数据
	async getUserDataURL() {
		return await exportUtil.getExportDataURL(EXPORT_USER_DATA_KEY);
	}

	async deleteUserDataExcel() {
		return await exportUtil.deleteDataExcel(EXPORT_USER_DATA_KEY);
	}

	_getUserFormValue(user, field) {
		if (!field || !field.mark) return '';
		const forms = Array.isArray(user.USER_FORMS) ? user.USER_FORMS : [];
		const form = forms.find(item => item && item.mark === field.mark);
		if (!form) return '';
		if (Array.isArray(form.val)) return form.val.join('、');
		if (form.val === null || form.val === undefined) return '';
		return String(form.val);
	}

	async exportUserDataExcel(condition, fields) {
		let where = {};
		try {
			where = JSON.parse(decodeURIComponent(condition || '{}'));
		} catch (e) {
			where = {};
		}

		const exportFields = Array.isArray(fields) ? fields : [];
		const list = await UserModel.getAll(where, '*', { USER_ADD_TIME: 'asc' }, 10000);
		const header = ['用户昵称', '手机号', '状态', '注册时间'];
		for (const field of exportFields) {
			header.push(field.title || field.mark || '字段');
		}

		const rows = [header];
		for (const item of list) {
			const row = [
				item.USER_NAME || '',
				item.USER_MOBILE || '',
				item.USER_STATUS,
				timeUtil.timestamp2Time(item.USER_ADD_TIME),
			];
			for (const field of exportFields) {
				row.push(this._getUserFormValue(item, field));
			}
			rows.push(row);
		}

		return await exportUtil.exportDataExcel(EXPORT_USER_DATA_KEY, '用户数据', list.length, rows);
	}
}

module.exports = AdminUserService;
