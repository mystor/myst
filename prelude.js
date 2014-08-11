var mori = require('mori');

var rt = require('./runtime.js');
var IO = rt.IO;
var Pure = rt.Pure;
var force = rt.force;
var forceJS = rt.forceJS;
var Thunk = rt.Thunk;
var call = rt.call;
var MystObj = rt.MystObj;

var slice = Array.prototype.slice;

var get = Pure(function(obj, prop) {
  var o = force(obj);
  if (mori.is_collection(o))
    return mori.get(o, prop);
  else
    return o[prop];
});

var iff = Pure(function(cond, consequent, alternative) {
  if (force(cond)) {
    return consequent;
  } else {
    return alternative;
  }
});

var unsafePerformIO = Pure(function(action) {
  return rt.doIO(action);
});

var obj = Pure(function() {
  // Keys must be strict strings
  var args = slice.call(arguments);
  for (var i = 0; i < arguments.length; i += 2) {
    args[i] = '' + forceJS(args[i]); // Force the key into a string
  }

  return MystObj(mori.hash_map.apply(null, args));
});

var arr = Pure(function() {
  return MystObj(mori.vector.apply(null, arguments));
});

function NumOp(fn) {
  return Pure(function() {
    var args = new Array(arguments.length);
    for (var i = 0; i < arguments.length; i++) {
      args[i] = force(arguments[i]);
      if (typeof args[i] !== 'number' || args[i] !== args[i])
        throw new Error('Argument ' + i + ' to NumOp is not a number, instead: ' + args[i]);
    }

    return fn.apply(this, args);
  });
}

/* add */
var _PLUS_ = NumOp(function(a, b) { return a + b; });

/* minus */
var _MINUS_ = NumOp(function(a, b) { return a - b; });

/* multiplication */
var _TIMES_ = NumOp(function(a, b) { return a * b; });

/* division */
var _SLASH_ = NumOp(function(a, b) { return a / b; });

/* modulo */
var _MODULO_ = NumOp(function(a, b) { return a % b; });

/* equals */
var _EQ__EQ_ = Pure(function(a, b) {
  var a = force(a), b = force(b);
  // TODO: Make immutable objects compare more deeply
  return a === b;
});

/* not equals */
var _EXCLAM__EQ_ = Pure(function(a, b) {
  return call(_EXCLAM_, call(_EQ__EQ_, a, b));
});

/* less than */
var _LT_ = Pure(function(a, b) {
  return force(a) < force(b);
});

/* greater than */
var _GT_ = Pure(function(a, b) {
  return force(a) > force(b);
});

/* less than or equals */
var _LT__EQ_ = Pure(function(a, b) {
  return force(a) <= force(b);
});

/* greater than or equals */
var _GT__EQ_ = Pure(function(a, b) {
  return force(a) >= force(b);
});

/* logical or */
var _BAR__BAR_ = Pure(function(a, b) {
  var fa = force(a);
  if (fa) return fa;

  return b;
});

/* logical or */
var _AND__AND_ = Pure(function(a, b) {
  var fa = force(a);
  if (! fa) return fa;

  return b;
});

/* not */
var _EXCLAM_ = Pure(function(a) {
  return ! force(a);
});

/* cons */
var _COLON_ = Pure(function(a, b) {
  if (! Array.isArray(b))
    throw new Error('Second argument to : operator must be an array');

  var nb = b.slice();
  nb.unshift(a);
  return nb;
});

module.exports = {
  iff: iff,
  get: get,
  unsafePerformIO: unsafePerformIO,
  obj: obj,
  arr: arr,
  _PLUS_: _PLUS_,
  _MINUS_: _MINUS_,
  _TIMES_: _TIMES_,
  _SLASH_: _SLASH_,
  _MODULO_: _MODULO_,
  _EQ__EQ_: _EQ__EQ_,
  _EXCLAM__EQ_: _EXCLAM__EQ_,
  _LT_: _LT_,
  _GT_: _GT_,
  _LT__EQ_: _LT__EQ_,
  _GT__EQ_: _GT__EQ_,
  _BAR__BAR_: _BAR__BAR_,
  _AND__AND_: _AND__AND_,
  _EXCLAM_: _EXCLAM_,
  _COLON_: _COLON_
};
