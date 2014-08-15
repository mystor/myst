var mori = require('mori');

/*
 * Define a Myst-Aware function (jsifies its return value)
 */
function Fn (fn, lazy) {
  if (typeof fn !== 'function')
    throw new Error('Attempt to declare an ' + typeof fn + ' as a Myst function');

  var jsFn = function() {
    return jsify(fn.apply(this, arguments)); // TODO: Trampoline
  };

  jsFn.$$myst = fn;
  jsFn.$$lazy = lazy;

  return jsFn;
};

/*
 * Call a function in a Myst context
 */
function call (fn, n, x, noTrampoline) {
  if (typeof fn !== 'function')
    throw new Error('Attempt to call a non-function');

  var lazy = fn.$$lazy || [];
  var nx = Array(n);
  for (var i=0; i<n; i++) {
    if (! lazy[i])
      nx[i] = x(i);
  }

  if (fn.$$myst) { // Establish a trampoline
    var val = fn.$$myst.apply(null, nx);
    if (! noTrampoline) {
      while (! isContinuation(val))
        val = val();
    }
    return val;
  } else {
    return fn.apply(null, nx);
  }
}

/*
 * Wrap tail-calls in continuations
 */
function tail_call(fn, n, x) {
  var continuation = function() {
    return call(fn, n, x, true);
  };

  continuation.$$continuation = true;

  return continuation;
}

/*
 * Immutable "Myst" objects
 */
function jsify(object) { // Forces an object to be js-like
  if (isMystObj(object)) {
    return mori.clj_to_js(object);
  }

  return object;
}

function isMystObj(object) {
  return mori.is_collection(object) && object.$$mystobj === true;
}

// Basic Data struct
function object() {
  var o = mori.map.apply(null, arguments);
  o.$$mystobj = true;
  return o;
}

function array() {
  var a = mori.vector.apply(null, arguments);
  a.$$mystobj = true;
  return a;
}

module.exports = {
  F: Fn,                // F -> Defines a Myst-aware function
  C: call,              // C -> Call a function
  T: tail_call,         // T -> TailCall a function
  O: object,            // O -> Define an object MystObj
  A: array,             // A -> Define an array MystObj

  jsify: jsify,         // Force a MystObj into JS-form
  isMystObj: isMystObj  // Check if an object is a valid MystObj
};
