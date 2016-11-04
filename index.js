/**/ void function(scope) {
/**/
/**/   // CommonJS
/**/   if (typeof module === 'object' && !!module.exports) return scope(function(name, dependencies, factory) {
/**/     if (typeof name !== 'string') factory = dependencies, dependencies = name, name = null;
/**/     if (!(dependencies instanceof Array)) factory = dependencies, dependencies = [];
/**/     var args;
/**/     args = [ require('FCeptor'), require('XCeptor') ];
/**/     module.exports = factory.apply(module.exports, args) || module.exports;
/**/   });
/**/
/**/   // AMD, wrap a 'String' to avoid warn of fucking webpack
/**/   if (String(typeof define) === 'function' && !!define.amd) return scope(define);
/**/
/**/   // Global
/**/   scope(function(name, dependencies, factory) {
/**/     if (typeof name !== 'string') factory = dependencies, dependencies = name, name = null;
/**/     if (!(dependencies instanceof Array)) factory = dependencies, dependencies = [];
/**/     var exports = {};
/**/     var args = [];
/**/     for (var i = 0; i < dependencies.length; i++) args[i] = window[dependencies[i]];
/**/     exports = factory.apply(exports, args) || exports;
/**/     if (name) {
/**/       /**/ try { /* Fuck IE8- */
/**/       /**/   if (typeof execScript === 'object') execScript('var ' + name);
/**/       /**/ } catch(error) {}
/**/       window[name] = exports;
/**/     }
/**/   });
/**/
/**/ }(function(define) {

define([ 'FCeptor', 'XCeptor' ], function(FCeptor, XCeptor) {

  var MAX_SIZE = 2 * 1024 * 1024;

  var Noodles = function() {
    var i;
    // Cache instance untial next tick
    if (Noodles.cache) return Noodles.cache;
    Noodles.cache = this;
    setTimeout(function() { Noodles.cache = null; });
    // Get noodles info from localStorage keys
    var noodles = this.noodles = [];
    this.total = 0;
    var length = localStorage.length;
    for (i = 0; i < length; i++) {
      var matches = localStorage.key(i).match(/^\[pocket-noodles\]\[(.*?)\]\[(.*?)\]\[(.*?)\]/);
      var date = new Date(matches[1]);
      var size = decodeURIComponent(matches[2]);
      var url = decodeURIComponent(matches[3]);
      noodles[url] = matches[0];
      noodles.push({ date: date, url: url, size: size });
      noodles.sort(function(a, b) { return a - b; });
      this.total += +size;
    }
  };

  // Remove oldest item
  Noodles.prototype.pop = function() {
    var item = this.noodles.pop();
    this.total -= item.size;
    localStorage.removeItem(this.noodles[item.url]);
    delete this.noodles[item.url];
  };

  // Create a new item
  Noodles.prototype.push = function(url, data) {
    var encodedUrl = encodeURIComponent(url);
    var date = new Date().toISOString();
    var size = data.length;
    var key = '[pocket-noodles][' + date + '][' + size + '][' + encodedUrl + ']';
    this.remove(url);
    while (this.total + size > MAX_SIZE) this.pop();
    this.noodles.unshift({ date: date, url: url, size: size });
    this.noodles[url] = key;
    localStorage.setItem(key, data);
  };

  // Remove specified item
  Noodles.prototype.remove = function(url) {
    localStorage.removeItem(this.noodles[url]);
    delete this.noodles[url];
  };

  // Get specified item
  Noodles.prototype.get = function(url) {
    return localStorage.getItem(this.noodles[url]);
  };

  Noodles.save = function(url, data) {
    new this().push(url, JSON.stringify(data));
  };

  Noodles.load = function(url) {
    return JSON.parse(new this().get(url));
  };

  // Inject the fetch api
  if (FCeptor) {
    FCeptor.get(/^/, null, function(ctx) {
      if (ctx.request.method !== 'GET') return; // Only GET
      var type = ctx.response.headers.get('Content-Type');
      if (!/\bjson\b/i.test(type)) return; // Only json
      var url = ctx.request.url;
      var status = ctx.response.status;
      if (status < 400) {
        // Get all headers
        var headers = {};
        ctx.response.headers.forEach(function(value, key) {
          headers[key] = value;
        });
        // Get body and save
        ctx.response.clone().text().then(function(body) {
          Noodles.save(url, { status: status, headers: headers, body: body });
        });
      } else if (status >= 500) {
        // Async throw an error
        setTimeout(function() {
          throw new Error('Load "' + url + '" with fetch ' + status + ' fallback to pocket-noodles.');
        });
        // Load from cache
        var cache = Noodles.load(url);
        if (cache) {
          ctx.response = new Response(cache.body, { status: cache.status, headers: new Headers(cache.headers) });
        }
      }
    });
  }

  // Inject XHR
  if (XCeptor) {
    XCeptor.get(/^/, null, function(req, res) {
      var i;
      if (req.method !== 'GET') return; // Only GET
      var headers = {};
      var type;
      for (i = 0; i < res.headers.length; i++) {
        headers[res.headers[i].header.toLowerCase()] = res.headers[i].value;
      }
      type = headers['content-type'];
      if (!/\bjson\b/i.test(type)) return; // Only json
      var url = req.url;
      var status = res.status;
      if (status < 400) {
        Noodles.save(url, { status: status, headers: headers, body: res.responseText });
      } else if (status >= 500) {
        setTimeout(function() {
          throw new Error('Load "' + url + '" with XHR ' + status + ' fallback to pocket-noodles.');
        });
        var cache = Noodles.load(url);
        if (cache) {
          res.responseText = cache.body;
          res.status = 200;
          res.headers = [];
          for (i in cache.headers) {
            res.headers.push({ header: i, value: cache.headers[i] });
          }
        }
      }
    });
  }

});

/**/ });
