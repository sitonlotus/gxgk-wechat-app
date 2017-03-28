//app.js
App({
  version: 'v0.0.7', //版本号
  onLaunch: function () {
    var _this = this;
    //读取缓存
    try {
      var data = wx.getStorageInfoSync();
      if (data && data.keys.length) {
        data.keys.forEach(function (key) {
          var value = wx.getStorageSync(key);
          if (value) {
            _this.cache[key] = value;
          }
        });
        if (_this.cache.version !== _this.version) {
          _this.cache = {};
          wx.clearStorage();
        } else {
          _this.user.wxinfo = _this.cache.userinfo.userInfo || {};
          _this.processData(_this.cache.userdata);
        }
      }
    } catch (e) { console.warn('获取缓存失败'); }
  },
  //保存缓存
  saveCache: function (key, value) {
    if (!key || !value) { return; }
    var _this = this;
    _this.cache[key] = value;
    wx.setStorage({
      key: key,
      data: value
    });
  },
  //清除缓存
  removeCache: function (key) {
    if (!key) { return; }
    var _this = this;
    _this.cache[key] = '';
    wx.removeStorage({
      key: key
    });
  },
  //后台切换至前台时
  onShow: function () {

  },
  //判断是否有登录信息，让分享时自动登录
  loginLoad: function (onLoad, share = false) {
    var _this = this;
    if (!_this._t) {  //无登录信息
      _this.getUser(function (e) {
        typeof onLoad == "function" && onLoad(e);
      });
    } else {  //有登录信息
      wx.request({
        url: _this.server + '/api/users/check_login',
        method: 'POST',
        data: {
          session_id: _this.user.wxinfo.id
        },
        success: function (res) {
          if (res.data && res.data.status === 200) {
            typeof onLoad == "function" && onLoad();
          }
          else {
            _this.getUser(function (e) {
              typeof onLoad == "function" && onLoad(e);
            });
          }
        }
      });
    }
  },
  //getUser函数，在index中调用
  getUser: function (response) {
    var _this = this;
    wx.showNavigationBarLoading();
    wx.login({
      success: function (res) {
        if (res.code) {
          //调用函数获取微信用户信息
          _this.getUserInfo(function (info) {
            _this.saveCache('userinfo', info);
            _this.user.wxinfo = info.userInfo;
            if (!info.encryptedData || !info.iv) {
              _this.g_status = '无关联AppID';
              typeof response == "function" && response(_this.g_status);
              return;
            }
            //发送code与微信用户信息，获取学生数据
            wx.request({
              method: 'POST',
              url: _this.server + '/api/users/get_info',
              data: {
                code: res.code,
                key: info.encryptedData,
                iv: info.iv,
                rawData: info.rawData,
                signature: info.signature
              },
              success: function (res) {
                if (res.data.msg != 'error' && res.statusCode >= 200 && res.statusCode < 400) {
                  var status = false, data = res.data.msg;
                  //判断缓存是否有更新
                  if (_this.cache.version !== _this.version || _this.cache.userdata !== data) {
                    _this.saveCache('version', _this.version);
                    _this.saveCache('userdata', data);
                    _this.processData(data);
                    status = true;
                  }
                  // 未绑定，跳转到登录
                  if (!_this.user.is_bind) {
                    wx.navigateTo({
                      url: '/pages/more/login'
                    });
                  }
                  //如果缓存有更新，则执行回调函数
                  if (status) {
                    typeof response == "function" && response();
                  }
                } else {
                  //清除缓存
                  if (_this.cache) {
                    _this.cache = {};
                    wx.clearStorage();
                  }
                  typeof response == "function" && response(res.data.message || '加载失败');
                }
              },
              fail: function (res) {
                var status = '';
                // 判断是否有缓存
                console.warn(res);
                if (_this.cache.version === _this.version) {
                  status = '离线缓存模式';
                } else {
                  status = '网络错误';
                }
                _this.g_status = status;
                typeof response == "function" && response(status);
                console.warn(status);
              },
              complete: function () {
                wx.hideNavigationBarLoading();
              }

            });
          });
        }
        else {
          console.log('获取用户登录态失败！' + res.errMsg)
        }
      }
    });
  },
  getUserInfo: function (cb) {
    var _this = this;
    //获取微信用户信息
    wx.getUserInfo({
      success: function (res) {
        typeof cb == "function" && cb(res);
      },
      fail: function (res) {
        _this.showErrorModal('已拒绝授权，小程序无法正常运行', '授权失败');
        _this.g_status = '未授权';
      }
    });
  },
  processData: function (msg) {
    var _this = this;
    _this.user.wxinfo.id = msg.session_id;
    _this.user.school.weeknum = msg.school.weeknum;
    _this.user.school.weekday = msg.school.weekday;
    _this.user.school.term = msg.school.term;
    _this.user.is_bind = msg.is_bind;
    _this.user.is_bind_mealcard = msg.is_bind_mealcard;
    _this.user.is_bind_library = msg.is_bind_library;
    _this.banner_show = msg.show_banner;
    _this.user.is_admin = msg.is_admin;
    _this.user.is_teacher = msg.is_teacher;
    if (msg.is_bind) {
      if (msg.is_teacher && msg.teacher) {
        _this.user.teacher = msg.teacher;
      }
      else {
        _this.user.student.name = msg.student.realname;
        _this.user.student.class = msg.student.classname;
        _this.user.student.id = msg.student.studentid;
        _this.user.student.grade = msg.student.studentid.substr(0, 4);
        _this.user.student.dept = msg.student.dept;
        _this.user.student.specialty = msg.student.specialty;
      }
    }
    _this._t = msg.session_id;
  },
  showErrorModal: function (content, title) {
    wx.showModal({
      title: title || '加载失败',
      content: content || '未知错误',
      confirmColor: "#1f7bff",
      showCancel: false
    });
  },
  showLoadToast: function (title, duration) {
    wx.showToast({
      title: title || '加载中',
      icon: 'loading',
      mask: true,
      duration: duration || 10000
    });
  },
  cache: {},
  server: require('config').server,
  user: {
    //微信数据
    wxinfo: {},
    //学生数据
    student: {},
    //教师数据
    teacher: {},
    //学校参数
    school: {}
  },
  banner_show: false,
  util: require('./utils/util')
})