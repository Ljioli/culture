/**
 * Notes: 初始化本地文旅展示数据
 */
const BaseProjectAdminService = require("./base_project_admin_service.js");
const timeUtil = require("../../../../framework/utils/time_util.js");
const ProductModel = require("../../model/product_model.js");
const NewsModel = require("../../model/news_model.js");
const ActivityModel = require("../../model/activity_model.js");
const InfoModel = require("../../model/info_model.js");
const ActivityJoinModel = require("../../model/activity_join_model.js");
const CommentModel = require("../../model/comment_model.js");
const FavModel = require("../../model/fav_model.js");
const UserModel = require("../../model/user_model.js");

const IMG = [
  "https://images.unsplash.com/photo-1505765050516-f72dcac9c60e?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1533090161767-e6ffed986c88?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1476610182048-b716b8518aae?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1514496522488-7a8e488e8606?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1493246507139-91e8fad9978e?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1524351486989-a281d6409493?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1534081333815-ae5019106622?auto=format&fit=crop&w=1200&q=80",
];

const AVATAR_IMG = [
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80",
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80",
  "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=300&q=80",
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80",
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=300&q=80",
  "https://images.unsplash.com/photo-1502767089025-6572583495b0?auto=format&fit=crop&w=300&q=80",
];

class AdminSeedService extends BaseProjectAdminService {
  async seedDemoData() {
    const result = {
      users: 0,
      product: 0,
      news: 0,
      activity: 0,
      info: 0,
      comments: 0,
      favorites: 0,
      joins: 0,
    };

    try {
      const demoUsers = await this.seedUsers(result);
      const productIds = await this.seedProducts(result);
      await this.seedNews(result);
      const activityIds = await this.seedActivities(result);
      const infoIds = await this.seedInfos(result, demoUsers);
      await this.seedRelations(result, infoIds, activityIds, productIds);
    } catch (err) {
      console.error("[seed_demo] seedDemoData failed:", err);
      result.fatalError = err && err.message ? err.message : String(err);
    }

    return result;
  }

  async seedUsers(result) {
    const rows = [
      ["demo_user_lan_001", "蓝芷涵", "女", "18800001001", AVATAR_IMG[0]],
      ["demo_user_lin_002", "林致远", "男", "18800001002", AVATAR_IMG[1]],
      ["demo_user_su_003", "苏雅婷", "女", "18800001003", AVATAR_IMG[2]],
      ["demo_user_chen_004", "陈思远", "男", "18800001004", AVATAR_IMG[3]],
      ["demo_user_jiang_005", "江雨萱", "女", "18800001005", AVATAR_IMG[4]],
      ["demo_user_xia_006", "夏景行", "男", "18800001006", AVATAR_IMG[5]],
      ["demo_user_tang_007", "唐静怡", "女", "18800001007", AVATAR_IMG[6]],
      ["demo_user_qi_008", "齐文轩", "男", "18800001008", AVATAR_IMG[7]],
    ];

    const users = [];
    for (let i = 0; i < rows.length; i++) {
      const [openid, name, sex, mobile, pic] = rows[i];
      let user = await UserModel.getOne(
        { USER_MINI_OPENID: openid },
        "USER_MINI_OPENID,USER_NAME,USER_PIC",
      );
      if (!user) {
        const forms = [
          { mark: "sex", title: "性别", type: "select", val: sex },
          { mark: "city", title: "常驻城市", type: "text", val: "成都" },
          {
            mark: "tag",
            title: "旅行偏好",
            type: "text",
            val: i % 2 === 0 ? "城市漫步" : "自然风光",
          },
        ];
        await UserModel.insert({
          USER_MINI_OPENID: openid,
          USER_STATUS: 1,
          USER_NAME: name,
          USER_MOBILE: mobile,
          USER_PIC: pic,
          USER_FORMS: forms,
          USER_OBJ: { sex, city: "成都", tag: forms[2].val },
          USER_LOGIN_CNT: 1,
        });
        user = { USER_MINI_OPENID: openid, USER_NAME: name, USER_PIC: pic };
        result.users++;
      } else if (isLocalMiniImage(user.USER_PIC)) {
        await UserModel.edit(
          { USER_MINI_OPENID: openid },
          { USER_PIC: pic, USER_NAME: name },
        );
        user.USER_PIC = pic;
        user.USER_NAME = name;
      }
      users.push(user);
    }
    return users;
  }

  async seedProducts(result) {
    const rows = [
      [
        "成都三日深度游",
        "城市漫游",
        "专为初次到访成都的游客设计的三日行程，涵盖历史文化、市井生活与自然景观，节奏舒缓，不留遗憾。",
        [
          "首日入住天府广场或春熙路商圈，上午漫步人民公园品盖碗茶，下午探访宽窄巷子感受老成都街巷文化，晚间夜游锦里古街。",
          "次日参观成都博物馆了解城市历史，随后漫步太古里感受现代都市魅力，傍晚在望平街体验文艺街区氛围。",
          "第三日前往金沙遗址博物馆探索古蜀文明，或探访大熊猫基地亲近国宝，轻松收尾行程。",
        ],
      ],
      [
        "宽窄巷子深度攻略",
        "热门街区",
        "全面解析宽窄巷子的历史沿革、建筑特色与游玩攻略，带你发现不为人知的秘境角落。",
        [
          "建议上午十点前抵达，避开人流高峰。宽巷子以传统建筑为主，适合拍摄古风照片；窄巷子商业氛围浓厚；井巷子最为清幽。",
          "深入探访巷内的老院落，欣赏川西民居建筑细节，品尝地道成都小吃，购买特色伴手礼。",
        ],
      ],
      [
        "锦里古街夜游全攻略",
        "夜游推荐",
        "详解锦里古街的夜景精华、美食指南与游览动线，打造完美夜游体验。",
        [
          "傍晚六点左右进入锦里，先沿主街漫步预热，待华灯初上时拍摄最美夜景。",
          "美食推荐：三大炮、糖油果子、钵钵鸡等经典川味小吃，建议少量多次品尝。",
          "夜游亮点：红灯笼长廊、古戏台夜景、特色工艺品店铺，感受古街的独特魅力。",
        ],
      ],
      [
        "人民公园休闲指南",
        "本地生活",
        "深度体验成都人的日常休闲方式，从品茶到采耳，感受慢生活的精髓。",
        [
          "清晨入园，沿湖散步欣赏晨光倒影；上午在鹤鸣茶社品盖碗茶，体验传统茶艺。",
          "午后尝试采耳服务，感受成都特色放松方式；傍晚观看公园内的民俗表演。",
        ],
      ],
      [
        "青城山一日游",
        "自然风光",
        "精选青城山经典路线，带你领略"青城天下幽"的自然之美与道教文化。",
        [
          "清晨从成都出发，约1.5小时抵达青城山景区。选择前山路线，沿途绿树成荫，清凉宜人。",
          "游览月城湖、五洞天、天师洞等核心景点，建议穿着舒适运动鞋，备好雨具和防晒用品。",
        ],
      ],
      [
        "都江堰文化之旅",
        "周边旅行",
        "深度解读世界文化遗产的科学智慧，感受古人治水的伟大成就。",
        [
          "上午参观都江堰水利工程，依次游览鱼嘴分水堤、飞沙堰溢洪道、宝瓶口进水口，理解三大工程的精妙设计。",
          "下午漫步灌县古城，品尝特色小吃，傍晚欣赏南桥夜景，感受古城的别样风情。",
        ],
      ],
      [
        "成都亲子游玩攻略",
        "亲子出行",
        "专为家庭游客设计的亲子路线，兼顾知识性与趣味性，让孩子爱上成都。",
        [
          "首日前往成都博物馆或四川科技馆，寓教于乐；下午在人民公园或浣花溪公园释放活力。",
          "次日探访大熊猫基地，近距离观察国宝生活状态；午后前往成都动物园或欢乐谷。",
        ],
      ],
      [
        "春熙路太古里时尚指南",
        "购物休闲",
        "成都最繁华商业区的深度逛吃攻略，适合年轻人的时尚打卡路线。",
        [
          "从IFS国际金融中心开始，打卡网红大熊猫雕塑；漫步太古里街区，感受开放式商业空间的独特魅力。",
          "推荐打卡方所书店、特色咖啡馆与设计师品牌店，晚间体验商圈夜生活。",
        ],
      ],
      [
        "成都地道美食指南",
        "美食攻略",
        "从传统小吃到特色川菜，带你品尝最正宗的成都味道。",
        [
          "早餐推荐：肥肠粉配锅盔、钟水饺、龙抄手、叶儿粑，体验成都人的晨间美味。",
          "正餐推荐：麻婆豆腐、回锅肉、夫妻肺片等经典川菜，建议选择本地人常去的苍蝇馆子。",
          "夜宵推荐：串串香、冒菜、烧烤，感受成都的夜生活魅力。",
        ],
      ],
      [
        "川西自驾游全攻略",
        "自驾攻略",
        "详尽的川西自驾准备指南，助力你的高原探索之旅。",
        [
          "路线规划：成都-都江堰-四姑娘山-丹巴-新都桥-康定，建议安排7-10天行程。",
          "必备物品：防寒衣物、高原反应药品、防晒霜、墨镜；车辆建议选择SUV或越野车。",
          "注意事项：高原地区天气多变，行车需谨慎；尊重当地民俗文化。",
        ],
      ],
    ];

    const ids = [];
    for (let i = 0; i < rows.length; i++) {
      const [title, cate, desc, paras] = rows[i];
      let product = await ProductModel.getOne(
        { PRODUCT_TITLE: title },
        "_id,PRODUCT_FORMS,PRODUCT_OBJ",
      );
      if (!product) {
        const cover = [pickImg(i)];
        const content = makeContent(paras, i);
        const forms = [
          { mark: "cover", title: "封面图片", type: "image", val: cover },
          { mark: "desc", title: "简介", type: "textarea", val: desc },
          { mark: "content", title: "详情", type: "content", val: content },
        ];
        const id = await ProductModel.insert({
          PRODUCT_TITLE: title,
          PRODUCT_STATUS: 1,
          PRODUCT_CATE_ID: String((i % 5) + 1),
          PRODUCT_CATE_NAME: cate,
          PRODUCT_ORDER: i + 1,
          PRODUCT_VOUCH: i < 4 ? 1 : 0,
          PRODUCT_FORMS: forms,
          PRODUCT_OBJ: { cover, desc, content },
        });
        product = { _id: id };
        result.product++;
      } else {
        await this.refreshProductCover(product, i);
      }
      ids.push(product._id);
    }
    return ids;
  }

  async seedNews(result) {
    const rows = [
      [
        "文旅服务中心服务指南",
        "文旅服务中心每日09:00-18:00开放，提供专业的旅游咨询服务，包括路线规划、交通指引、活动报名和游记发布等一站式服务。",
      ],
      [
        "热门景区错峰游览指南",
        "宽窄巷子、锦里古街和大熊猫基地周末人流量较大，建议游客选择上午9:00前或下午17:00后错峰游览，提升游览体验。",
      ],
      [
        "精品文旅体验活动上线",
        "本周推出城市文化深度游、博物馆专业导览、盖碗茶文化体验等精品活动，由资深讲解员带领，感受成都独特魅力。",
      ],
      [
        "优质游记发布规范",
        "发布游记请分享真实游览体验，建议上传高清风景照、特色美食照或人文纪实照片，图文并茂，让更多人感受旅途精彩。",
      ],
      [
        "智慧出行温馨提示",
        "市区景点优先推荐地铁+步行的绿色出行方式，周边景区可选择高铁或正规旅游专线巴士，安全便捷。",
      ],
      [
        "文明旅游倡议书",
        "参观文物古迹和自然景区时，请遵守景区规定，爱护公共设施，保持环境整洁，共同维护文明旅游环境。",
      ],
      [
        "成都文旅大数据报告",
        "本月文旅数据显示，成都文旅市场持续回暖，博物馆、特色街区成为游客热门选择，欢迎来蓉感受天府文化魅力。",
      ],
    ];

    for (let i = 0; i < rows.length; i++) {
      const [title, text] = rows[i];
      if (await NewsModel.count({ NEWS_TITLE: title })) continue;
      await NewsModel.insert({
        NEWS_TITLE: title,
        NEWS_DESC: text,
        NEWS_STATUS: 1,
        NEWS_CATE_ID: String((i % 3) + 1),
        NEWS_CATE_NAME: i % 2 === 0 ? "公告" : "服务",
        NEWS_ORDER: i + 1,
        NEWS_VOUCH: i < 2 ? 1 : 0,
        NEWS_CONTENT: makeContent(
          [
            text,
            "如需更多帮助，可以在“我的-设置-后台管理”中维护公告、服务、活动和攻略内容。",
          ],
          i,
        ),
        NEWS_PIC: [pickImg(i)],
        NEWS_FORMS: [],
        NEWS_OBJ: {},
      });
      result.news++;
    }
  }

  async seedActivities(result) {
    const now = timeUtil.time();
    const day = 86400 * 1000;
    const rows = [
      [
        "宽窄巷子城市文化深度游",
        "城市体验",
        "跟随资深讲解员，深入少城历史街区，探索宽窄巷子的前世今生。了解老成都的街巷布局、院落文化和市井生活。",
        "免费",
        "2.5",
        "宽窄巷子东广场",
      ],
      [
        "人民公园盖碗茶文化体验",
        "本地生活",
        "在百年鹤鸣茶社，体验正宗成都盖碗茶。学习茶具鉴赏、泡茶技巧，感受老成都的慢生活美学。",
        "19元",
        "2",
        "人民公园鹤鸣茶社",
      ],
      [
        "成都博物馆历史导览",
        "文化活动",
        "专业讲解员带你穿越三千年历史长河，从古蜀文明到现代都市，解读成都的文化基因和城市精神。",
        "免费",
        "2",
        "成都博物馆一层大厅",
      ],
      [
        "锦里古街夜景摄影",
        "摄影活动",
        "专业摄影师指导，掌握手机夜景拍摄技巧。捕捉古街灯笼、青石板路与现代灯光的完美融合。",
        "29元",
        "3",
        "锦里古街牌坊",
      ],
      [
        "青城山生态轻徒步",
        "户外活动",
        "精心设计的低难度徒步路线，穿行于清幽山林之间，聆听溪流鸟鸣，感受道教圣地的自然灵气。",
        "39元",
        "5",
        "青城山景区游客中心",
      ],
      [
        "都江堰水利工程研学",
        "研学活动",
        "深度解析世界文化遗产的智慧结晶，从鱼嘴分水堤到宝瓶口，理解古人治水的科学思维。",
        "29元",
        "4",
        "都江堰景区南门",
      ],
      [
        "望平街城市漫步",
        "休闲活动",
        "沿府南河漫步，探访特色咖啡馆与独立书店，感受成都最具文艺气息的街区魅力。",
        "免费",
        "2",
        "望平街游客服务点",
      ],
      [
        "金沙遗址探秘之夜",
        "夜游活动",
        "夜游古蜀文明遗址，在灯光映衬下欣赏太阳神鸟金饰、青铜面具等珍贵文物，聆听古蜀传奇故事。",
        "49元",
        "3",
        "金沙遗址博物馆正门",
      ],
      [
        "武侯祠三国文化之旅",
        "文化活动",
        "品读三国历史，感受武侯祠的庄严与肃穆。了解诸葛亮的智慧谋略与蜀汉文化的深远影响。",
        "免费",
        "2",
        "武侯祠博物馆正门",
      ],
      [
        "文殊院禅意体验",
        "心灵疗愈",
        "在千年古刹中体验禅修静心，学习茶道礼仪，感受佛教文化的平和与智慧。",
        "35元",
        "3",
        "文殊院山门",
      ],
    ];

    const ids = [];
    for (let i = 0; i < rows.length; i++) {
      const [title, cate, desc, fee, hour, address] = rows[i];
      let activity = await ActivityModel.getOne(
        { ACTIVITY_TITLE: title },
        "_id,ACTIVITY_USER_LIST,ACTIVITY_FORMS,ACTIVITY_OBJ",
      );
      if (!activity) {
        const start = now + (i + 2) * day + 9 * 3600 * 1000;
        const cover = [pickImg(i)];
        const content = makeContent(
          [
            desc,
            "本次活动由专业团队精心策划，旨在为参与者提供深度文化体验。报名成功后，请准时到达集合地点，听从工作人员指引。",
            "活动期间请保持文明举止，爱护文物古迹，共同维护良好的游览秩序。",
          ],
          i,
        );
        const forms = [
          { mark: "cover", title: "封面图片", type: "image", val: cover },
          { mark: "desc", title: "活动内容", type: "content", val: content },
          { mark: "fee", title: "活动费用", type: "text", val: fee },
          { mark: "time", title: "活动时长", type: "text", val: hour },
          {
            mark: "guide",
            title: "带队导师",
            type: "text",
            val: "资深文化讲解员",
          },
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
          ACTIVITY_OBJ: {
            cover,
            desc: content,
            fee,
            time: hour,
            guide: "资深文化讲解员",
          },
          ACTIVITY_JOIN_FORMS: [
            { mark: "name", title: "姓名", type: "text", must: true },
            { mark: "phone", title: "手机号", type: "mobile", must: true },
            { mark: "remark", title: "备注", type: "textarea", must: false },
          ],
          ACTIVITY_ADDRESS: address,
          ACTIVITY_ADDRESS_GEO: {},
          ACTIVITY_JOIN_CNT: 0,
          ACTIVITY_COMMENT_CNT: 0,
          ACTIVITY_USER_LIST: [],
        });
        activity = { _id: id };
        result.activity++;
      } else {
        await this.refreshActivityCover(activity, i);
      }
      ids.push(activity._id);
    }
    return ids;
  }

  async seedInfos(result, demoUsers = []) {
    const rows = [
      [
        "在人民公园坐了一下午",
        "美景",
        "没有赶景点，只是在湖边喝茶、看树影和来来往往的人，反而最像真正的成都。",
      ],
      [
        "第一次夜游锦里，灯亮起来很好看",
        "夜游",
        "傍晚到锦里最合适，天色慢慢暗下来，灯笼和木质建筑很有氛围。",
      ],
      [
        "宽窄巷子不只适合打卡",
        "街区",
        "避开最拥挤的主路，往小院子里走，能看到更安静的成都生活。",
      ],
      [
        "成都早餐真的很适合慢慢吃",
        "美食",
        "早上吃了肥肠粉、锅盔和甜水面，几家店都不大，但味道很扎实。",
      ],
      [
        "青城山的空气像洗过一样",
        "自然",
        "山路不算太难，树很多，走一段就能听到水声，适合周末放松。",
      ],
      [
        "都江堰比想象中更震撼",
        "研学",
        "现场看水流和工程结构，比书本上更容易理解古人的智慧。",
      ],
      [
        "春熙路太古里半日逛街记录",
        "休闲",
        "从IFS熊猫开始逛，路上很多小店和咖啡，适合下午慢慢走。",
      ],
      [
        "金沙遗址的太阳神鸟很有记忆点",
        "文化",
        "展厅不算难逛，讲解清楚后会觉得古蜀文化很有画面感。",
      ],
      [
        "望平街适合一个人散步",
        "城市",
        "河边、咖啡店、书店和小餐馆连在一起，节奏比商业街轻很多。",
      ],
      [
        "成都三天两晚小总结",
        "攻略",
        "住在市中心很方便，地铁能到大部分景点，行程不要排太满更舒服。",
      ],
      [
        "熊猫基地早起值得",
        "亲子",
        "早上去能看到熊猫比较活跃，园区很大，建议穿舒服的鞋。",
      ],
      [
        "文殊院附近很适合拍照",
        "街区",
        "红墙、老街、小吃和茶馆都在附近，半天时间刚刚好。",
      ],
    ];

    const ids = [];
    for (let i = 0; i < rows.length; i++) {
      const [title, cate, text] = rows[i];
      const author = demoUsers.length ? demoUsers[i % demoUsers.length] : null;
      const authorId = author ? author.USER_MINI_OPENID : "";
      let info = await InfoModel.getOne(
        { "INFO_OBJ.title": title },
        "_id,INFO_USER_ID,INFO_FORMS,INFO_OBJ",
      );
      if (!info) {
        const cover = [pickImg(i)];
        const desc = makeContent(
          [
            text,
            "这条内容可以作为前台游记、后台游记管理、收藏和评论功能的展示数据。",
            "如果用于课堂展示，可以点进详情页查看图文排版和评论数量。",
          ],
          i,
        );
        const forms = [
          { mark: "title", title: "标题", type: "text", val: title },
          { mark: "desc", title: "内容", type: "content", val: desc },
          { mark: "cover", title: "封面图", type: "image", val: cover },
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
          INFO_VOUCH: i < 6 ? 1 : 0,
        });
        info = { _id: id };
        result.info++;
      } else {
        if (!info.INFO_USER_ID && authorId)
          await InfoModel.edit({ _id: info._id }, { INFO_USER_ID: authorId });
        await this.refreshInfoCover(info, i);
      }
      ids.push(info._id);
    }
    return ids;
  }

  async seedRelations(result, infoIds, activityIds) {
    const usersResult = await UserModel.getList(
      {},
      "USER_MINI_OPENID,USER_NAME,USER_PIC",
      { USER_ADD_TIME: "asc" },
      1,
      20,
      true,
      0,
    );
    const users = (usersResult && usersResult.list) || [];
    if (!users.length) return;

    const commentTexts = [
      "这个路线安排得很清楚，适合第一次来的人参考。",
      "收藏了，周末准备照着走一遍。",
      "图片和文字都很有氛围，课堂展示效果应该不错。",
      "交通和时间说明很实用，减少了很多纠结。",
      "内容比空数据真实很多，点进详情也有东西看。",
    ];

    for (let i = 0; i < infoIds.length; i++) {
      const oid = infoIds[i];
      if (!oid) continue;
      for (let j = 0; j < Math.min(users.length, 5); j++) {
        await this.insertCommentOnce(
          users[j].USER_MINI_OPENID,
          "info",
          oid,
          commentTexts[(i + j) % commentTexts.length],
          result,
        );
      }
      await InfoModel.edit(
        { _id: oid },
        {
          INFO_COMMENT_CNT: await CommentModel.count({
            COMMENT_TYPE: "info",
            COMMENT_OID: oid,
          }),
        },
      );
    }

    for (let i = 0; i < activityIds.length; i++) {
      const oid = activityIds[i];
      if (!oid) continue;
      for (let j = 0; j < Math.min(users.length, 3); j++) {
        await this.insertCommentOnce(
          users[j].USER_MINI_OPENID,
          "activity",
          oid,
          commentTexts[(i + j + 1) % commentTexts.length],
          result,
        );
      }
      await ActivityModel.edit(
        { _id: oid },
        {
          ACTIVITY_COMMENT_CNT: await CommentModel.count({
            COMMENT_TYPE: "activity",
            COMMENT_OID: oid,
          }),
        },
      );
    }

    for (let i = 0; i < Math.min(users.length, 5); i++) {
      const userId = users[i].USER_MINI_OPENID;
      for (let j = 0; j < Math.min(infoIds.length, 6); j++) {
        const oid = infoIds[(i + j) % infoIds.length];
        if (
          !oid ||
          (await FavModel.count({ FAV_USER_ID: userId, FAV_OID: oid }))
        )
          continue;
        await FavModel.insert({
          FAV_USER_ID: userId,
          FAV_TITLE: "本地游记收藏 " + (j + 1),
          FAV_TYPE: "info",
          FAV_OID: oid,
          FAV_PATH: "/projects/culture/pages/info/detail/info_detail?id=" + oid,
        });
        result.favorites++;
      }
    }

    for (let i = 0; i < Math.min(users.length, activityIds.length); i++) {
      const user = users[i];
      const activityId = activityIds[i];
      if (
        !activityId ||
        (await ActivityJoinModel.count({
          ACTIVITY_JOIN_ACTIVITY_ID: activityId,
          ACTIVITY_JOIN_USER_ID: user.USER_MINI_OPENID,
        }))
      )
        continue;
      const forms = [
        {
          mark: "name",
          title: "姓名",
          type: "text",
          val: user.USER_NAME || "体验用户" + (i + 1),
        },
        {
          mark: "phone",
          title: "手机号",
          type: "mobile",
          val: "1380000000" + i,
        },
        {
          mark: "remark",
          title: "备注",
          type: "textarea",
          val: "课堂展示报名数据",
        },
      ];
      await ActivityJoinModel.insert({
        ACTIVITY_JOIN_ACTIVITY_ID: activityId,
        ACTIVITY_JOIN_IS_ADMIN: 1,
        ACTIVITY_JOIN_CODE: "DEMO" + Date.now() + i,
        ACTIVITY_JOIN_IS_CHECKIN: i % 2,
        ACTIVITY_JOIN_USER_ID: user.USER_MINI_OPENID,
        ACTIVITY_JOIN_FORMS: forms,
        ACTIVITY_JOIN_OBJ: {
          name: forms[0].val,
          phone: forms[1].val,
          remark: forms[2].val,
        },
        ACTIVITY_JOIN_STATUS: 1,
      });
      result.joins++;
      await ActivityModel.edit(
        { _id: activityId },
        {
          ACTIVITY_JOIN_CNT: await ActivityJoinModel.count({
            ACTIVITY_JOIN_ACTIVITY_ID: activityId,
          }),
        },
      );
    }
  }

  async insertCommentOnce(userId, type, oid, text, result) {
    if (!userId || !oid) return;
    if (
      await CommentModel.count({
        COMMENT_USER_ID: userId,
        COMMENT_TYPE: type,
        COMMENT_OID: oid,
        "COMMENT_OBJ.content": text,
      })
    )
      return;
    const forms = [
      { mark: "content", title: "评论内容", type: "textarea", val: text },
      { mark: "img", title: "图片", type: "image", val: [] },
    ];
    await CommentModel.insert({
      COMMENT_USER_ID: userId,
      COMMENT_TYPE: type,
      COMMENT_OID: oid,
      COMMENT_FORMS: forms,
      COMMENT_OBJ: { content: text, img: [] },
    });
    result.comments++;
  }

  async refreshProductCover(product, index) {
    if (
      !product ||
      !shouldRefreshCover(product.PRODUCT_OBJ && product.PRODUCT_OBJ.cover)
    )
      return;
    const cover = [pickImg(index)];
    const forms = replaceFormValue(product.PRODUCT_FORMS || [], "cover", cover);
    const obj = Object.assign({}, product.PRODUCT_OBJ || {}, { cover });
    await ProductModel.edit(
      { _id: product._id },
      { PRODUCT_FORMS: forms, PRODUCT_OBJ: obj },
    );
  }

  async refreshActivityCover(activity, index) {
    if (
      !activity ||
      !shouldRefreshCover(activity.ACTIVITY_OBJ && activity.ACTIVITY_OBJ.cover)
    )
      return;
    const cover = [pickImg(index)];
    const forms = replaceFormValue(
      activity.ACTIVITY_FORMS || [],
      "cover",
      cover,
    );
    const obj = Object.assign({}, activity.ACTIVITY_OBJ || {}, { cover });
    await ActivityModel.edit(
      { _id: activity._id },
      { ACTIVITY_FORMS: forms, ACTIVITY_OBJ: obj },
    );
  }

  async refreshInfoCover(info, index) {
    if (!info || !shouldRefreshCover(info.INFO_OBJ && info.INFO_OBJ.cover))
      return;
    const cover = [pickImg(index)];
    const forms = replaceFormValue(info.INFO_FORMS || [], "cover", cover);
    const obj = Object.assign({}, info.INFO_OBJ || {}, { cover });
    await InfoModel.edit(
      { _id: info._id },
      { INFO_FORMS: forms, INFO_OBJ: obj },
    );
  }
}

function pickImg(index) {
  return IMG[index % IMG.length];
}

function makeContent(paras, imgIndex) {
  const content = [];
  for (let i = 0; i < paras.length; i++) {
    content.push({ type: "text", val: paras[i] });
    if (i === 0) content.push({ type: "img", val: pickImg(imgIndex + i) });
  }
  return content;
}

function replaceFormValue(forms, mark, val) {
  return (forms || []).map((form) =>
    form.mark === mark ? Object.assign({}, form, { val }) : form,
  );
}

function shouldRefreshCover(cover) {
  if (!Array.isArray(cover) || !cover.length) return true;
  return isLocalMiniImage(cover[0]);
}

function isLocalMiniImage(url) {
  return !url || (typeof url === "string" && url.startsWith("/projects/"));
}

module.exports = AdminSeedService;
