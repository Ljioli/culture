/**
 * Notes: 用户浏览历史实体
 */
const BaseProjectModel = require('./base_project_model.js');

class HistoryModel extends BaseProjectModel {}

HistoryModel.CL = BaseProjectModel.C('history');

HistoryModel.DB_STRUCTURE = {
	_pid: 'string|true',
	HISTORY_ID: 'string|true',
	HISTORY_USER_ID: 'string|true',
	HISTORY_TYPE: 'string|true',
	HISTORY_OID: 'string|true',
	HISTORY_TITLE: 'string|false',
	HISTORY_PATH: 'string|false',
	HISTORY_ADD_TIME: 'int|true',
	HISTORY_EDIT_TIME: 'int|true',
	HISTORY_ADD_IP: 'string|false',
	HISTORY_EDIT_IP: 'string|false'
};

HistoryModel.FIELD_PREFIX = 'HISTORY_';

module.exports = HistoryModel;
