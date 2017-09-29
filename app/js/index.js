(function() {
  // var HOST = /nonobank.com|mxdsite.com/.test(location.host) ? (location.protocol + '//' + location.host + (location.port ? ':' + location.port : '')) : 'https://m.sit.nonobank.com';

  var ua = navigator.userAgent.toLowerCase(), imgSessionId;
  var isAndroid = ua.toLowerCase().indexOf('android') > -1 || ua.toLowerCase().indexOf('adr') > -1;
  var isWeiXin = /micromessenger/.test(ua);

  var am_id = getSearch()['am_id'] || getSearch()['utm_source'] || '';
  var approach = getSearch()['approach'] || getSearch()['utm_term'] || '';
  var approach2 = getSearch()['approach2'] || getSearch()['utm_content'] || '';
  var approach3 = getSearch()['approach3'] || getSearch()['utm_campaign'] || '';
  var landing_page = getSearch()['landing_page'] || 'nonobank';

  var inviteMobile = getSearch()['mobile'] || '';
  var regtime = getSearch()['regtime'] || '';
  var balance = getSearch()['balance'] || '';

  var errortype = 0; //0: 无错 1、手机号错误 2、验证码错误 3、手机号已经注册
  var uuid, timer = null, codeSentTime = 0, tokenId = localStorage.getItem('tongdun_token');

  var $http = new http();

  Vue.component('loading', {
    props: {
      show: {
        type: Boolean,
        default: false
      },
    },
    template: "<section class='popup row row-center' v-if='show'><span class='loading row row-center'><img src='images/loading.gif' width='26'></span></section>",
  });

  Vue.directive('focus', {
    inserted: function (el, binding) {
      if(binding.value){
        el.focus();
      }
    },
    componentUpdated: function(el, binding) {
      if (binding.modifiers.lazy) {
        if (Boolean(binding.value) === Boolean(binding.oldValue)) {
          return;
        }
      }
      if (binding.value) {
        el.focus();
      }
    },
  });

  var vm = new Vue({
    el: '#app',
    data: {
      user: {
        phone: '',
        codeImg: '',
        codeMsg:'',
        agreement: true
      },

      imgSrc:'',
      timeCount: -1,

      isImgCode:false,
      limTime:false,
      isWelfare:false,

      errorMsg:'',
      focusStatus: 0, //1、图形验证码聚焦  2、短信验证码聚焦  3、手机聚焦  

      jwt:'',
      amount:'',
      invitees:[],
      isLoading: false
    },
    watch:{
      'user.phone': function(val, oldval) {
        vm.focusStatus = 0;
        errortype = 0;
        if(val.length == 11){
          vm.checkPhone();
          if(errortype == 0){
            $http.get('/common/check/mobile/' + val, {silence:true}).then(function(res) {
              if(res.succeed){
                if(res.data.exists){
                  vm.errorMsg = '*手机号已注册';
                  errortype = 3;
                } else {
                  errortype = 0;
                  vm.focusStatus = 1;
                }
              }  
            });
          }
        }
        if(codeSentTime >= 1){
          codeSentTime = 0;
          vm.focusStatus = 0;
          vm.user.codeImg = '';
          vm.user.codeMsg = '';
          vm.timeCount = -1;
          setTimeout(function(){
            clearTimeout(timer);
            vm.refreshCaptcha();
          },0);
        }
      },
      'user.codeImg': function(val, oldval){
        if(val.length == 4){
          vm.focusStatus = 0;
          vm.checkPhone();
          if(errortype == 0){
            var params = {
              uuid: uuid,
              captcha: val
            };
            $http.get('/common/captcha/verify', {
              params: params,
              silence:true
            }).then(function(res) {
              if(res && res.succeed){
                if (res.data.valid) {
                  vm.getCode();
                } else {
                  vm.errorMsg = '*请输入正确的验证码';
                  vm.refreshCaptcha();
                }
              }
            });
          } else {
            vm.user.codeImg = '';
            vm.focusStatus = 3;
            if(vm.timeCount == -1) {
              vm.refreshCaptcha();
            }
            
          }
        }
      }


    },

    methods: {
      init: function() { //初始化
        var _this = this;
        if(+regtime >= 100){     
          _this.limTime = regtime;
        }
        if(+balance > 0){
          _this.isWelfare = true;
        } 
        this.getTime();
      },

      getTime: function(){
        $http.get('/common/current', {isTime:true}).then(function(res) {
          if (res.succeed) {
            vm.setTime(res.data.timestamp);
            vm.refreshCaptcha();
          }
        });
      },

      setTime: function(timeSys){
        var offsetTime = timeSys - Date.now();
        setSession('invite-offsetTime', offsetTime);
      },

      refreshCaptcha: function() {
        vm.user.codeImg = '';
        $http.get('/common/captcha',{silence:true}).then(function(res) {
          if(res.succeed){
            var data = res.data;
            vm.imgSrc = data.captcha;
            uuid = data.uuid;
          } else {
            vm.errorMsg = res.errorMessage;
          }
        });
      },

      checkPhone: function(){
        var req = /1[345789]\d{9}$/;
        if(!this.user.phone.length){
          this.errorMsg = '*请输入手机号';
          errortype = 1;
          return;
        }
        if(!req.test(this.user.phone)){
          this.errorMsg = '*请输入正确的手机号';
          errortype = 1;
          return;
        }
        if (errortype == 3) {
          this.errorMsg = '*手机号已注册';
        }
        
      },

      clearError: function(){
        this.errorMsg = '';
      },

      countDown: function(t) { //倒计时
        this.focusStatus = 0;
        if (t >= 0) {
          vm.timeCount = t;
          t--;
          timer = setTimeout(function() {
            vm.countDown(t);
          }, 1000);
        }
      },

      getCode: function(){
        var params = {
          mobile: vm.user.phone,
          captcha: vm.user.codeImg,
          uuid: uuid,
          codeType: 0,
          tokenId: tokenId
        }
        $http.post('/user/v-code',params,{silence:true}).then(function(res) {
          if(res && res.succeed){
            codeSentTime += 1;
            vm.timeCount = 60;
            vm.countDown(vm.timeCount);
            setTimeout(function(){
              vm.focusStatus = 2;
            },100);
          } else {
            codeSentTime = 0;
            vm.focusStatus = 1;
            vm.user.codeImg = '';
            vm.user.codeMsg = '';
            vm.timeCount = -1;
            setTimeout(function(){
              clearTimeout(timer);
              vm.refreshCaptcha();
            },0);
          }
        });
      },  
      doRegister: function(){
        var params = {
          inviteMobile: inviteMobile,
          mobile: vm.user.phone,
          vcode: vm.user.codeMsg,
          tokenId: tokenId,
          uuid: uuid,
          captcha: vm.user.codeImg,
          amId: am_id,
          approach: approach,
          approach2: approach2,
          approach3: approach3
        }
        $http.post('/user/register',params).then(function(res) {
          if(res.succeed){
            setSession('invite-jwt',res.data.jwt);
            debugger;
            // location.href = 'regsuccess.html?balance='+ balance;
          } else if(res.errorCode == '0100154'){
            vm.errorMsg = '*请输入正确的验证码';
          } else {
            vm.errorMsg = res.errorMessage;
          }
        });
      },

      submit:function(){
        _czc.push(["_trackEvent", "注册页", "点击", "领取按钮"]);

        vm.checkPhone();

        if(errortype != 0){
          return;
        }
        if(this.user.codeImg.length < 4 || this.user.codeMsg.length < 4){
          vm.errorMsg = '*请输入正确的验证码';
          return;
        } 
        if(!this.user.agreement){
          vm.errorMsg = '*请阅读并勾选相关协议';
          return;
        }
        vm.doRegister();
      },

      goRegPrivacy:function(){
        location.href = 'regprivacy.html';
      }

    }
  });
  vm.init();

  function setSession(name, value) {
    try {
      if(typeof value === 'object') {
        value = JSON.stringify(value);
      }
      window.sessionStorage.setItem(name, value);
    } catch (error) {
      Storage.prototype._setItem = Storage.prototype.setItem;
      Storage.prototype.setItem = function() {};
      alert('请不要在无痕模式下打开');
    }
  }


  function getSearch() {
    if (window.location.search == '') {
      return false;
    }
    var query_string = {},
      query = window.location.search.substring(1),
      vars = query.split("&");

    for (var i = 0; i < vars.length; i++) {
      var pair = vars[i].split("=");
      // If first entry with this name
      if (typeof query_string[pair[0]] === "undefined") {
        query_string[pair[0]] = decodeURIComponent(pair[1]);
        // If second entry with this name
      } else if (typeof query_string[pair[0]] === "string") {
        var arr = [query_string[pair[0]], decodeURIComponent(pair[1])];
        query_string[pair[0]] = arr;
        // If third or later entry with this name
      } else {
        query_string[pair[0]].push(decodeURIComponent(pair[1]));
      }
    }

    return query_string;
  }

  //事件监听
  function eventListener(type, handler){
    if(document.addEventListener){
      document.addEventListener(type, function(e){handler(e)}, false);
    } else {
      document.attachEvent('on' + type, function(e){handler(e)});
    }
  }

  function handler(e) {
    vm.toastMsg = e.detail;
    vm.isLoading = false;
    
  }

  eventListener('loading', function() {
    vm.isLoading = true;
  });

  eventListener('loaded', function() {
    vm.isLoading = false;
  });

  eventListener('error', handler);


})();
