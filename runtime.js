var slice = [].slice;

/*
 * Thunks
 */
function force(thunk) {
  while (isThunk(thunk))
    thunk = thunk.force();

  return thunk;
}

function forceJS(thunk) {
  var forced = force(thunk);
  return forced; // At some point make this fix more things
}

function isThunk(thunk) {
  return typeof thunk === 'function' && thunk.$$thunk === true;
}

function isFunction(object) {
  return typeof object === 'function' && (object.$$pure || ! object.$$io);
}

function isIO(object) {
  return typeof object === 'function' && (object.$$io || (! object.$$pure && ! object.$$thunk));
}

/*
 * Functions contain values which will be evaluated at some point in the future
 */
var Thunk = function(value) {
  var forced = false;

  var thunk = function() {
    var args = slice.call(arguments);

    var forced = force(thunk);
    if (isFunction(forced)) {
      args.unshift(forced);

      forced = force(call.apply(null, args));
    } else if (args.length > 0) {
      throw new Error('Attempt to call non-function object');
    }

    if (isIO(forced)) {
      return force(doIO(forced));
    } else {
      return forced;
    }
  };

  Object.defineProperty(thunk, '$$thunk', { value: true });

  thunk.force = function(type) {
    if (! forced) {
      value = value(type);
      forced = true;
    }

    return value;
  };

  return thunk;
};

/*
 * Pure Functions - (These are lazily evaluated)
 */
var Pure = function(fn) {
  if (typeof fn !== 'function')
    throw new Error('Attempt to declare an ' + typeof fn + ' as a Pure function');

  var pureFn = function() {
    var args = slice.apply(arguments);
    args.unshift(fn);

    return forceJS(call.apply(null, args)());
  };

  pureFn.impl = fn;

  Object.defineProperty(pureFn, '$$pure', { value: true });

  return pureFn;
};

/*
 * IO Actions - (These IO actions can produce lazy values)
 */
var IO = function(fn) {
  if (typeof fn !== 'function')
    throw new Error('IO actions must be functions');

  var io = function() {
    return forceJS(fn());
  };

  Object.defineProperty(io, '$$action', { value: fn });
  Object.defineProperty(io, '$$io', { value: true });

  return io;
};

IO.bind = Pure(function(a, b) {
  return IO(function() {
    var x = doIO(a);
    var y = call(b, x);
    return doIO(y);
  });
});

IO.return = Pure(function(a) {
  return IO(function() {
    return a;
  });
});

/*
 * Perform an IO action
 */
var doIO = function(io) {
  io = force(io);
  if (typeof io !== 'function' || io.hasOwnProperty('$$pure'))
    throw new Error('Attempt to do non-IO action');

  if (io.hasOwnProperty('$$io'))
    return io.$$action();
  else
    return io();
};

/*
 * Call a Pure function (or lazily call a JS function - producing an IO action)
 * This does no special handling of `this`. That is handled by the deref function.
 */
var call = function(fn) {
  var args = slice.call(arguments, 1);
  fn = force(fn);

  if (typeof fn !== 'function' || fn.hasOwnProperty('$$io'))
    throw new Error('Attempt to call non-function type');

  if (fn.hasOwnProperty('$$pure')) {
    // If the function is marked as "pure", we can call it whenever we
    // want, so we call it when it is needed.
    return Thunk(function() {
      var res = fn.impl.apply(null, args);
      return res;
    });
  } else {
    // If the function isn't marked as "pure", we make an IO action
    // which will call the function with the given arguments when invoked
    return IO(function() {
      return fn.apply(null, args.map(forceJS)); // TODO: The arguments need to be made js-compatible
    });
  }
};

module.exports = {
  IO: IO,       // A constructor for an IO action
  Thunk: Thunk, // Create a lazy thunk
  Pure: Pure,   // Mark a function as being pure (all functions in myst are pure)
  call: call,   // Call a pure function, returning a lazy thunk
  force: force, // Force a thunk into whnf
  doIO: doIO    // Perform an IO action
};
