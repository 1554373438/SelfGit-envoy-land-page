(function() {
  var ua = navigator.userAgent.toLowerCase();
  var isAndroid = ua.toLowerCase().indexOf('android') > -1 || ua.toLowerCase().indexOf('adr') > -1;
  var isWeiXin = /micromessenger/.test(ua);
  var balance = getSearch()['balance'] || '';

  var $http = new http();
  var timer, odEl, listTimer;

  var vm = new Vue({
    el: '#app',
    data: {
      hasBalance: false,
      waiting: true,
      amount: '',
      invitees: [],
      getListCount: 0
    },
    methods: {
      init: function() { //初始化
        var _this = this;
        if (+balance) {
          vm.hasBalance = true;
          setTimeout(function() {
            odEl = document.getElementById('odometer');
          }, 0)
          vm.odometerFn();
          _this.getList();
          return;
        }
      },

      download: function() {
        _czc.push(["_trackEvent", "注册成功页", "点击", "第一个下载按钮"]);
        if (isWeiXin) {
          window.location.href = "https://m.nonobank.com/appdown/downapp.html?type=nonobank";
          return;
        }
        if (isAndroid) {
          window.location.href = "https://m.nonobank.com/appdown/nonobank.apk"
          return;
        }
        window.location.href = "https://itunes.apple.com/cn/app/nuo-nuo-bang-ke/id982437433?mt=8"
      },

      getList: function() {
        if (vm.getListCount >= 2) {
          vm.amount = 0;
          vm.invitees = [];
          vm.clearTimer();
          return;
        }
        vm.getListCount++;
        // console.log('count',vm.getListCount);
        $http.get('/activity/nono-envoy/registerSuccessInvoke', { isJwt: true }).then(function(res) {
          if (res && res.succeed) {
            var data = res.data;
            vm.amount = data.amount;
            vm.waiting = data.waiting;
            vm.invitees = data.invitees;

            if (data.invitees.length) {
              for (var i = 0; i < data.invitees.length; i++) {
                data.invitees[i].mobile = vm.splicePhone(String(data.invitees[i].mobile));
              }
            }

            if (vm.waiting) {
              listTimer = setTimeout(function() {
                vm.getList();
              }, 10000)
            } else {
              vm.clearTimer(vm.amount);
            }
          }
        });
      },

      splicePhone: function(nums) {
        var reg = /(\d{3})\d{4}(\d{4})/;
        var _num = nums.replace(reg, '$1****$2');
        return _num;
      },

      gotoTop: function() {
        _czc.push(["_trackEvent", "注册成功页", "点击", "第二个下载按钮"]);
        document.getElementById('banner').scrollIntoView();
      },

      odometerFn: function() {
        timer = setInterval(function() {
          odEl.innerHTML = 0;
          setTimeout(function() {
            odEl.innerHTML = 888;
          }, 0);
        }, 500);
      },

      clearTimer: function(amount) {
        odEl.innerHTML = amount || 0;
        clearInterval(timer);
        clearTimeout(listTimer);
        timer = null;
        listTimer = null;
        setTimeout(function() {
          odEl.innerHTML = amount || 0;
        }, 1000);
      }

    }
  });
  vm.init();





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

})();
