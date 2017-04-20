function http(options){
  options = options || {};

  var TEST_HOST = 'https://m.sit.nonobank.com';
  var HOST = /nonobank.com|mingxiaodai.com/.test(location.host) ? (location.protocol + '//' + location.host + (location.port ? ':' + location.port : '')) : TEST_HOST;
  HOST += '/feserver';

  var instance = axios.create({
    baseURL: options.host || HOST,
    timeout: options.timeout || 5000
  });

  var loading = new Event('loading'), loaded = new Event('loaded');
  
  instance.defaults.headers.common['Content-Type'] = 'application/json';

  // Add a request interceptor
  instance.interceptors.request.use(function(config) {

    // Do something before request is sent

    if(config.isJwt){
      var jwt = sessionStorage.getItem('invite-jwt');
      config.headers.jwt = jwt;
    }

    if (!config.silence) {
      document.dispatchEvent(loading);
    }
    if (!config.isTime){
      var encryptSign = new EncryptSign();
      if(config.method == 'get'){
        config.params = encryptSign.sign(config.params);
      } else {
        config.data = encryptSign.sign(config.data);
      }
    }
    return config;
  }, function(error) {
    // Do something with request error
    return Promise.reject(error);
  });

  // Add a response interceptor
  instance.interceptors.response.use(function(response) {
    // Do something with response data
    document.dispatchEvent(loaded);
    return response.data; 
  }, function(error) {
    // Do something with response error
    var error = new CustomEvent('error', {'detail': '网络不给力呦~'});
    
    
    if(error.response && error.response.status === 404) {
      document.dispatchEvent(error);
      return;
    }
    if(error.response == undefined){
      document.dispatchEvent(error);
      return;
    } 
    return Promise.reject(error);
  });

  return instance;
}



