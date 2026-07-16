/**
 * Notes: 初始化本地文旅展示数据
 */
const BaseProjectAdminService = require('./base_project_admin_service.js');
const timeUtil = require('../../../../framework/utils/time_util.js');
const ProductModel = require('../../model/product_model.js');
const NewsModel = require('../../model/news_model.js');
const ActivityModel = require('../../model/activity_model.js');
const InfoModel = require('../../model/info_model.js');
const ActivityJoinModel = require('../../model/activity_join_model.js');
const CommentModel = require('../../model/comment_model.js');
const FavModel = require('../../model/fav_model.js');
const UserModel = require('../../model/user_model.js');

const IMG = [
	'/projects/culture/images/home.jpg',
	'/projects/culture/images/my.jpg',
	'/projects/culture/images/menu/p1.png',
	'/projects/culture/images/menu/p2.png',
	'/projects/culture/images/menu/p3.png',
	'/projects/culture/images/menu/p4.png',
	'/projects/culture/images/menu/p5.png'
];

class AdminSeedService extends BaseProjectAdminService {
	async seedDemoData() {
		const result = { users: 0, product: 0, news: 0, activity: 0, info: 0, comments: 0, favorites: 0, joins: 0 };

		try {
			const demoUsers = await this.seedUsers(result);
			const productIds = await this.seedProducts(result);
			await this.seedNews(result);
			const activityIds = await this.seedActivities(result);
			const infoIds = await this.seedInfos(result, demoUsers);
			await this.seedRelations(result, infoIds, activityIds, productIds);
		} catch (err) {
			console.error('[seed_demo] seedDemoData failed:', err);
			result.fatalError = err && err.message ? err.message : String(err);
		}

		return result;
	}

	async seedUsers(result) {
		const rows = [
			['demo_user_lan_001', '蓝晴晴', '女', '18800001001', '/projects/culture/images/my.jpg'],
			['demo_user_lin_002', '林舟', '男', '18800001002', '/projects/culture/images/home.jpg'],
			['demo_user_su_003', '苏小满', '女', '18800001003', '/projects/culture/images/menu/p1.png'],
			['demo_user_chen_004', '陈予安', '男', '18800001004', '/projects/culture/images/menu/p2.png'],
			['demo_user_jiang_005', '江眠', '女', '18800001005', '/projects/culture/images/menu/p3.png'],
			['demo_user_xia_006', '夏木', '男', '18800001006', '/projects/culture/images/menu/p4.png'],
			['demo_user_tang_007', '唐一禾', '女', '18800001007', '/projects/culture/images/menu/p5.png'],
			['demo_user_qi_008', '齐远', '男', '18800001008', '/projects/culture/images/none.png']
		];

		const users = [];
		for (let i = 0; i < rows.length; i++) {
			const [openid, name, sex, mobile, pic] = rows[i];
			let user = await UserModel.getOne({ USER_MINI_OPENID: openid }, 'USER_MINI_OPENID,USER_NAME,USER_PIC');
			if (!user) {
				const forms = [
					{ mark: 'sex', title: '性别', type: 'select', val: sex },
					{ mark: 'city', title: '常驻城市', type: 'text', val: '成都' },
					{ mark: 'tag', title: '旅行偏好', type: 'text', val: i % 2 === 0 ? '城市漫步' : '自然风光' }
				];
				await UserModel.insert({
					USER_MINI_OPENID: openid,
					USER_STATUS: 1,
					USER_NAME: name,
					USER_MOBILE: mobile,
					USER_PIC: pic,
					USER_FORMS: forms,
					USER_OBJ: { sex, city: '成都', tag: forms[2].val },
					USER_LOGIN_CNT: 1
				});
				user = { USER_MINI_OPENID: openid, USER_NAME: name, USER_PIC: pic };
				result.users++;
			}
			users.push(user);
		}
		return users;
	}

	async seedProducts(result) {
		const rows = [
			['成都三日慢游路线', '城市漫游', '适合第一次来成都的三日路线，把宽窄巷子、锦里、人民公园、春熙路和博物馆串起来，节奏轻松，不赶路。', ['第一天建议住在天府广场或春熙路附近，上午到人民公园喝盖碗茶，下午逛宽窄巷子，晚上去锦里看夜景。', '第二天安排成都博物馆、太古里和望平街，适合拍照和体验城市街区。第三天可以去金沙遗址或大熊猫基地，收尾不累。']],
			['宽窄巷子拍照攻略', '热门街区', '整理宽窄巷子适合拍照、喝茶、买伴手礼的点位，适合半日游。', ['建议上午十点前到，人少光线柔和。宽巷子适合拍建筑，窄巷子适合拍街景，井巷子更安静。', '不要只走主路，旁边的小院落和墙面细节更有老成都味道。']],
			['锦里古街夜游指南', '夜游推荐', '适合傍晚到夜间游览的古街路线，重点是灯光、川味小吃和休闲体验。', ['傍晚六点左右到锦里，先沿主街慢慢走，等灯光亮起来再拍照。', '小吃建议少量多样，边走边吃更有体验感。节假日人多，尽量错峰。']],
			['人民公园半日休闲路线', '本地生活', '从茶馆、湖边到鹤鸣茶社，体验成都人慢生活的一条轻量路线。', ['上午到人民公园最舒服，先沿湖边散步，再找茶馆坐下来。', '如果想体验采耳、喝茶、聊天，这里比商业街区更有生活气。']],
			['青城山一日轻徒步', '自然风光', '适合周末短途出行的青城山路线，强度适中，适合学生和亲子。', ['早上从成都出发，中午前后到山脚，选择前山经典路线，沿途树荫很多。', '建议穿舒适鞋，带水和薄外套。山里天气变化快，雨具也可以备一把。']],
			['都江堰古城慢旅行', '周边旅行', '把水利工程、南桥夜景和古城小吃安排在一天里，适合不想太累的周边游。', ['上午看都江堰水利工程，理解鱼嘴、飞沙堰、宝瓶口的设计。', '傍晚回到南桥附近，灯亮之后氛围很好，适合拍照和散步。']],
			['成都亲子周末路线', '亲子出行', '博物馆、公园和特色餐饮组合，照顾小朋友体力，也方便家长休息。', ['上午安排博物馆或熊猫基地，下午换到公园类空间释放体力。', '餐厅尽量选交通方便、排队少的区域，行程中保留午休时间。']],
			['春熙路太古里逛街地图', '购物休闲', '适合年轻人半日逛街、拍照、喝咖啡的城市商业路线。', ['路线可以从春熙路地铁站开始，先看IFS熊猫，再向太古里慢慢走。', '下午适合咖啡店休息，晚上灯光亮起后街区更适合拍照。']],
			['成都早餐打卡清单', '美食攻略', '从肥肠粉、钟水饺到锅盔豆花，整理适合早起体验的早餐点。', ['早餐最好就近安排，不要为了单个店跨城。成都早餐选择很多，居民区附近更容易吃到日常味道。', '建议两三个人一起点不同品类，能多尝几种。']],
			['川西入门自驾准备', '自驾攻略', '面向第一次去川西的同学，整理路线、衣物、药品和拍照准备。', ['川西自驾不要把每天路程排太满，高海拔地区更适合慢一点。', '衣服按分层准备，防晒、帽子、墨镜和常用药都要提前放好。']]
		];

		const ids = [];
		for (let i = 0; i < rows.length; i++) {
			const [title, cate, desc, paras] = rows[i];
			let product = await ProductModel.getOne({ PRODUCT_TITLE: title }, '_id');
			if (!product) {
				const cover = [pickImg(i)];
				const content = makeContent(paras, i);
				const forms = [
					{ mark: 'cover', title: '封面图片', type: 'image', val: cover },
					{ mark: 'desc', title: '简介', type: 'textarea', val: desc },
					{ mark: 'content', title: '详情', type: 'content', val: content }
				];
				const id = await ProductModel.insert({
					PRODUCT_TITLE: title,
					PRODUCT_STATUS: 1,
					PRODUCT_CATE_ID: String((i % 5) + 1),
					PRODUCT_CATE_NAME: cate,
					PRODUCT_ORDER: i + 1,
					PRODUCT_VOUCH: i < 4 ? 1 : 0,
					PRODUCT_FORMS: forms,
					PRODUCT_OBJ: { cover, desc, content }
				});
				product = { _id: id };
				result.product++;
			}
			ids.push(product._id);
		}
		return ids;
	}

	async seedNews(result) {
		const rows = [
			['文旅服务中心开放时间', '文旅服务中心每日09:00-18:00开放，可咨询路线、交通、活动报名和游记发布等问题。'],
			['周末热门景区错峰提醒', '周末宽窄巷子、锦里和熊猫基地人流较多，建议上午早到或傍晚错峰出行。'],
			['学生文旅体验活动上线', '本周新增城市漫步、博物馆讲解和公园茶文化体验活动，欢迎在活动栏目报名。'],
			['游记内容发布说明', '发布游记时请填写真实体验，图片建议选择清晰的风景、街区或美食照片。'],
			['本地交通温馨提示', '市区景点优先推荐地铁和步行组合，周边游可选择高铁或正规旅游巴士。'],
			['文明旅游倡议', '参观文物古迹和自然景区时，请爱护公共设施，不乱扔垃圾，不随意触碰展品。']
		];

		for (let i = 0; i < rows.length; i++) {
			const [title, text] = rows[i];
			if (await NewsModel.count({ NEWS_TITLE: title })) continue;
			await NewsModel.insert({
				NEWS_TITLE: title,
				NEWS_DESC: text,
				NEWS_STATUS: 1,
				NEWS_CATE_ID: String((i % 3) + 1),
				NEWS_CATE_NAME: i % 2 === 0 ? '公告' : '服务',
				NEWS_ORDER: i + 1,
				NEWS_VOUCH: i < 2 ? 1 : 0,
				NEWS_CONTENT: makeContent([text, '如需更多帮助，可以在“我的-设置-后台管理”中维护公告、服务、活动和攻略内容。'], i),
				NEWS_PIC: [pickImg(i)],
				NEWS_FORMS: [],
				NEWS_OBJ: {}
			});
			result.news++;
		}
	}

	async seedActivities(result) {
		const now = timeUtil.time();
		const day = 86400 * 1000;
		const rows = [
			['宽窄巷子城市漫步', '城市体验', '从少城片区出发，边走边讲老成都街巷、院落和茶馆文化。', '免费', '2.5', '宽窄巷子东广场'],
			['人民公园茶文化体验', '本地生活', '在茶馆里体验盖碗茶、采耳文化和成都人的慢节奏。', '19元', '2', '人民公园鹤鸣茶社门口'],
			['成都博物馆主题讲解', '文化活动', '围绕城市历史、民俗和文物故事做一次轻量讲解。', '免费', '2', '成都博物馆一层大厅'],
			['锦里夜景摄影小队', '摄影活动', '傍晚集合，学习手机夜景构图和古街灯光拍摄。', '29元', '3', '锦里古街牌坊'],
			['青城山轻徒步', '户外活动', '适合初学者的轻徒步路线，重点体验山林、溪水和道观建筑。', '39元', '5', '青城山景区游客中心'],
			['都江堰水利故事行', '研学活动', '从鱼嘴到宝瓶口，边走边理解古代水利工程的智慧。', '29元', '4', '都江堰景区南门'],
			['望平街咖啡地图', '休闲活动', '沿河街区散步，体验咖啡店、书店和小店的城市氛围。', '免费', '2', '望平街游客服务点'],
			['金沙遗址夜游讲解', '夜游活动', '夜间参观金沙遗址，了解太阳神鸟和古蜀文明故事。', '49元', '3', '金沙遗址博物馆正门']
		];

		const ids = [];
		for (let i = 0; i < rows.length; i++) {
			const [title, cate, desc, fee, hour, address] = rows[i];
			let activity = await ActivityModel.getOne({ ACTIVITY_TITLE: title }, '_id,ACTIVITY_USER_LIST');
			if (!activity) {
				const start = now + (i + 2) * day + 9 * 3600 * 1000;
				const cover = [pickImg(i)];
				const content = makeContent([desc, '活动适合课堂展示和真实体验模拟，报名后可在“我的活动报名”里查看记录。', '请提前10分钟到达集合点，现场以工作人员安排为准。'], i);
				const forms = [
					{ mark: 'cover', title: '封面图片', type: 'image', val: cover },
					{ mark: 'desc', title: '活动内容', type: 'content', val: content },
					{ mark: 'fee', title: '活动费用', type: 'text', val: fee },
					{ mark: 'time', title: '活动时长', type: 'text', val: hour }
				];
				const id = await ActivityModel.insert({
					ACTIVITY_TITLE: title,
					ACTIVITY_STATUS: 1,
					ACTIVITY_CATE_ID: String((i % 4) + 1),
					ACTIVITY_CATE_NAME: cate,
					ACTIVITY_CANCEL_SET: 1,
					ACTIVITY_CHECK_SET: 0,
					ACTIVITY_IS_MENU: 1,
					ACTIVITY_MAX_CNT: 30 + i * 5,
					ACTIVITY_START: start,
					ACTIVITY_END: start + Number(hour) * 3600 * 1000,
					ACTIVITY_STOP: start - 2 * 3600 * 1000,
					ACTIVITY_ORDER: i + 1,
					ACTIVITY_VOUCH: i < 4 ? 1 : 0,
					ACTIVITY_FORMS: forms,
					ACTIVITY_OBJ: { cover, desc: content, fee, time: hour },
					ACTIVITY_JOIN_FORMS: [
						{ mark: 'name', title: '姓名', type: 'text', must: true },
						{ mark: 'phone', title: '手机号', type: 'mobile', must: true },
						{ mark: 'remark', title: '备注', type: 'textarea', must: false }
					],
					ACTIVITY_ADDRESS: address,
					ACTIVITY_ADDRESS_GEO: {},
					ACTIVITY_JOIN_CNT: 0,
					ACTIVITY_COMMENT_CNT: 0,
					ACTIVITY_USER_LIST: []
				});
				activity = { _id: id };
				result.activity++;
			}
			ids.push(activity._id);
		}
		return ids;
	}

	async seedInfos(result, demoUsers = []) {
		const rows = [
			['在人民公园坐了一下午', '美景', '没有赶景点，只是在湖边喝茶、看树影和来来往往的人，反而最像真正的成都。'],
			['第一次夜游锦里，灯亮起来很好看', '夜游', '傍晚到锦里最合适，天色慢慢暗下来，灯笼和木质建筑很有氛围。'],
			['宽窄巷子不只适合打卡', '街区', '避开最拥挤的主路，往小院子里走，能看到更安静的成都生活。'],
			['成都早餐真的很适合慢慢吃', '美食', '早上吃了肥肠粉、锅盔和甜水面，几家店都不大，但味道很扎实。'],
			['青城山的空气像洗过一样', '自然', '山路不算太难，树很多，走一段就能听到水声，适合周末放松。'],
			['都江堰比想象中更震撼', '研学', '现场看水流和工程结构，比书本上更容易理解古人的智慧。'],
			['春熙路太古里半日逛街记录', '休闲', '从IFS熊猫开始逛，路上很多小店和咖啡，适合下午慢慢走。'],
			['金沙遗址的太阳神鸟很有记忆点', '文化', '展厅不算难逛，讲解清楚后会觉得古蜀文化很有画面感。'],
			['望平街适合一个人散步', '城市', '河边、咖啡店、书店和小餐馆连在一起，节奏比商业街轻很多。'],
			['成都三天两晚小总结', '攻略', '住在市中心很方便，地铁能到大部分景点，行程不要排太满更舒服。'],
			['熊猫基地早起值得', '亲子', '早上去能看到熊猫比较活跃，园区很大，建议穿舒服的鞋。'],
			['文殊院附近很适合拍照', '街区', '红墙、老街、小吃和茶馆都在附近，半天时间刚刚好。']
		];

		const ids = [];
		for (let i = 0; i < rows.length; i++) {
			const [title, cate, text] = rows[i];
			const author = demoUsers.length ? demoUsers[i % demoUsers.length] : null;
			const authorId = author ? author.USER_MINI_OPENID : '';
			let info = await InfoModel.getOne({ 'INFO_OBJ.title': title }, '_id,INFO_USER_ID');
			if (!info) {
				const cover = [pickImg(i)];
				const desc = makeContent([text, '这条内容可以作为前台游记、后台游记管理、收藏和评论功能的展示数据。', '如果用于课堂展示，可以点进详情页查看图文排版和评论数量。'], i);
				const forms = [
					{ mark: 'title', title: '标题', type: 'text', val: title },
					{ mark: 'desc', title: '内容', type: 'content', val: desc },
					{ mark: 'cover', title: '封面图', type: 'image', val: cover }
				];
				const id = await InfoModel.insert({
					INFO_USER_ID: authorId,
					INFO_STATUS: 1,
					INFO_CATE_ID: String((i % 5) + 1),
					INFO_CATE_NAME: cate,
					INFO_ORDER: i + 1,
					INFO_FORMS: forms,
					INFO_OBJ: { title, desc, cover },
					INFO_COMMENT_CNT: 0,
					INFO_VOUCH: i < 6 ? 1 : 0
				});
				info = { _id: id };
				result.info++;
			} else if (!info.INFO_USER_ID && authorId) {
				await InfoModel.edit({ _id: info._id }, { INFO_USER_ID: authorId });
			}
			ids.push(info._id);
		}
		return ids;
	}

	async seedRelations(result, infoIds, activityIds) {
		const usersResult = await UserModel.getList({}, 'USER_MINI_OPENID,USER_NAME,USER_PIC', { USER_ADD_TIME: 'asc' }, 1, 20, true, 0);
		const users = (usersResult && usersResult.list) || [];
		if (!users.length) return;

		const commentTexts = [
			'这个路线安排得很清楚，适合第一次来的人参考。',
			'收藏了，周末准备照着走一遍。',
			'图片和文字都很有氛围，课堂展示效果应该不错。',
			'交通和时间说明很实用，减少了很多纠结。',
			'内容比空数据真实很多，点进详情也有东西看。'
		];

		for (let i = 0; i < infoIds.length; i++) {
			const oid = infoIds[i];
			if (!oid) continue;
			for (let j = 0; j < Math.min(users.length, 5); j++) {
				await this.insertCommentOnce(users[j].USER_MINI_OPENID, 'info', oid, commentTexts[(i + j) % commentTexts.length], result);
			}
			await InfoModel.edit({ _id: oid }, { INFO_COMMENT_CNT: await CommentModel.count({ COMMENT_TYPE: 'info', COMMENT_OID: oid }) });
		}

		for (let i = 0; i < activityIds.length; i++) {
			const oid = activityIds[i];
			if (!oid) continue;
			for (let j = 0; j < Math.min(users.length, 3); j++) {
				await this.insertCommentOnce(users[j].USER_MINI_OPENID, 'activity', oid, commentTexts[(i + j + 1) % commentTexts.length], result);
			}
			await ActivityModel.edit({ _id: oid }, { ACTIVITY_COMMENT_CNT: await CommentModel.count({ COMMENT_TYPE: 'activity', COMMENT_OID: oid }) });
		}

		for (let i = 0; i < Math.min(users.length, 5); i++) {
			const userId = users[i].USER_MINI_OPENID;
			for (let j = 0; j < Math.min(infoIds.length, 6); j++) {
				const oid = infoIds[(i + j) % infoIds.length];
				if (!oid || await FavModel.count({ FAV_USER_ID: userId, FAV_OID: oid })) continue;
				await FavModel.insert({
					FAV_USER_ID: userId,
					FAV_TITLE: '本地游记收藏 ' + (j + 1),
					FAV_TYPE: 'info',
					FAV_OID: oid,
					FAV_PATH: '/projects/culture/pages/info/detail/info_detail?id=' + oid
				});
				result.favorites++;
			}
		}

		for (let i = 0; i < Math.min(users.length, activityIds.length); i++) {
			const user = users[i];
			const activityId = activityIds[i];
			if (!activityId || await ActivityJoinModel.count({ ACTIVITY_JOIN_ACTIVITY_ID: activityId, ACTIVITY_JOIN_USER_ID: user.USER_MINI_OPENID })) continue;
			const forms = [
				{ mark: 'name', title: '姓名', type: 'text', val: user.USER_NAME || '体验用户' + (i + 1) },
				{ mark: 'phone', title: '手机号', type: 'mobile', val: '1380000000' + i },
				{ mark: 'remark', title: '备注', type: 'textarea', val: '课堂展示报名数据' }
			];
			await ActivityJoinModel.insert({
				ACTIVITY_JOIN_ACTIVITY_ID: activityId,
				ACTIVITY_JOIN_IS_ADMIN: 1,
				ACTIVITY_JOIN_CODE: 'DEMO' + Date.now() + i,
				ACTIVITY_JOIN_IS_CHECKIN: i % 2,
				ACTIVITY_JOIN_USER_ID: user.USER_MINI_OPENID,
				ACTIVITY_JOIN_FORMS: forms,
				ACTIVITY_JOIN_OBJ: { name: forms[0].val, phone: forms[1].val, remark: forms[2].val },
				ACTIVITY_JOIN_STATUS: 1
			});
			result.joins++;
			await ActivityModel.edit({ _id: activityId }, { ACTIVITY_JOIN_CNT: await ActivityJoinModel.count({ ACTIVITY_JOIN_ACTIVITY_ID: activityId }) });
		}
	}

	async insertCommentOnce(userId, type, oid, text, result) {
		if (!userId || !oid) return;
		if (await CommentModel.count({ COMMENT_USER_ID: userId, COMMENT_TYPE: type, COMMENT_OID: oid, 'COMMENT_OBJ.content': text })) return;
		const forms = [
			{ mark: 'content', title: '评论内容', type: 'textarea', val: text },
			{ mark: 'img', title: '图片', type: 'image', val: [] }
		];
		await CommentModel.insert({
			COMMENT_USER_ID: userId,
			COMMENT_TYPE: type,
			COMMENT_OID: oid,
			COMMENT_FORMS: forms,
			COMMENT_OBJ: { content: text, img: [] }
		});
		result.comments++;
	}
}

function pickImg(index) {
	return IMG[index % IMG.length];
}

function makeContent(paras, imgIndex) {
	const content = [];
	for (let i = 0; i < paras.length; i++) {
		content.push({ type: 'text', val: paras[i] });
		if (i === 0) content.push({ type: 'img', val: pickImg(imgIndex + i) });
	}
	return content;
}

module.exports = AdminSeedService;
