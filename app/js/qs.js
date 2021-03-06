(function() {
  if (!Array.isArray) {
    Array.isArray = function(arg) {
      return Object.prototype.toString.call(arg) === '[object Array]';
    };
  }

  function format() {
    var replace = String.prototype.replace;
    var percentTwenties = /%20/g;

    return {
      'default': 'RFC3986',
      formatters: {
        RFC1738: function(value) {
          return replace.call(value, percentTwenties, '+');
        },
        RFC3986: function(value) {
          return value;
        }
      },
      RFC1738: 'RFC1738',
      RFC3986: 'RFC3986'
    };
  }

  function utils() {
    var self = this;
    var has = Object.prototype.hasOwnProperty;

    var hexTable = (function() {
      var array = [];
      for (var i = 0; i < 256; ++i) {
        array.push('%' + ((i < 16 ? '0' : '') + i.toString(16)).toUpperCase());
      }

      return array;
    }());

    self.arrayToObject = function(source, options) {
      var obj = options && options.plainObjects ? Object.create(null) : {};
      for (var i = 0; i < source.length; ++i) {
        if (typeof source[i] !== 'undefined') {
          obj[i] = source[i];
        }
      }

      return obj;
    };

    self.merge = function(target, source, options) {
      if (!source) {
        return target;
      }

      if (typeof source !== 'object') {
        if (Array.isArray(target)) {
          target.push(source);
        } else if (typeof target === 'object') {
          if (options.plainObjects || options.allowPrototypes || !has.call(Object.prototype, source)) {
            target[source] = true;
          }
        } else {
          return [target, source];
        }

        return target;
      }

      if (typeof target !== 'object') {
        return [target].concat(source);
      }

      var mergeTarget = target;
      if (Array.isArray(target) && !Array.isArray(source)) {
        mergeTarget = self.arrayToObject(target, options);
      }

      if (Array.isArray(target) && Array.isArray(source)) {
        source.forEach(function(item, i) {
          if (has.call(target, i)) {
            if (target[i] && typeof target[i] === 'object') {
              target[i] = self.merge(target[i], item, options);
            } else {
              target.push(item);
            }
          } else {
            target[i] = item;
          }
        });
        return target;
      }

      return Object.keys(source).reduce(function(acc, key) {
        var value = source[key];

        if (Object.prototype.hasOwnProperty.call(acc, key)) {
          acc[key] = self.merge(acc[key], value, options);
        } else {
          acc[key] = value;
        }
        return acc;
      }, mergeTarget);
    };

    self.decode = function(str) {
      try {
        return decodeURIComponent(str.replace(/\+/g, ' '));
      } catch (e) {
        return str;
      }
    };

    self.encode = function(str) {
      // This code was originally written by Brian White (mscdex) for the io.js core querystring library.
      // It has been adapted here for stricter adherence to RFC 3986
      if (str.length === 0) {
        return str;
      }

      var string = typeof str === 'string' ? str : String(str);

      var out = '';
      for (var i = 0; i < string.length; ++i) {
        var c = string.charCodeAt(i);

        if (
          c === 0x2D || // -
          c === 0x2E || // .
          c === 0x5F || // _
          c === 0x7E || // ~
          (c >= 0x30 && c <= 0x39) || // 0-9
          (c >= 0x41 && c <= 0x5A) || // a-z
          (c >= 0x61 && c <= 0x7A) // A-Z
        ) {
          out += string.charAt(i);
          continue;
        }

        if (c < 0x80) {
          out = out + hexTable[c];
          continue;
        }

        if (c < 0x800) {
          out = out + (hexTable[0xC0 | (c >> 6)] + hexTable[0x80 | (c & 0x3F)]);
          continue;
        }

        if (c < 0xD800 || c >= 0xE000) {
          out = out + (hexTable[0xE0 | (c >> 12)] + hexTable[0x80 | ((c >> 6) & 0x3F)] + hexTable[0x80 | (c & 0x3F)]);
          continue;
        }

        i += 1;
        c = 0x10000 + (((c & 0x3FF) << 10) | (string.charCodeAt(i) & 0x3FF));
        out += hexTable[0xF0 | (c >> 18)] + hexTable[0x80 | ((c >> 12) & 0x3F)] + hexTable[0x80 | ((c >> 6) & 0x3F)] + hexTable[0x80 | (c & 0x3F)]; // eslint-disable-line max-len
      }

      return out;
    };

    self.compact = function(obj, references) {
      if (typeof obj !== 'object' || obj === null) {
        return obj;
      }

      var refs = references || [];
      var lookup = refs.indexOf(obj);
      if (lookup !== -1) {
        return refs[lookup];
      }

      refs.push(obj);

      if (Array.isArray(obj)) {
        var compacted = [];

        for (var i = 0; i < obj.length; ++i) {
          if (obj[i] && typeof obj[i] === 'object') {
            compacted.push(self.compact(obj[i], refs));
          } else if (typeof obj[i] !== 'undefined') {
            compacted.push(obj[i]);
          }
        }

        return compacted;
      }

      var keys = Object.keys(obj);
      keys.forEach(function(key) {
        obj[key] = self.compact(obj[key], refs);
      });

      return obj;
    };

    self.isRegExp = function(obj) {
      return Object.prototype.toString.call(obj) === '[object RegExp]';
    };

    self.isBuffer = function(obj) {
      if (obj === null || typeof obj === 'undefined') {
        return false;
      }

      return !!(obj.constructor && obj.constructor.isBuffer && obj.constructor.isBuffer(obj));
    };

    return self;
  }

  function stringify() {
    var formats = format();
    var _utils = utils();
    var arrayPrefixGenerators = {
      brackets: function brackets(prefix) { // eslint-disable-line func-name-matching
        return prefix + '[]';
      },
      indices: function indices(prefix, key) { // eslint-disable-line func-name-matching
        return prefix + '[' + key + ']';
      },
      repeat: function repeat(prefix) { // eslint-disable-line func-name-matching
        return prefix;
      }
    };

    var toISO = Date.prototype.toISOString;

    var defaults = {
      delimiter: '&',
      encode: true,
      encoder: _utils.encode,
      encodeValuesOnly: false,
      serializeDate: function serializeDate(date) { // eslint-disable-line func-name-matching
        return toISO.call(date);
      },
      skipNulls: false,
      strictNullHandling: false
    };

    var stringify = function stringify( // eslint-disable-line func-name-matching
      object,
      prefix,
      generateArrayPrefix,
      strictNullHandling,
      skipNulls,
      encoder,
      filter,
      sort,
      allowDots,
      serializeDate,
      formatter,
      encodeValuesOnly
    ) {
      var obj = object;
      if (typeof filter === 'function') {
        obj = filter(prefix, obj);
      } else if (obj instanceof Date) {
        obj = serializeDate(obj);
      } else if (obj === null) {
        if (strictNullHandling) {
          return encoder && !encodeValuesOnly ? encoder(prefix) : prefix;
        }

        obj = '';
      }

      if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean' || _utils.isBuffer(obj)) {
        if (encoder) {
          var keyValue = encodeValuesOnly ? prefix : encoder(prefix);
          return [formatter(keyValue) + '=' + formatter(encoder(obj))];
        }
        return [formatter(prefix) + '=' + formatter(String(obj))];
      }

      var values = [];

      if (typeof obj === 'undefined') {
        return values;
      }

      var objKeys;
      if (Array.isArray(filter)) {
        objKeys = filter;
      } else {
        var keys = Object.keys(obj);
        objKeys = sort ? keys.sort(sort) : keys;
      }

      for (var i = 0; i < objKeys.length; ++i) {
        var key = objKeys[i];

        if (skipNulls && obj[key] === null) {
          continue;
        }

        if (Array.isArray(obj)) {
          values = values.concat(stringify(
            obj[key],
            generateArrayPrefix(prefix, key),
            generateArrayPrefix,
            strictNullHandling,
            skipNulls,
            encoder,
            filter,
            sort,
            allowDots,
            serializeDate,
            formatter,
            encodeValuesOnly
          ));
        } else {
          values = values.concat(stringify(
            obj[key],
            prefix + (allowDots ? '.' + key : '[' + key + ']'),
            generateArrayPrefix,
            strictNullHandling,
            skipNulls,
            encoder,
            filter,
            sort,
            allowDots,
            serializeDate,
            formatter,
            encodeValuesOnly
          ));
        }
      }

      return values;
    };

    return function(object, opts) {
      var obj = object;
      var options = opts || {};

      if (options.encoder !== null && options.encoder !== undefined && typeof options.encoder !== 'function') {
        throw new TypeError('Encoder has to be a function.');
      }

      var delimiter = typeof options.delimiter === 'undefined' ? defaults.delimiter : options.delimiter;
      var strictNullHandling = typeof options.strictNullHandling === 'boolean' ? options.strictNullHandling : defaults.strictNullHandling;
      var skipNulls = typeof options.skipNulls === 'boolean' ? options.skipNulls : defaults.skipNulls;
      var encode = typeof options.encode === 'boolean' ? options.encode : defaults.encode;
      var encoder = typeof options.encoder === 'function' ? options.encoder : defaults.encoder;
      var sort = typeof options.sort === 'function' ? options.sort : null;
      var allowDots = typeof options.allowDots === 'undefined' ? false : options.allowDots;
      var serializeDate = typeof options.serializeDate === 'function' ? options.serializeDate : defaults.serializeDate;
      var encodeValuesOnly = typeof options.encodeValuesOnly === 'boolean' ? options.encodeValuesOnly : defaults.encodeValuesOnly;
      if (typeof options.format === 'undefined') {
        options.format = formats.default;
      } else if (!Object.prototype.hasOwnProperty.call(formats.formatters, options.format)) {
        throw new TypeError('Unknown format option provided.');
      }
      var formatter = formats.formatters[options.format];
      var objKeys;
      var filter;

      if (typeof options.filter === 'function') {
        filter = options.filter;
        obj = filter('', obj);
      } else if (Array.isArray(options.filter)) {
        filter = options.filter;
        objKeys = filter;
      }

      var keys = [];

      if (typeof obj !== 'object' || obj === null) {
        return '';
      }

      var arrayFormat;
      if (options.arrayFormat in arrayPrefixGenerators) {
        arrayFormat = options.arrayFormat;
      } else if ('indices' in options) {
        arrayFormat = options.indices ? 'indices' : 'repeat';
      } else {
        arrayFormat = 'indices';
      }

      var generateArrayPrefix = arrayPrefixGenerators[arrayFormat];

      if (!objKeys) {
        objKeys = Object.keys(obj);
      }

      if (sort) {
        objKeys.sort(sort);
      }

      for (var i = 0; i < objKeys.length; ++i) {
        var key = objKeys[i];

        if (skipNulls && obj[key] === null) {
          continue;
        }

        keys = keys.concat(stringify(
          obj[key],
          key,
          generateArrayPrefix,
          strictNullHandling,
          skipNulls,
          encode ? encoder : null,
          filter,
          sort,
          allowDots,
          serializeDate,
          formatter,
          encodeValuesOnly
        ));
      }

      return keys.join(delimiter);
    };

  }

  var qs = {
    stringify: stringify()
  }

  window.qs = qs;
})();
