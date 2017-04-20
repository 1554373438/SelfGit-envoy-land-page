(function(){
  function alphabeticalSort(a, b) {
    return a.localeCompare(b);
  }

  function getSession(name) {
    var data = sessionStorage.getItem(name);
    try {
      return JSON.parse(data);
    } catch(e) {
      return data;
    }
  }


  function EncryptSign(){
    this.keyName = [
      [115, 105, 103, 110, 97, 116, 117, 114, 101],
      [110, 111, 110, 99, 101, 115, 116, 114],
      [97, 112, 112, 73, 100],
      [116, 105, 109, 101, 115, 116, 97, 109, 112]
    ];
  }

  EncryptSign.prototype.getKeyName = function(idx) {
    var ret = '';
    for (var i = 0; i < this.keyName[idx].length; i++) {
      ret += String.fromCharCode(this.keyName[idx][i]);
    }
    return ret;
  };

  EncryptSign.prototype.sign = function(object){
    object = object || {};

    object[this.getKeyName(1)] = Math.random().toString(36).substr(2, 15);
    object[this.getKeyName(3)] = Date.now() + +(getSession('invite-offsetTime'));

    var string = qs.stringify(object, { allowDots: true, arrayFormat: 'repeat', sort: alphabeticalSort, encode: true});
    object[this.getKeyName(2)] = 'nono';
    string += md5(object[this.getKeyName(2)]).substr(7, 16);

    object[this.getKeyName(0)] = md5(string);
    return object;
  }
  window.EncryptSign = EncryptSign;

})();
