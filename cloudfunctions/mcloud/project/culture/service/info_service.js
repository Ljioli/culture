/**
 * Notes: 活动模块业务逻辑
 * Ver : CCMiniCloud Framework 2.0.1 ALL RIGHTS RESERVED BY cclinux0730 (wechat)
 * Date: 06-23 07:48:00 
 */

const BaseProjectService = require('./base_project_service.js');
const util = require('../../../framework/utils/util.js');
const dataUtil = require('../../../framework/utils/data_util.js');
const cloudUtil = require('../../../framework/cloud/cloud_util.js');
const InfoModel = require('../model/info_model.js');
const UserModel = require('../model/user_model.js');
const HistoryService = require('./history_service.js');

class InfoService extends BaseProjectService {

	/** 浏览信息 */
	async viewInfo(id, userId) {

		let fields = '*';

		let where = {
			_pid: this.getProjectId(),
			_id: id,
			INFO_STATUS: ['in', [InfoModel.STATUS.COMM, InfoModel.STATUS.GOOD]]
		}
		let info = await InfoModel.getOne(where, fields);
		if (!info) return null;
		info.INFO_OBJ = info.INFO_OBJ || {};
		if (Array.isArray(info.INFO_FORMS)) {
			for (const form of info.INFO_FORMS) {
				if (form.mark && (info.INFO_OBJ[form.mark] === undefined || info.INFO_OBJ[form.mark] === null)) {
					info.INFO_OBJ[form.mark] = form.val;
				}
			}
		}
		HistoryService.record(userId, 'info', id, info.INFO_OBJ && info.INFO_OBJ.title, '/projects/culture/pages/info/detail/info_detail?id=' + id);

		InfoModel.inc({ _id: id, _pid: this.getProjectId() }, 'INFO_VIEW_CNT', 1);

		let user = await UserModel.getOne({ USER_MINI_OPENID: info.INFO_USER_ID }, 'USER_PIC,USER_NAME,USER_OBJ.sex');
		if (user) info.user = user;

		return info;
	}

	// 更新forms信息
	async updateInfoForms({
		id,
		hasImageForms,
		userId
	}) {
		let where = { _id: id, _pid: this.getProjectId() };
		if (userId) where.INFO_USER_ID = userId;
		let info = await InfoModel.getOne(where, 'INFO_FORMS');
		if (!info) this.AppError('内容不存在或无权修改');
		await InfoModel.editForms(where, 'INFO_FORMS', 'INFO_OBJ', hasImageForms);
	}

	/**添加数据 */
	async insertInfo(userId, params = {}) {
		let formCateId = params.formCateId !== undefined ? params.formCateId : params.cateId;
		let cateName = params.cateName;
		let formOrder = params.formOrder !== undefined ? params.formOrder : params.order;
		let forms = Array.isArray(params.forms) ? params.forms : (Array.isArray(params.formForms) ? params.formForms : []);
		let data = {
			_pid: this.getProjectId(),
			INFO_USER_ID: userId,
			INFO_STATUS: InfoModel.STATUS.COMM,
			INFO_CATE_ID: String(formCateId || 0),
			INFO_CATE_NAME: cateName || '',
			INFO_ORDER: Number(formOrder || 9999),
			INFO_FORMS: Array.isArray(forms) ? forms : [],
			INFO_OBJ: dataUtil.dbForms2Obj(Array.isArray(forms) ? forms : [])
		};
		return { id: await InfoModel.insert(data) };
	}

	/**更新数据 */
	async editInfo(userId, params = {}) {
		let id = params.id;
		let formCateId = params.formCateId !== undefined ? params.formCateId : params.cateId;
		let cateName = params.cateName;
		let formOrder = params.formOrder !== undefined ? params.formOrder : params.order;
		let forms = Array.isArray(params.forms) ? params.forms : (Array.isArray(params.formForms) ? params.formForms : []);
		let where = { _id: id, _pid: this.getProjectId(), INFO_USER_ID: userId };
		if (!await InfoModel.getOne(where, '_id')) this.AppError('内容不存在或无权修改');
		let data = {
			INFO_CATE_ID: String(formCateId || 0),
			INFO_CATE_NAME: cateName || '',
			INFO_ORDER: Number(formOrder || 9999),
			INFO_FORMS: Array.isArray(forms) ? forms : [],
			INFO_OBJ: dataUtil.dbForms2Obj(Array.isArray(forms) ? forms : [])
		};
		await InfoModel.edit(where, data);
		return { id };

	}

	async getInfoList({
		search, // 搜索条件
		sortType, // 搜索菜单
		sortVal, // 搜索菜单
		orderBy, // 排序 
		page,
		size,
		isTotal = true,
		oldTotal
	}) {
		orderBy = orderBy || {
			'INFO_ADD_TIME': 'desc'
		};
		let fields = '*';

		let where = {};
		where.and = {
			INFO_STATUS: ['in', [InfoModel.STATUS.COMM, InfoModel.STATUS.GOOD]],
			_pid: this.getProjectId() //复杂的查询在此处标注PID
		};

		if (util.isDefined(search) && search) {
			where.or = [
				{ 'INFO_OBJ.desc': ['like', search] },
				{ 'INFO_OBJ.title': ['like', search] },
			];
		} else if (sortType) {
			// 搜索菜单
			switch (sortType) {
				case 'cateId': {
					where.and.INFO_CATE_ID = String(sortVal);
					break;
				}
				case 'status': {
					where.and.INFO_STATUS = Number(sortVal);
					break;
				}
				case 'timedesc': { //按时间倒序
					orderBy = {
						'INFO_ADD_TIME': 'desc'
					};
					break;
				}
				case 'timeasc': { //按时间正序
					orderBy = {
						'INFO_ADD_TIME': 'asc'
					};
					break;
				}
			}
		}

		let UserModel = require('../model/user_model.js');
		let joinParams = {
			from: UserModel.CL,
			localField: 'INFO_USER_ID',
			foreignField: 'USER_MINI_OPENID',
			as: 'user',
		};

		fields = 'INFO_COMMENT_CNT,INFO_VIEW_CNT,INFO_ADD_TIME,INFO_OBJ,INFO_FORMS,INFO_CATE_NAME,user.USER_NAME,user.USER_PIC';

		let result = await InfoModel.getListJoin(joinParams, where, fields, orderBy, page, size, isTotal, oldTotal);
		for (const item of result.list || []) {
			item.INFO_OBJ = item.INFO_OBJ || {};
			if (!item.INFO_OBJ.title && Array.isArray(item.INFO_FORMS)) {
				const titleForm = item.INFO_FORMS.find(form => form.mark === 'title');
				if (titleForm) item.INFO_OBJ.title = titleForm.val || '';
			}
			if (!item.INFO_OBJ.cover && Array.isArray(item.INFO_FORMS)) {
				const coverForm = item.INFO_FORMS.find(form => form.mark === 'cover');
				if (coverForm) item.INFO_OBJ.cover = coverForm.val || [];
			}
		}

		return result;
	}

	/** 取得我的分页列表 */
	async getMyInfoList(userId, {
		search, // 搜索条件
		sortType, // 搜索菜单
		sortVal, // 搜索菜单
		orderBy, // 排序 
		page,
		size,
		isTotal = true,
		oldTotal
	}) {
		orderBy = orderBy || {
			'INFO_ADD_TIME': 'desc'
		};
		let fields = '*';

		let where = {};
		where.and = {
			INFO_USER_ID: userId,
			_pid: this.getProjectId() //复杂的查询在此处标注PID
		};

		if (util.isDefined(search) && search) {
			where.or = [
				{ 'INFO_OBJ.desc': ['like', search] },
				{ 'INFO_OBJ.title': ['like', search] },
			];
		} else if (sortType) {
			// 搜索菜单
			switch (sortType) {
				case 'cateId': {
					where.and['INFO_CATE_ID'] = String(sortVal);
					break;
				}
				case 'hot': {
					orderBy = {
						'INFO_VIEW_CNT': 'desc',
						'INFO_ADD_TIME': 'desc'
					};
					break;
				}
				case 'status': {
					where.and.INFO_STATUS = Number(sortVal);
					break;
				}
				case 'timedesc': { //按时间倒序
					orderBy = {
						'INFO_ADD_TIME': 'desc'
					};
					break;
				}
				case 'timeasc': { //按时间正序
					orderBy = {
						'INFO_ADD_TIME': 'asc'
					};
					break;
				}
			}
		}

		let result = await InfoModel.getList(where, fields, orderBy, page, size, isTotal, oldTotal);

		return result;
	}

	/** 取得我的详情 */
	async getMyInfoDetail(userId, infoId) {

		let fields = '*';

		let where = {
			_pid: this.getProjectId(),
			_id: infoId,
			INFO_USER_ID: userId
		};
		return await InfoModel.getOne(where, fields);
	}


	async delMyInfo(userId, id) {
		let where = {
			_pid: this.getProjectId(),
			_id: id,
			INFO_USER_ID: userId
		}

		let info = await InfoModel.getOne(where);
		if (!info) return;

		// 异步处理 新旧文件 
		cloudUtil.handlerCloudFilesForForms(info.INFO_FORMS, []);
		cloudUtil.deleteFiles([info.INFO_QR]);

		await InfoModel.del(where);
	}

}

module.exports = InfoService;
