function force(thunk) {
  if (isThunk(thunk))
    return thunk.force();

  return thunk;
};

/* Thunks */
function isThunk(thunk) {
  return typeof thunk === 'function' && thunk.force;
};

var Thunk = function(value) {
  var whnf = false;
  var nf = false;

  var theThunk = function() {
    throw new Error("forceJS not implemented yet");
  };

  theThunk.force = function(type) {
    if (! whnf) {
      value = value(type);

      while (isThunk(value))
        value = value.force(type);

      whnf = true;
    }

    return value;
  };

  return Immutable(theThunk);
};

/*
 * Make an object immutable
 */
var Immutable = function(obj) {
  // Attempt to enforce immutability
  Object.defineProperty(obj, '$$immutable', { value: true });

  if (typeof Object.freeze !== 'undefined')
    Object.freeze(obj);

  return obj;
};

/*
 * Pure declares a function as being a pure function.
 * Pure functions are immutable, and act differently 
 * than normal functions.
 */
var Pure = function(fn) { // TODO: Should be JS facing function
  if (typeof fn !== 'function')
    throw new Error('Only a function can be made pure');

  Object.defineProperty(fn, '$$pure', { value: true });

  return Immutable(fn);
};

/*
 * Represents an IO action. Normal JS functions can also be
 * IO functions, (or they can be Pure functions, returning an
 * IO action)
 */
var IO = function(fn) { // TODO: Should be JS facing function
  if (typeof fn !== 'function')
    throw new Error('IO actions must be functions');

  Object.defineProperty(fn, '$$io', { value: true });

  return Immutable(fn);
};

var BIND = function(l, r) {
  // TODO: Support other monads than IO
  // TODO: Verify types
  return IO(function() {
    var v = force(l)();
    var rIO = force(call(r, v));
    return rIO();
  });
};

var slice = [].slice;

var call = function(fn) {
  var args = slice.call(arguments, 1);
  fn = force(fn);

  if (typeof fn !== 'function')
    throw new Error('Must call function'); // XXX

  if (! fn.hasOwnProperty('$$pure')) {
    // This must be a JS-style function
    return IO(function() {
      return fn.apply(null, args); // XXX: Handle `this` better maybe
    });
  } else {
    return Thunk(function() {
      return fn.apply(null, args); // XXX: Not sure about this
    });
  }
};

module.exports = {
  BIND: BIND,
  call: call,
  Thunk: Thunk,
  Pure: Pure,
  force: force
};
