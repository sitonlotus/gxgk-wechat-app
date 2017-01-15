//jy.js
//获取应用实例
var app = getApp();
Page({
  data: {
    remind: '加载中',
    jyData: {
      book_list: [],  //当前借阅列表
      books_num: 0,   //当前借阅量
      history: 0,     //历史借阅量
      dbet: 0,        //欠费
      nothing: true   //当前是否有借阅
    },
    jyHistoryTap: false //点击历史借阅
  },
  onLoad: function () {
    this.getData();
  },
  onPullDownRefresh: function () {
    this.getData();
  },
  getData: function () {
    var _this = this;
    if (!app.user.wxinfo.id || !app.user.is_bind_library) {
      _this.setData({
        remind: '未绑定'
      });
      return false;
    }
    wx.request({
      url: app.server + "/api/users/get_user_library",
      method: 'POST',
      data: {
         session_id: app.user.wxinfo.id
          },
      success: function (res) {
        if (res.data && res.statusCode == 200) {
          var info = res.data.msg;
         _this.setData({
            jyData: info,
            remind: ''
          });
        } else {
          _this.setData({
            remind: res.data.message || '未知错误'
          });
        }
      },
      fail: function (res) {
        app.showErrorModal(res.errMsg);
        _this.setData({
          remind: '网络错误'
        });
      },
      complete: function () {
        wx.stopPullDownRefresh();
      }
    });
  },
  jyHistory: function () {
    var _this = this;
    if (!_this.data.jyHistoryTap) {
      _this.setData({
        jyHistoryTap: true
      });
      setTimeout(function () {
        _this.setData({
          jyHistoryTap: false
        });
      }, 2000);
    }
  }

});