(function() {
  var vm = new Vue({
    el: '#app',
    data: {
      regContent:'',
      isLoading: false,
      toastMsg: ''
    },
    methods: {
      init: function() {
        $http = new http();
        var params = {
          bizCode: 0
        };
        $http.get('/common/agreement/privacy',{
          params: params,
          silence:true
        }).then(function(res) {
          if(res.succeed){
            vm.regContent = res.data && res.data.content;
          } else {
            vm.toastMsg = res.errorMessage;
          }
        });
      },
      hide: function() {
        vm.toastMsg = '';
      }
    }
  });

  vm.init();

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
