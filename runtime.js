var slice = [].slice;

/*
 * Thunks
 */
function force(thunk) {
  while (isThunk(thunk))
    thunk = thunk.force();

  return thunk;
};

function isThunk(thunk) {
  return typeof thunk === 'function' && typeof thunk.force === 'function';
};

var Thunk = function(value) {
  var forced = false;

  var thunk = function() {
    return force(thunk);
  };

  thunk.force = function(type) {
    if (! forced) {
      value = value(type);
      forced = true;
    }

    return value;
  };

  return Immutable(thunk);
};

/*
 * Lazy Immutable Types
 */
var Immutable = function(obj) {
  // Attempt to enforce immutability
  Object.defineProperty(obj, '$$immutable', { value: true });

  if (typeof Object.freeze !== 'undefined')
    Object.freeze(obj);

  return obj;
};

/*
 * Pure Functions
 */
var Pure = function(fn) { // TODO: Should be JS facing function
  if (typeof fn !== 'function')
    throw new Error('Attempt to declare an ' + typeof fn + ' as a Pure function');

  var pureFn = function() {
    var args = slice.apply(arguments);
    args.unshift(fn);

    return call.apply(null, args)();
  };

  pureFn.impl = Immutable(fn);

  Object.defineProperty(pureFn, '$$pure', { value: true });

  return Immutable(pureFn);
};

/*
 * IO Actions - (JS functions are _also_ IO actions, but they are strict)
 */
var IO = function(fn) { // TODO: Should be JS facing function
  if (typeof fn !== 'function')
    throw new Error('IO actions must be functions');

  Object.defineProperty(fn, '$$io', { value: true });

  return Immutable(fn);
};

/*
 * Perform an IO action
 */
var doIO = function(io) {
  if (typeof io !== 'function' || io.hasOwnProperty('$$pure'))
    throw new Error('Attempt to do non-IO action');

  if (io.hasOwnProperty('$$io'))
    return io.action();
  else 
    return io();
}

/*
 * Call a Pure function (or lazily call a JS function - producing an IO action)
 */
var call = function(fn) {
  var args = slice.call(arguments, 1);
  fn = force(fn);

  if (typeof fn !== 'function' || fn.hasOwnProperty('$$io'))
    throw new Error('Attempt to call non-function type');

  if (fn.hasOwnProperty('$$pure')) {
    return Thunk(function() {
      return fn.impl.apply(null, args); // XXX: Not sure about this
    });
  } else {
    return IO(function() {
      return fn.apply(null, args); // XXX: Handle `this` better maybe
    });
  }
};

module.exports = Immutable({
  IO: IO,
  Thunk: Thunk,
  Pure: Pure,
  Immutable: Immutable,
  call: call,
  force: force
});
