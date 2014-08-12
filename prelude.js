var mori = require('mori');

var rt = require('./runtime.js');
var IO = rt.IO;
var Pure = rt.Pure;
var force = rt.force;
var forceJS = rt.forceJS;
var Thunk = rt.Thunk;
var call = rt.call;
var MystObj = rt.MystObj;
var Numeric = rt.Numeric;
var Weak = rt.Weak;

var slice = Array.prototype.slice;

var get = Pure(function(obj, prop) {
  var o = force(obj);
  if (mori.is_collection(o))
    return mori.get(o, prop);
  else
    return o[prop];
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

/* if */
var _IF_ = Pure(function(cond, consequent, alternative) {
  if (force(cond)) {
    return consequent;
  } else {
    return alternative;
  }
});

/* add */
var _ADD_ = Numeric(function(a, b) { return a + b; });

/* minus */
var _SUB_ = Numeric(function(a, b) { return a - b; });

/* multiplication */
var _MULT_ = Numeric(function(a, b) { return a * b; });

/* division */
var _DIV_ = Numeric(function(a, b) { return a / b; });

/* modulo */
var _MOD_ = Numeric(function(a, b) { return a % b; });

/* equals */
var _EQUALS_ = Weak(function(a, b) {
  // TODO: Make immutable objects compare more deeply
  return a === b;
});

/* not equals */
var _NOT_EQUALS_ = Pure(function(a, b) {
  return call(_EXCLAM_, call(_EQ__EQ_, a, b));
});

/* less than */
var _LT_ = Weak(function(a, b) {
  return a < b;
});

/* greater than */
var _GT_ = Weak(function(a, b) {
  return a > b;
});

/* less than or equals */
var _LT_EQ_ = Weak(function(a, b) {
  return a <= b;
});

/* greater than or equals */
var _GT_EQ_ = Weak(function(a, b) {
  return a >= b;
});

/* logical or */
var _OR_ = Pure(function(a, b) {
  var fa = force(a);
  if (fa) return fa;

  return b;
});

/* logical or */
var _AND_ = Pure(function(a, b) {
  var fa = force(a);
  if (! fa) return fa;

  return b;
});

/* not */
var _NOT_ = Weak(function(a) {
  return ! a;
});

module.exports = {
  get: get,
  unsafePerformIO: unsafePerformIO,
  obj: obj,
  arr: arr,
  _IF_: _IF_,
  _ADD_: _ADD_,
  _SUB_: _SUB_,
  _MULT_: _MULT_,
  _DIV_: _DIV_,
  _MOD_: _MOD_,
  _EQUALS_: _EQUALS_,
  _NOT_EQUALS_: _NOT_EQUALS_,
  _LT_: _LT_,
  _GT_: _GT_,
  _LT_EQ_: _LT_EQ_,
  _GT_EQ_: _GT_EQ_,
  _OR_: _OR_,
  _AND_: _AND_,
  _NOT_: _NOT_
};
