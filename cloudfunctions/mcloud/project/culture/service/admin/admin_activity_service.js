/**
 * Notes: 活动后台管理
 * Ver : CCMiniCloud Framework 2.0.1 ALL RIGHTS RESERVED BY cclinux0730 (wechat)
 * Date: 06-23 07:48:00
 */

const BaseProjectAdminService = require("./base_project_admin_service.js");
const ActivityService = require("../activity_service.js");
const AdminHomeService = require("../admin/admin_home_service.js");
const util = require("../../../../framework/utils/util.js");
const cloudUtil = require("../../../../framework/cloud/cloud_util.js");
const cloudBase = require("../../../../framework/cloud/cloud_base.js");
const timeUtil = require("../../../../framework/utils/time_util.js");
const dataUtil = require("../../../../framework/utils/data_util.js");
const ActivityModel = require("../../model/activity_model.js");
const ActivityJoinModel = require("../../model/activity_join_model.js");
const exportUtil = require("../../../../framework/utils/export_util.js");

// 导出报名数据KEY
const EXPORT_ACTIVITY_JOIN_DATA_KEY = "EXPORT_ACTIVITY_JOIN_DATA";

class AdminActivityService extends BaseProjectAdminService {
  /**取得分页列表 */
  async getAdminActivityList({
    search, // 搜索条件
    sortType, // 搜索菜单
    sortVal, // 搜索菜单
    orderBy, // 排序
    whereEx, //附加查询条件
    page,
    size,
    isTotal = true,
    oldTotal,
  }) {
    orderBy = orderBy || {
      ACTIVITY_ORDER: "asc",
      ACTIVITY_ADD_TIME: "desc",
    };
    let fields =
      "ACTIVITY_COMMENT_CNT,ACTIVITY_JOIN_CNT,ACTIVITY_TITLE,ACTIVITY_CATE_ID,ACTIVITY_CATE_NAME,ACTIVITY_EDIT_TIME,ACTIVITY_ADD_TIME,ACTIVITY_ORDER,ACTIVITY_STATUS,ACTIVITY_VOUCH,ACTIVITY_MAX_CNT,ACTIVITY_START,ACTIVITY_END,ACTIVITY_STOP,ACTIVITY_CANCEL_SET,ACTIVITY_CHECK_SET,ACTIVITY_QR,ACTIVITY_OBJ";

    let where = {};
    where.and = {
      _pid: this.getProjectId(), //复杂的查询在此处标注PID
    };

    if (util.isDefined(search) && search) {
      where.or = [
        {
          ACTIVITY_TITLE: ["like", search],
        },
      ];
    } else if (sortType && util.isDefined(sortVal)) {
      // 搜索菜单
      switch (sortType) {
        case "cateId": {
          where.and.ACTIVITY_CATE_ID = String(sortVal);
          break;
        }
        case "status": {
          where.and.ACTIVITY_STATUS = Number(sortVal);
          break;
        }
        case "vouch": {
          where.and.ACTIVITY_VOUCH = 1;
          break;
        }
        case "top": {
          where.and.ACTIVITY_ORDER = 0;
          break;
        }
        case "sort": {
          orderBy = this.fmtOrderBySort(sortVal, "ACTIVITY_ADD_TIME");
          break;
        }
      }
    }

    return await ActivityModel.getList(
      where,
      fields,
      orderBy,
      page,
      size,
      isTotal,
      oldTotal,
    );
  }

  /**置顶与排序设定 */
  async sortActivity(id, sort) {
    await ActivityModel.edit(
      { _id: id, _pid: this.getProjectId() },
      { ACTIVITY_ORDER: Number(sort) },
    );
  }

  /**获取信息 */
  async getActivityDetail(id) {
    let fields = "*";

    let where = {
      _id: id,
    };

    let activity = await ActivityModel.getOne(where, fields);
    if (!activity) return null;

    return activity;
  }

  /**首页设定 */
  async vouchActivity(id, vouch) {
    await ActivityModel.edit(
      { _id: id, _pid: this.getProjectId() },
      { ACTIVITY_VOUCH: Number(vouch) },
    );
  }

  /**添加 */
  async insertActivity(input) {
    try {
      const {
        formTitle,
        formCateId,
        cateName,
        formOrder,
        formMaxCnt,
        formStart,
        formEnd,
        formStop,
        formAddress,
        formAddressGeo,
        formCheckSet,
        formCancelSet,
        formIsMenu,
        formForms = [],
        formJoinForms = [],
      } = this._normalizeActivityInput(input);

      const forms = Array.isArray(formForms) ? formForms : [];
      const joinForms = Array.isArray(formJoinForms) ? formJoinForms : [];

      const data = {
        _pid: this.getProjectId(),
        ACTIVITY_TITLE: formTitle,
        ACTIVITY_CATE_ID: formCateId,
        ACTIVITY_CATE_NAME: cateName || "",
        ACTIVITY_ORDER: this._toNumber(formOrder, 9999),
        ACTIVITY_MAX_CNT: this._toNumber(formMaxCnt, 20),
        ACTIVITY_START: this._toTimestamp(formStart, "活动开始时间"),
        ACTIVITY_END: this._toTimestamp(formEnd, "活动结束时间"),
        ACTIVITY_STOP: this._toTimestamp(formStop, "报名截止时间"),
        ACTIVITY_ADDRESS: formAddress || "",
        ACTIVITY_ADDRESS_GEO: this._toObject(formAddressGeo),
        ACTIVITY_CHECK_SET: this._toNumber(formCheckSet, 0),
        ACTIVITY_CANCEL_SET: this._toNumber(formCancelSet, 1),
        ACTIVITY_IS_MENU: this._toNumber(formIsMenu, 1),
        ACTIVITY_FORMS: forms,
        ACTIVITY_OBJ: dataUtil.dbForms2Obj(forms),
        ACTIVITY_JOIN_FORMS: joinForms,
        ACTIVITY_STATUS: ActivityModel.STATUS.COMM,
        ACTIVITY_VOUCH: 0,
        ACTIVITY_JOIN_CNT: 0,
        ACTIVITY_USER_LIST: [],
      };
      return { id: await ActivityModel.insert(data) };
    } catch (err) {
      console.error("insertActivity error:", err);
      throw err;
    }
  }

  //#############################
  /** 清空 */
  async clearActivityAll(activityId) {
    await ActivityJoinModel.del({ ACTIVITY_JOIN_ACTIVITY_ID: activityId });
    await ActivityModel.edit(
      { _id: activityId, _pid: this.getProjectId() },
      { ACTIVITY_JOIN_CNT: 0, ACTIVITY_USER_LIST: [] },
    );
  }

  /**删除数据 */
  async delActivity(id) {
    const activity = await ActivityModel.getOne({
      _id: id,
      _pid: this.getProjectId(),
    });
    if (!activity) return;
    cloudUtil.handlerCloudFilesForForms(activity.ACTIVITY_FORMS || [], []);
    if (activity.ACTIVITY_QR) cloudUtil.deleteFiles([activity.ACTIVITY_QR]);
    await ActivityJoinModel.del({ ACTIVITY_JOIN_ACTIVITY_ID: id });
    await ActivityModel.del({ _id: id, _pid: this.getProjectId() });
  }

  // 更新forms信息
  async updateActivityForms({ id, hasImageForms = [] }) {
    await ActivityModel.editForms(
      { _id: id, _pid: this.getProjectId() },
      "ACTIVITY_FORMS",
      "ACTIVITY_OBJ",
      hasImageForms,
    );
  }

  /**更新数据 */
  async editActivity(input) {
    try {
      const {
        id,
        formTitle,
        formCateId,
        cateName,
        formOrder,
        formMaxCnt,
        formStart,
        formEnd,
        formStop,
        formAddress,
        formAddressGeo,
        formCheckSet,
        formCancelSet,
        formIsMenu,
        formForms = [],
        formJoinForms = [],
      } = this._normalizeActivityInput(input);

      const forms = Array.isArray(formForms) ? formForms : [];
      const joinForms = Array.isArray(formJoinForms) ? formJoinForms : [];

      await ActivityModel.edit(
        { _id: id, _pid: this.getProjectId() },
        {
          ACTIVITY_TITLE: formTitle,
          ACTIVITY_CATE_ID: formCateId,
          ACTIVITY_CATE_NAME: cateName || "",
          ACTIVITY_ORDER: this._toNumber(formOrder, 9999),
          ACTIVITY_MAX_CNT: this._toNumber(formMaxCnt, 20),
          ACTIVITY_START: this._toTimestamp(formStart, "活动开始时间"),
          ACTIVITY_END: this._toTimestamp(formEnd, "活动结束时间"),
          ACTIVITY_STOP: this._toTimestamp(formStop, "报名截止时间"),
          ACTIVITY_ADDRESS: formAddress || "",
          ACTIVITY_ADDRESS_GEO: this._toObject(formAddressGeo),
          ACTIVITY_CHECK_SET: this._toNumber(formCheckSet, 0),
          ACTIVITY_CANCEL_SET: this._toNumber(formCancelSet, 1),
          ACTIVITY_IS_MENU: this._toNumber(formIsMenu, 1),
          ACTIVITY_FORMS: forms,
          ACTIVITY_OBJ: dataUtil.dbForms2Obj(forms),
          ACTIVITY_JOIN_FORMS: joinForms,
        },
      );
      return { id };
    } catch (err) {
      console.error("editActivity error:", err);
      throw err;
    }
  }

  _normalizeActivityInput(input = {}) {
    return {
      id: input.id,
      formTitle: input.formTitle || input.title || "",
      formCateId: input.formCateId || input.cateId || "",
      cateName: input.formCateName || input.cateName || "",
      formOrder: util.isDefined(input.formOrder)
        ? input.formOrder
        : input.order,
      formMaxCnt: util.isDefined(input.formMaxCnt)
        ? input.formMaxCnt
        : input.maxCnt,
      formStart: input.formStart || input.start || "",
      formEnd: input.formEnd || input.end || "",
      formStop: input.formStop || input.stop || "",
      formAddress: input.formAddress || input.address || "",
      formAddressGeo: input.formAddressGeo || input.addressGeo || {},
      formCheckSet: util.isDefined(input.formCheckSet)
        ? input.formCheckSet
        : input.checkSet,
      formCancelSet: util.isDefined(input.formCancelSet)
        ? input.formCancelSet
        : input.cancelSet,
      formIsMenu: util.isDefined(input.formIsMenu)
        ? input.formIsMenu
        : input.isMenu,
      formForms: input.formForms || input.forms || [],
      formJoinForms: input.formJoinForms || input.joinForms || [],
    };
  }

  /**修改状态 */
  _toNumber(val, defaultVal = 0) {
    if (!util.isDefined(val) || val === "") return defaultVal;
    const num = Number(val);
    return Number.isNaN(num) ? defaultVal : num;
  }

  _toTimestamp(val, name) {
    if (!util.isDefined(val) || val === "") return 0;
    if (typeof val === "number") return val;
    if (typeof val === "string") return timeUtil.time2Timestamp(val);
    this.AppError(name + "格式不正确，请重新选择");
  }

  _toObject(val) {
    if (!val || typeof val !== "object" || Array.isArray(val)) return {};
    return val;
  }

  async statusActivity(id, status) {
    await ActivityModel.edit(
      { _id: id, _pid: this.getProjectId() },
      { ACTIVITY_STATUS: Number(status) },
    );
  }

  //#############################
  /**报名分页列表 */
  async getActivityJoinList({
    search, // 搜索条件
    sortType, // 搜索菜单
    sortVal, // 搜索菜单
    orderBy, // 排序
    activityId,
    page,
    size,
    isTotal = true,
    oldTotal,
  }) {
    orderBy = orderBy || {
      ACTIVITY_JOIN_ADD_TIME: "desc",
    };
    let fields = "*";

    let where = {
      ACTIVITY_JOIN_ACTIVITY_ID: activityId,
    };
    if (util.isDefined(search) && search) {
      where["ACTIVITY_JOIN_FORMS.val"] = {
        $regex: ".*" + search,
        $options: "i",
      };
    } else if (sortType && util.isDefined(sortVal)) {
      // 搜索菜单
      switch (sortType) {
        case "status":
          // 按类型
          where.ACTIVITY_JOIN_STATUS = Number(sortVal);
          break;
        case "checkin":
          // 签到
          where.ACTIVITY_JOIN_STATUS = ActivityJoinModel.STATUS.SUCC;
          if (sortVal == 1) {
            where.ACTIVITY_JOIN_IS_CHECKIN = 1;
          } else {
            where.ACTIVITY_JOIN_IS_CHECKIN = 0;
          }
          break;
      }
    }

    return await ActivityJoinModel.getList(
      where,
      fields,
      orderBy,
      page,
      size,
      isTotal,
      oldTotal,
    );
  }

  /**修改报名状态
   */
  async statusActivityJoin(activityJoinId, status, reason = "") {
    await ActivityJoinModel.edit(
      { _id: activityJoinId, _pid: this.getProjectId() },
      {
        ACTIVITY_JOIN_STATUS: Number(status),
        ACTIVITY_JOIN_REASON: reason || "",
      },
    );
  }

  /** 取消某项目的所有报名记录 */
  async cancelActivityJoinAll(activityId, reason) {
    await ActivityJoinModel.edit(
      {
        _pid: this.getProjectId(),
        ACTIVITY_JOIN_ACTIVITY_ID: activityId,
        ACTIVITY_JOIN_STATUS: ActivityJoinModel.STATUS.SUCC,
      },
      {
        ACTIVITY_JOIN_STATUS: ActivityJoinModel.STATUS.ADMIN_CANCEL,
        ACTIVITY_JOIN_REASON: reason || "管理员取消报名",
      },
    );
    await ActivityModel.edit(
      { _id: activityId, _pid: this.getProjectId() },
      { ACTIVITY_JOIN_CNT: 0, ACTIVITY_USER_LIST: [] },
    );
  }

  /** 删除报名 */
  async delActivityJoin(activityJoinId) {
    await ActivityJoinModel.del({
      _id: activityJoinId,
      _pid: this.getProjectId(),
    });
  }

  /** 自助签到码 */
  async genActivitySelfCheckinQr(page, activityId) {
    const cloud = cloudBase.getCloud();
    const result = await cloud.openapi.wxacode.getUnlimited({
      scene: activityId,
      width: 280,
      check_path: false,
      page: page.replace(/^\//, ""),
    });
    const cloudPath = `${this.getProjectId()}/activity/${activityId}/checkin_${this._timestamp}.png`;
    const upload = await cloud.uploadFile({
      cloudPath,
      fileContent: result.buffer,
    });
    if (!upload || !upload.fileID) return "";
    return await cloudUtil.getTempFileURLOne(upload.fileID);
  }

  /** 管理员按钮核销 */
  async checkinActivityJoin(activityJoinId, flag) {
    const data =
      Number(flag) === 1
        ? {
            ACTIVITY_JOIN_IS_CHECKIN: 1,
            ACTIVITY_JOIN_CHECKIN_TIME: this._timestamp,
          }
        : {
            ACTIVITY_JOIN_IS_CHECKIN: 0,
            ACTIVITY_JOIN_CHECKIN_TIME: 0,
          };
    await ActivityJoinModel.edit(
      { _id: activityJoinId, _pid: this.getProjectId() },
      data,
    );
  }

  /** 管理员扫码核销 */
  async scanActivityJoin(activityId, code) {
    const join = await ActivityJoinModel.getOne({
      _pid: this.getProjectId(),
      ACTIVITY_JOIN_ACTIVITY_ID: activityId,
      ACTIVITY_JOIN_CODE: code,
      ACTIVITY_JOIN_STATUS: ActivityJoinModel.STATUS.SUCC,
    });
    if (!join) this.AppError("未找到有效的报名记录");
    await this.checkinActivityJoin(join._id, 1);
  }

  // #####################导出报名数据
  /**获取报名数据 */
  async getActivityJoinDataURL() {
    return await exportUtil.getExportDataURL(EXPORT_ACTIVITY_JOIN_DATA_KEY);
  }

  /**删除报名数据 */
  async deleteActivityJoinDataExcel() {
    return await exportUtil.deleteDataExcel(EXPORT_ACTIVITY_JOIN_DATA_KEY);
  }

  /**导出报名数据 */
  async exportActivityJoinDataExcel({ activityId, status }) {
    const where = {
      _pid: this.getProjectId(),
      ACTIVITY_JOIN_ACTIVITY_ID: activityId,
    };
    if (Number(status) !== -1) where.ACTIVITY_JOIN_STATUS = Number(status);
    const list = await ActivityJoinModel.getAll(
      where,
      "*",
      { ACTIVITY_JOIN_ADD_TIME: "asc" },
      10000,
    );
    const rows = [["报名编号", "报名状态", "是否签到", "报名时间"]];
    for (const item of list) {
      const formVals = (item.ACTIVITY_JOIN_FORMS || []).map(
        (form) => form.val || "",
      );
      if (rows.length === 1)
        rows[0] = rows[0].concat(
          (item.ACTIVITY_JOIN_FORMS || []).map(
            (form) => form.title || form.mark || "字段",
          ),
        );
      rows.push([
        item._id,
        item.ACTIVITY_JOIN_STATUS,
        item.ACTIVITY_JOIN_IS_CHECKIN ? "是" : "否",
        timeUtil.timestamp2Time(item.ACTIVITY_JOIN_ADD_TIME),
        ...formVals,
      ]);
    }
    return await exportUtil.exportDataExcel(
      EXPORT_ACTIVITY_JOIN_DATA_KEY,
      "活动报名",
      list.length,
      rows,
    );
  }
}

module.exports = AdminActivityService;
