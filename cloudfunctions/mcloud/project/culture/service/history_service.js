/**
 * Notes: 用户浏览历史业务逻辑
 */
const BaseProjectService = require('./base_project_service.js');
const HistoryModel = require('../model/history_model.js');

class HistoryService extends BaseProjectService {
	static async record(userId, type, oid, title, path) {
		if (!userId || !oid) return;
		try {
			const where = {
				HISTORY_USER_ID: userId,
				HISTORY_TYPE: type,
				HISTORY_OID: oid
			};
			await HistoryModel.del(where);
			await HistoryModel.insert(Object.assign(where, {
				HISTORY_TITLE: title || '',
				HISTORY_PATH: path || ''
			}));
		} catch (err) {
			// 历史集合尚未创建时，不阻断详情页正常返回。
			console.warn('history record skipped:', err.message);
		}
	}
}

module.exports = HistoryService;
