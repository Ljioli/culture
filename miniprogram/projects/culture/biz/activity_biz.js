/**
 * Notes: 活动模块业务逻辑
 * Ver : CCMiniCloud Framework 2.0.1 ALL RIGHTS RESERVED BY cclinux0730 (wechat)
 * Date: 06-24 07:48:00 
 */

const BaseBiz = require('../../../comm/biz/base_biz.js');
const pageHelper = require('../../../helper/page_helper.js');
const cloudHelper = require('../../../helper/cloud_helper.js');
const projectSetting = require('../public/project_setting.js');

class ActivityBiz extends BaseBiz {

	static getCateName(cateId) {
		let cateList = projectSetting.ACTIVITY_CATE;

		for (let k = 0; k < cateList.length; k++) {
			if (cateList[k].id == cateId) {
				return cateList[k].title;
			}
		}
		return '';
	}

	static getCateList() {

		let cateList = projectSetting.ACTIVITY_CATE;

		let arr = [];
		for (let k = 0; k < cateList.length; k++) {
			arr.push({
				label: cateList[k].title,
				type: 'cateId',
				val: cateList[k].id, //for options form
				value: cateList[k].id, //for list menu
			})
		}

		return arr;
	}

	static setCateTitle() {

		let curPage = pageHelper.getPrevPage(1);
		if (!curPage) return;

		let cateId = null;
		if (curPage.options && curPage.options.id) {
			cateId = curPage.options.id;
		}
		let cateList = projectSetting.ACTIVITY_CATE;
		for (let k = 0; k < cateList.length; k++) {
			if (cateList[k].id == cateId) {
				wx.setNavigationBarTitle({
					title: cateList[k].title
				});
				return;
			}
		}

	}

	 

	static async cancelMyActivityJoin(activityJoinId, callback) {
		let cb = async () => {
			try {
				let params = {
					activityJoinId
				}
				let opts = {
					title: '取消中'
				}

				await cloudHelper.callCloudSumbit('activity/my_join_cancel', params, opts).then(res => {
					pageHelper.showSuccToast('已取消', 1500, callback);
				});
			} catch (err) {
				console.log(err);
			}
		}

		pageHelper.showConfirm('确认取消该报名?', cb);
	}


	static _toNumber(value) {
		const num = Number(value);
		return Number.isFinite(num) ? num : 0;
	}

	static _parseGeo(geo) {
		if (!geo) return null;

		if (typeof geo === 'string') {
			try {
				geo = JSON.parse(geo);
			} catch (err) {
				return null;
			}
		}

		if (!geo || typeof geo !== 'object') return null;

		const latitude = this._toNumber(geo.latitude || geo.lat);
		const longitude = this._toNumber(geo.longitude || geo.lng);
		if (!latitude || !longitude) return null;

		return {
			latitude,
			longitude,
			name: geo.name || '',
			address: geo.address || ''
		};
	}

	static openMap(address, geo) {
		const location = this._parseGeo(geo);
		if (location) {
			wx.openLocation({
				latitude: location.latitude,
				longitude: location.longitude,
				name: location.name || address,
				address: location.address || address,
				scale: 18
			});
			return;
		}

		if (address) {
			pageHelper.showModal('\u6e29\u99a8\u63d0\u793a', '\u8be5\u6d3b\u52a8\u6682\u672a\u4fdd\u5b58\u5730\u56fe\u5750\u6807\uff0c\u6682\u65f6\u65e0\u6cd5\u76f4\u63a5\u5bfc\u822a\u3002\u8bf7\u5728\u540e\u53f0\u7f16\u8f91\u6d3b\u52a8\u65f6\u91cd\u65b0\u9009\u62e9\u5730\u56fe\u5b9a\u4f4d\u540e\u4fdd\u5b58\u3002');
			return;
		}

		pageHelper.showNoneToast('\u6682\u65e0\u6d3b\u52a8\u5730\u70b9\u4fe1\u606f');
	}
	
}

module.exports = ActivityBiz;