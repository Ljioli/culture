const BaseProjectAdminController = require('./base_project_admin_controller.js');
const AdminSeedService = require('../../service/admin/admin_seed_service.js');

class AdminSeedController extends BaseProjectAdminController {
	async seedDemoData() {
		await this.isAdmin();
		const service = new AdminSeedService();
		return await service.seedDemoData();
	}
}

module.exports = AdminSeedController;
