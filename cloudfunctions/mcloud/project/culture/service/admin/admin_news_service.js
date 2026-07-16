/**
 * Notes: 资讯后台管理
 * Ver : CCMiniCloud Framework 2.0.1 ALL RIGHTS RESERVED BY cclinux0730 (wechat)
 * Date: 07-11 07:48:00 
 */

const BaseProjectAdminService = require('./base_project_admin_service.js');
const dataUtil = require('../../../../framework/utils/data_util.js');
const util = require('../../../../framework/utils/util.js');
const cloudUtil = require('../../../../framework/cloud/cloud_util.js');

const NewsModel = require('../../model/news_model.js');

class AdminNewsService extends BaseProjectAdminService {

	/** 推荐首页SETUP */
	async vouchNews(id, vouch) {
		await NewsModel.edit({ _id: id, _pid: this.getProjectId() }, { NEWS_VOUCH: Number(vouch) });
	}

	/**添加资讯 */
	async insertNews({
		title, cateId, cateName, order, desc, forms = []
	}) {
		return await NewsModel.insert({
			_pid: this.getProjectId(), NEWS_TITLE: title, NEWS_CATE_ID: cateId,
			NEWS_CATE_NAME: cateName, NEWS_ORDER: Number(order), NEWS_DESC: desc,
			NEWS_STATUS: 1, NEWS_VOUCH: 0, NEWS_FORMS: forms,
			NEWS_OBJ: dataUtil.dbForms2Obj(forms)
		});
	}

	/**删除资讯数据 */
	async delNews(id) {
		const news = await NewsModel.getOne({ _id: id, _pid: this.getProjectId() });
		if (!news) return;
		cloudUtil.handlerCloudFilesForForms(news.NEWS_FORMS || [], []);
		if (news.NEWS_QR) cloudUtil.deleteFiles([news.NEWS_QR]);
		await NewsModel.del({ _id: id, _pid: this.getProjectId() });
	}

	/**获取资讯信息 */
	async getNewsDetail(id) {
		let fields = '*';

		let where = {
			_id: id
		}
		let news = await NewsModel.getOne(where, fields);
		if (!news) return null;

		return news;
	}

	// 更新forms信息
	async updateNewsForms({
		id,
		hasImageForms = []
	}) {
		await NewsModel.edit({ _id: id, _pid: this.getProjectId() }, {
			NEWS_FORMS: hasImageForms,
			NEWS_OBJ: dataUtil.dbForms2Obj(hasImageForms)
		});
	}


	/**
	 * 更新富文本详细的内容及图片信息
	 * @returns 返回 urls数组 [url1, url2, url3, ...]
	 */
	async updateNewsContent({
		id,
		content // 富文本数组
	}) {

		await NewsModel.edit({ _id: id, _pid: this.getProjectId() }, { NEWS_CONTENT: content || [] });

	}

	/**
	 * 更新资讯图片信息
	 * @returns 返回 urls数组 [url1, url2, url3, ...]
	 */
	async updateNewsPic({
		id,
		imgList // 图片数组
	}) {

		await NewsModel.edit({ _id: id, _pid: this.getProjectId() }, { NEWS_PIC: imgList || [] });
		return imgList || [];

	}


	/**更新资讯数据 */
	async editNews({
		id, title, cateId, cateName, order, desc, forms = []
	}) {
		await NewsModel.edit({ _id: id, _pid: this.getProjectId() }, {
			NEWS_TITLE: title, NEWS_CATE_ID: cateId, NEWS_CATE_NAME: cateName,
			NEWS_ORDER: Number(order), NEWS_DESC: desc, NEWS_FORMS: forms,
			NEWS_OBJ: dataUtil.dbForms2Obj(forms)
		});

	}

	/**取得资讯分页列表 */
	async getAdminNewsList({
		search, // 搜索条件
		sortType, // 搜索菜单
		sortVal, // 搜索菜单
		orderBy, // 排序
		whereEx, //附加查询条件
		page,
		size,
		isTotal = true,
		oldTotal
	}) {

		orderBy = orderBy || {
			'NEWS_ORDER': 'asc',
			'NEWS_ADD_TIME': 'desc'
		};
		let fields = 'NEWS_TITLE,NEWS_DESC,NEWS_CATE_ID,NEWS_CATE_NAME,NEWS_EDIT_TIME,NEWS_ADD_TIME,NEWS_ORDER,NEWS_STATUS,NEWS_CATE2_NAME,NEWS_VOUCH,NEWS_QR,NEWS_OBJ';

		let where = {};
		where.and = {
			_pid: this.getProjectId() //复杂的查询在此处标注PID
		};

		if (util.isDefined(search) && search) {
			where.or = [
				{ NEWS_TITLE: ['like', search] },
			];

		} else if (sortType && util.isDefined(sortVal)) {
			// 搜索菜单
			switch (sortType) {
				case 'cateId': {
					where.and.NEWS_CATE_ID = String(sortVal);
					break;
				}
				case 'status': {
					where.and.NEWS_STATUS = Number(sortVal);
					break;
				}
				case 'top': {
					where.and.NEWS_ORDER = 0;
					break;
				}
				case 'sort': {
					orderBy = this.fmtOrderBySort(sortVal, 'NEWS_ADD_TIME');
					break;
				}

			}
		}

		return await NewsModel.getList(where, fields, orderBy, page, size, isTotal, oldTotal);
	}

	/**修改资讯状态 */
	async statusNews(id, status) {
		await NewsModel.edit({ _id: id, _pid: this.getProjectId() }, { NEWS_STATUS: Number(status) });
	}

	/**置顶与排序设定 */
	async sortNews(id, sort) {
		await NewsModel.edit({ _id: id, _pid: this.getProjectId() }, { NEWS_ORDER: Number(sort) });
	}
}

module.exports = AdminNewsService;
