(function () {
    var $$RUNTIME$$ = require('myst/runtime');
    var main = $$RUNTIME$$.Thunk(function () {
            return $$RUNTIME$$.call($$RUNTIME$$.call(deref, IO, 'bind'), $$RUNTIME$$.call(hello, 'world'), $$RUNTIME$$.Pure(function (x) {
                return $$RUNTIME$$.call(print, x);
            }));
        });
    var __0 = require('myst/prelude'), bind = __0.bind, deref = __0.deref, derefM = __0.derefM, iff = __0.iff, _PLUS_ = __0._PLUS_, _MINUS_ = __0._MINUS_, _TIMES_ = __0._TIMES_, _SLASH_ = __0._SLASH_, _MODULO_ = __0._MODULO_, _EQ__EQ_ = __0._EQ__EQ_, _EXCLAM__EQ_ = __0._EXCLAM__EQ_, _LT_ = __0._LT_, _GT_ = __0._GT_, _LT__EQ_ = __0._LT__EQ_, _GT__EQ_ = __0._GT__EQ_, _BAR__BAR_ = __0._BAR__BAR_, _AND__AND_ = __0._AND__AND_, _EXCLAM_ = __0._EXCLAM_, _COLON_ = __0._COLON_;
}());
