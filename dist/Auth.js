// modules are defined as an array
// [ module function, map of requires ]
//
// map of requires is short require name -> numeric require
//
// anything defined in a previous bundle is accessed via the
// orig method which is the require for previous bundles
parcelRequire = (function (modules, cache, entry, globalName) {
  // Save the require from previous bundle to this closure if any
  var previousRequire = typeof parcelRequire === 'function' && parcelRequire;
  var nodeRequire = typeof require === 'function' && require;

  function newRequire(name, jumped) {
    if (!cache[name]) {
      if (!modules[name]) {
        // if we cannot find the module within our internal map or
        // cache jump to the current global require ie. the last bundle
        // that was added to the page.
        var currentRequire = typeof parcelRequire === 'function' && parcelRequire;
        if (!jumped && currentRequire) {
          return currentRequire(name, true);
        }

        // If there are other bundles on this page the require from the
        // previous one is saved to 'previousRequire'. Repeat this as
        // many times as there are bundles until the module is found or
        // we exhaust the require chain.
        if (previousRequire) {
          return previousRequire(name, true);
        }

        // Try the node require function if it exists.
        if (nodeRequire && typeof name === 'string') {
          return nodeRequire(name);
        }

        var err = new Error('Cannot find module \'' + name + '\'');
        err.code = 'MODULE_NOT_FOUND';
        throw err;
      }

      localRequire.resolve = resolve;
      localRequire.cache = {};

      var module = cache[name] = new newRequire.Module(name);

      modules[name][0].call(module.exports, localRequire, module, module.exports, this);
    }

    return cache[name].exports;

    function localRequire(x){
      return newRequire(localRequire.resolve(x));
    }

    function resolve(x){
      return modules[name][1][x] || x;
    }
  }

  function Module(moduleName) {
    this.id = moduleName;
    this.bundle = newRequire;
    this.exports = {};
  }

  newRequire.isParcelRequire = true;
  newRequire.Module = Module;
  newRequire.modules = modules;
  newRequire.cache = cache;
  newRequire.parent = previousRequire;
  newRequire.register = function (id, exports) {
    modules[id] = [function (require, module) {
      module.exports = exports;
    }, {}];
  };

  var error;
  for (var i = 0; i < entry.length; i++) {
    try {
      newRequire(entry[i]);
    } catch (e) {
      // Save first error but execute all entries
      if (!error) {
        error = e;
      }
    }
  }

  if (entry.length) {
    // Expose entry point to Node, AMD or browser globals
    // Based on https://github.com/ForbesLindesay/umd/blob/master/template.js
    var mainExports = newRequire(entry[entry.length - 1]);

    // CommonJS
    if (typeof exports === "object" && typeof module !== "undefined") {
      module.exports = mainExports;

    // RequireJS
    } else if (typeof define === "function" && define.amd) {
     define(function () {
       return mainExports;
     });

    // <script>
    } else if (globalName) {
      this[globalName] = mainExports;
    }
  }

  // Override the current require with this new one
  parcelRequire = newRequire;

  if (error) {
    // throw error from earlier, _after updating parcelRequire_
    throw error;
  }

  return newRequire;
})({"Auth.js":[function(require,module,exports) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var STORAGE = {
  AUTH_TOKEN: 'auth_token',
  PKCE_VERIFIER: 'auth_verifier'
};

var Auth = /*#__PURE__*/function () {
  function Auth(_ref) {
    var _this = this;

    var baseUrl = _ref.baseUrl,
        clientId = _ref.clientId,
        onLogin = _ref.onLogin;

    _classCallCheck(this, Auth);

    // this.token is now filled, either with an empty object or with tokens
    this.loadFromStorage(); // get the verifier from storage so we can send challenge

    this.refreshVerifier();
    this.baseUrl = baseUrl || 'https://operatoroverload.auth.us-west-2.amazoncognito.com';
    this.clientId = clientId || '47ile8emo7m8flnhjfuc5aa9i0';
    this.redirect_uri = "".concat(window.location.origin).concat(window.location.pathname);
    window.addEventListener('load', function () {
      var params = new window.URLSearchParams(window.location.search);
      _this.code = params.get('code');
      if (_this.code && onLogin) onLogin.call(_this);

      if (_this.code) {
        window.history.pushState({}, null, "".concat(window.location.origin).concat(window.location.pathname).concat(window.location.hash));
      }
    });
  }

  _createClass(Auth, [{
    key: "loadFromStorage",
    value: function loadFromStorage() {
      this.token = JSON.parse(window.localStorage.getItem(STORAGE.AUTH_TOKEN)) || {};
      return this.token;
    }
  }, {
    key: "refreshVerifier",
    value: function refreshVerifier() {
      var randomString = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
      // If caller provider randomString, replace the verifier,
      // otherwise just load it from storage
      this.verifier = randomString ? base64URLEncode(randomString) : window.localStorage.getItem(STORAGE.PKCE_VERIFIER);

      if (!this.verifier) {
        console.warn("cannot generate or load verifier string, probably first time using this app.  Welcome!"); // prime the store some something

        this.verifier = 'some random string';
      }

      window.localStorage.setItem(STORAGE.PKCE_VERIFIER, this.verifier);
      this.challenge = base64URLEncode(sha256(this.verifier));
    }
    /**
     * We get a token - only interested in the id_token
     */

  }, {
    key: "getToken",
    value: function getToken() {
      var _this2 = this;

      return new Promise(function (resolve, reject) {
        if (_this2.code) {
          _this2.authorize().then(function (t) {
            return resolve(t);
          }).catch(function (e) {
            return reject(e);
          }).finally(function () {
            return _this2.code = null;
          });
        } else if (_this2.token && _this2.token.id_token) {
          if (_this2.timeToExpiry() > 3570) {
            resolve(_this2.token.id_token);
          } else {
            _this2.refresh().then(function (t) {
              return resolve(t);
            }).catch(function (e) {
              return reject(e);
            });
          }
        } else {
          reject("cannot refresh and not auth code, should start login flow");
        }
      });
    }
  }, {
    key: "timeToExpiry",
    value: function timeToExpiry(id_token) {
      id_token = id_token || this.token.id_token;
      return JSON.parse(window.atob(id_token.split('.')[1])).exp - new Date().getTime() / 1000;
    }
  }, {
    key: "refresh",
    value: function refresh() {
      return this.tokenEndpoint({
        refresh_token: this.token.refresh_token
      });
    }
  }, {
    key: "authorize",
    value: function authorize() {
      return this.tokenEndpoint({
        code: this.code
      });
    }
  }, {
    key: "tokenEndpoint",
    value: function tokenEndpoint(_ref2) {
      var _this3 = this;

      var code = _ref2.code,
          refresh_token = _ref2.refresh_token;
      var grant_type = refresh_token ? 'refresh_token' : 'authorization_code';
      console.log("getting ".concat(grant_type));
      var body = ["client_id=".concat(this.clientId), "grant_type=".concat(grant_type), "redirect_uri=".concat(this.redirect_uri), refresh_token ? "refresh_token=".concat(refresh_token) : '', code ? "code=".concat(code) : '', "code_verifier=".concat(this.verifier)].join('&');
      return new Promise(function (resolve, reject) {
        window.fetch("".concat(_this3.baseUrl, "/oauth2/token"), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: body
        }).then(function (res) {
          return res.json();
        }).then(function (json) {
          console.log(json);

          if (json.error) {
            reject(json);
          } else {
            // save the token in storage and in the object
            Object.assign(_this3.token, json);
            window.localStorage.setItem(STORAGE.AUTH_TOKEN, JSON.stringify(_this3.token));
            resolve(json.id_token);
          }
        });
      });
    }
  }, {
    key: "login",
    value: function login() {
      var randomString = crypto.getRandomValues ? String.fromCharCode.apply(null, crypto.getRandomValues(new Uint8Array(10)).map(function (b) {
        return b % 26 + 97;
      })) : crypto.randomBytes(32);
      this.refreshVerifier(randomString);
      var loginUrl = ["".concat(this.baseUrl, "/login?client_id=").concat(this.clientId), "response_type=code", "scope=email+openid+profile", "code_challenge=".concat(this.challenge), "code_challenge_method=S256", "redirect_uri=".concat(this.redirect_uri)].join('&');
      window.location.href = loginUrl;
    }
  }]);

  return Auth;
}(); // Support functions


exports.default = Auth;

function base64URLEncode(str) {
  return str.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
} // from https://geraintluff.github.io/sha256/
// but modified to output base64


function sha256(ascii) {
  function rightRotate(value, amount) {
    return value >>> amount | value << 32 - amount;
  }

  ;
  var mathPow = Math.pow;
  var maxWord = mathPow(2, 32);
  var lengthProperty = 'length';
  var i, j; // Used as a counter across the whole file

  var words = [];
  var asciiBitLength = ascii[lengthProperty] * 8; //* caching results is optional - remove/add slash from front of this line to toggle
  // Initial hash value: first 32 bits of the fractional parts of the square roots of the first 8 primes
  // (we actually calculate the first 64, but extra values are just ignored)

  var hash = sha256.h = sha256.h || []; // Round constants: first 32 bits of the fractional parts of the cube roots of the first 64 primes

  var k = sha256.k = sha256.k || [];
  var primeCounter = k[lengthProperty];
  /*/
  var hash = [], k = [];
  var primeCounter = 0;
  //*/

  var isComposite = {};

  for (var candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (i = 0; i < 313; i += candidate) {
        isComposite[i] = candidate;
      }

      hash[primeCounter] = mathPow(candidate, .5) * maxWord | 0;
      k[primeCounter++] = mathPow(candidate, 1 / 3) * maxWord | 0;
    }
  }

  ascii += '\x80'; // Append Ƈ' bit (plus zero padding)

  while (ascii[lengthProperty] % 64 - 56) {
    ascii += '\x00';
  } // More zero padding


  for (i = 0; i < ascii[lengthProperty]; i++) {
    j = ascii.charCodeAt(i);
    if (j >> 8) return; // ASCII check: only accept characters in range 0-255

    words[i >> 2] |= j << (3 - i) % 4 * 8;
  }

  words[words[lengthProperty]] = asciiBitLength / maxWord | 0;
  words[words[lengthProperty]] = asciiBitLength; // process each chunk

  for (j = 0; j < words[lengthProperty];) {
    var w = words.slice(j, j += 16); // The message is expanded into 64 words as part of the iteration

    var oldHash = hash; // This is now the undefinedworking hash", often labelled as variables a...g
    // (we have to truncate as well, otherwise extra entries at the end accumulate

    hash = hash.slice(0, 8);

    for (i = 0; i < 64; i++) {
      var i2 = i + j; // Expand the message into 64 words
      // Used below if 

      var w15 = w[i - 15],
          w2 = w[i - 2]; // Iterate

      var a = hash[0],
          e = hash[4];
      var temp1 = hash[7] + (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) // S1
      + (e & hash[5] ^ ~e & hash[6]) // ch
      + k[i] // Expand the message schedule if needed
      + (w[i] = i < 16 ? w[i] : w[i - 16] + (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ w15 >>> 3) // s0
      + w[i - 7] + (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ w2 >>> 10) // s1
      | 0); // This is only used once, so *could* be moved below, but it only saves 4 bytes and makes things unreadble

      var temp2 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) + ( // S0
      a & hash[1] ^ a & hash[2] ^ hash[1] & hash[2]); // maj

      hash = [temp1 + temp2 | 0].concat(hash); // We don't bother trimming off the extra ones, they're harmless as long as we're truncating when we do the slice()

      hash[4] = hash[4] + temp1 | 0;
    }

    for (i = 0; i < 8; i++) {
      hash[i] = hash[i] + oldHash[i] | 0;
    }
  }

  var result = [];

  for (i = 0; i < 8; i++) {
    for (j = 3; j + 1; j--) {
      var b = hash[i] >> j * 8 & 255; //result += ((b < 16) ? 0 : '') + b.toString(16);

      result.push(b);
    }
  } //return result;  
  //return Uint8Array.from(result);


  return btoa(String.fromCharCode.apply(null, Uint8Array.from(result)));
}

; // Need to use commonjs module export for UMD
// https://github.com/parcel-bundler/parcel/issues/766
//

module.exports = Auth;
},{}],"node_modules/parcel/src/builtins/hmr-runtime.js":[function(require,module,exports) {
var global = arguments[3];
var OVERLAY_ID = '__parcel__error__overlay__';
var OldModule = module.bundle.Module;

function Module(moduleName) {
  OldModule.call(this, moduleName);
  this.hot = {
    data: module.bundle.hotData,
    _acceptCallbacks: [],
    _disposeCallbacks: [],
    accept: function (fn) {
      this._acceptCallbacks.push(fn || function () {});
    },
    dispose: function (fn) {
      this._disposeCallbacks.push(fn);
    }
  };
  module.bundle.hotData = null;
}

module.bundle.Module = Module;
var checkedAssets, assetsToAccept;
var parent = module.bundle.parent;

if ((!parent || !parent.isParcelRequire) && typeof WebSocket !== 'undefined') {
  var hostname = "" || location.hostname;
  var protocol = location.protocol === 'https:' ? 'wss' : 'ws';
  var ws = new WebSocket(protocol + '://' + hostname + ':' + "59484" + '/');

  ws.onmessage = function (event) {
    checkedAssets = {};
    assetsToAccept = [];
    var data = JSON.parse(event.data);

    if (data.type === 'update') {
      var handled = false;
      data.assets.forEach(function (asset) {
        if (!asset.isNew) {
          var didAccept = hmrAcceptCheck(global.parcelRequire, asset.id);

          if (didAccept) {
            handled = true;
          }
        }
      }); // Enable HMR for CSS by default.

      handled = handled || data.assets.every(function (asset) {
        return asset.type === 'css' && asset.generated.js;
      });

      if (handled) {
        console.clear();
        data.assets.forEach(function (asset) {
          hmrApply(global.parcelRequire, asset);
        });
        assetsToAccept.forEach(function (v) {
          hmrAcceptRun(v[0], v[1]);
        });
      } else if (location.reload) {
        // `location` global exists in a web worker context but lacks `.reload()` function.
        location.reload();
      }
    }

    if (data.type === 'reload') {
      ws.close();

      ws.onclose = function () {
        location.reload();
      };
    }

    if (data.type === 'error-resolved') {
      console.log('[parcel] ✨ Error resolved');
      removeErrorOverlay();
    }

    if (data.type === 'error') {
      console.error('[parcel] 🚨  ' + data.error.message + '\n' + data.error.stack);
      removeErrorOverlay();
      var overlay = createErrorOverlay(data);
      document.body.appendChild(overlay);
    }
  };
}

function removeErrorOverlay() {
  var overlay = document.getElementById(OVERLAY_ID);

  if (overlay) {
    overlay.remove();
  }
}

function createErrorOverlay(data) {
  var overlay = document.createElement('div');
  overlay.id = OVERLAY_ID; // html encode message and stack trace

  var message = document.createElement('div');
  var stackTrace = document.createElement('pre');
  message.innerText = data.error.message;
  stackTrace.innerText = data.error.stack;
  overlay.innerHTML = '<div style="background: black; font-size: 16px; color: white; position: fixed; height: 100%; width: 100%; top: 0px; left: 0px; padding: 30px; opacity: 0.85; font-family: Menlo, Consolas, monospace; z-index: 9999;">' + '<span style="background: red; padding: 2px 4px; border-radius: 2px;">ERROR</span>' + '<span style="top: 2px; margin-left: 5px; position: relative;">🚨</span>' + '<div style="font-size: 18px; font-weight: bold; margin-top: 20px;">' + message.innerHTML + '</div>' + '<pre>' + stackTrace.innerHTML + '</pre>' + '</div>';
  return overlay;
}

function getParents(bundle, id) {
  var modules = bundle.modules;

  if (!modules) {
    return [];
  }

  var parents = [];
  var k, d, dep;

  for (k in modules) {
    for (d in modules[k][1]) {
      dep = modules[k][1][d];

      if (dep === id || Array.isArray(dep) && dep[dep.length - 1] === id) {
        parents.push(k);
      }
    }
  }

  if (bundle.parent) {
    parents = parents.concat(getParents(bundle.parent, id));
  }

  return parents;
}

function hmrApply(bundle, asset) {
  var modules = bundle.modules;

  if (!modules) {
    return;
  }

  if (modules[asset.id] || !bundle.parent) {
    var fn = new Function('require', 'module', 'exports', asset.generated.js);
    asset.isNew = !modules[asset.id];
    modules[asset.id] = [fn, asset.deps];
  } else if (bundle.parent) {
    hmrApply(bundle.parent, asset);
  }
}

function hmrAcceptCheck(bundle, id) {
  var modules = bundle.modules;

  if (!modules) {
    return;
  }

  if (!modules[id] && bundle.parent) {
    return hmrAcceptCheck(bundle.parent, id);
  }

  if (checkedAssets[id]) {
    return;
  }

  checkedAssets[id] = true;
  var cached = bundle.cache[id];
  assetsToAccept.push([bundle, id]);

  if (cached && cached.hot && cached.hot._acceptCallbacks.length) {
    return true;
  }

  return getParents(global.parcelRequire, id).some(function (id) {
    return hmrAcceptCheck(global.parcelRequire, id);
  });
}

function hmrAcceptRun(bundle, id) {
  var cached = bundle.cache[id];
  bundle.hotData = {};

  if (cached) {
    cached.hot.data = bundle.hotData;
  }

  if (cached && cached.hot && cached.hot._disposeCallbacks.length) {
    cached.hot._disposeCallbacks.forEach(function (cb) {
      cb(bundle.hotData);
    });
  }

  delete bundle.cache[id];
  bundle(id);
  cached = bundle.cache[id];

  if (cached && cached.hot && cached.hot._acceptCallbacks.length) {
    cached.hot._acceptCallbacks.forEach(function (cb) {
      cb();
    });

    return true;
  }
}
},{}]},{},["node_modules/parcel/src/builtins/hmr-runtime.js","Auth.js"], "Auth")
//# sourceMappingURL=/Auth.js.map