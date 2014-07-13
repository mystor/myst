module.exports = undefined; // Temporary - will be replaced with an immutable obj later

// Load the runtime
var $$RUNTIME$$ = require('./lib/runtime.js');
var Thunk = $$RUNTIME$$.Thunk;
var Pure = $$RUNTIME$$.Pure;
var BIND = $$RUNTIME$$.BIND;
var call = $$RUNTIME$$.call;
var force = $$RUNTIME$$.force;

var log = function(arg) {
  console.log(arg);
  return arg;
};

/* main = do {
 *   y <- parseInt "3";
 *   z = y + 3;
 *   log "hello";
 *   log y;
 *   log "world!";
 * }
 */
var main = Thunk(function() {
  return BIND(Thunk(function() {
    return call(parseInt, "3");
  }), Pure(function(y) {
    var z = Thunk(function() {
      return y + 3; // TODO Make this a function
    });
    return BIND(Thunk(function() {
      return call(log, "hello");
    }), Pure(function(){
      return BIND(Thunk(function() {
        return call(log, y);
      }), Pure(function() {
        return call(log, "world!");
      }));
    }));
  }));
});

console.log(force(main)());

// Load any modules I am using
//var Prelude = require('./lib/prelude.js');

