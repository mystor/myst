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


// TYPES

main = do IO {
  x <- y;
  a <- b;
  return IO (a * 3);
}

somethingElse = do Maybe x {
  y <- x;
  Maybe.return a
};
somethingElse = fn x {
  Maybe.bind x fn y {
    Maybe.return a
  }
};

Monad = trait {
  extends Functor, Applicative;
  bind = fail;
  return = fail;
  then = fn a b {
    self.bind a fn _ { b }
  };
};

{
  return: something,
  bind: something
} :: Monad;

Monad = {
  bind: fail,
  return: fail,
  then: fn a b {
    bind a fn _ { b }
  }
};


Maybe = {
  extends: [Monad],
  alt: fn a b {
    if is Just a {
      a.value
    } else {
      b
    }
  }
};

Just = fn a {
  {
    extends: [Maybe],
    value: a
  }
}

bind = fn a b {
  constrained = constrain a Monad;
  constrained.bind(fn a {
    constrain (b a) (typeOf constrained)
  })
}

return = fn a {
  dynamic fn T {
    if is Monad (maybe IO id T) {
      T.return a
    } else {
      error "Well shit"
    }
  }
}

Maybe = trait {
  extends Monad;
  value = fail;
  present = fail;
  or = fn a {
    if present {
      value
    } else {
      a
    }
  };
  return = Just;
};

Maybe = Thunk(function() {
  return call(trait, Pure(function(self) {
    return Immutable({
      $$super: Thunk(function() { return Immutable([Monad]); }),
      value: Thunk(function() { return fail }),
      present: Thunk(function() { return fail }),
      or: Thunk(function() {
        return Pure(function(a) {
          return call(_if, self.present, self.value, a);
        });
      })
    });
  }));
});


Just = concrete value {
  extends Maybe;
  bind = fn b {
    b value
  };
};

Nothing = concrete {
  extends Maybe;
  bind = fn b {
    Nothing
  };
};


import "./apples" as apples

from "./apples" import apple1, apple2, apple3 as apples

{bind, asd, fgh} = require "asdf"


