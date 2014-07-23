(function () {
    var $$RUNTIME$$ = require('myst/runtime');
    var log = $$RUNTIME$$.Thunk(function () {
            return $$RUNTIME$$.Pure(function (msg) {
                return $$RUNTIME$$.call(bind, $$RUNTIME$$.call(bind, $$RUNTIME$$.call($$RUNTIME$$.Pure(function (__0) {
                    return $$RUNTIME$$.call(derefM, __0, 'console');
                }), G), $$RUNTIME$$.Pure(function (__1) {
                    return $$RUNTIME$$.call(derefM, __1, 'log');
                })), $$RUNTIME$$.Pure(function (log) {
                    return $$RUNTIME$$.call(log, msg);
                }));
            });
        }), main = $$RUNTIME$$.Thunk(function () {
            return $$RUNTIME$$.call(log, 'Hello World!');
        });

    var __2 = require('myst/prelude');
    var bind = __2['bind'],
        deref = __2['deref'],
        derefM = __2['derefM'];

    var G = global;

    $$RUNTIME$$.force(main)();
}());

