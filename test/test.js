var __rt = require('myst/runtime');
var assert = require('assert');
suite.call(null, 'math', function () {
    test.call(null, 'basic operations', function () {
        assert['equal'].call(null, add.call(null, 1, 1), 2);
        assert['equal'].call(null, sub.call(null, 5, 3), 2);
        assert['equal'].call(null, mul.call(null, 5, 5), 25);
        return assert['equal'].call(null, div.call(null, 15, 3), 5);
    });
    return test.call(null, 'precidence', function () {
        assert['equal'].call(null, add.call(null, 1, mul.call(null, 1, 5)), 6);
        return assert['equal'].call(null, sub.call(null, 1, mul.call(null, 1, 5)), neg.call(null, 4));
    });
});
suite.call(null, 'variables', function () {
    test.call(null, 'let binds', function () {
        var x = 5;
        return assert['equal'].call(null, x, 5);
    });
    test.call(null, 'multiple let statements', function () {
        var x = 5;
        var y = 10;
        assert['equal'].call(null, x, 5);
        return assert['equal'].call(null, y, 10);
    });
    test.call(null, 'cannot re-assign values', function () {
        return concat.call(null, compileErr.call(null, 'let x = 5\n'), 'let x = 10');
    });
    test.call(null, 'if isolates values', function () {
        var x = 5;
        (function () {
            if (true) {
                var x = 10;
                return assert['equal'].call(null, x, 10);
            } else {
            }
        }());
        return assert['equal'].call(null, x, 5);
    });
    test.call(null, 'cannot use values defined in inner scope', function () {
        return concat.call(null, compileErr.call(null, 'if true\n'), concat.call(null, '   then let x = 10\n', concat.call(null, '   else let x = 20\n', 'x')));
    });
    test.call(null, 'lambda isolates values', function () {
        var x = 5;
        (function () {
            var x = 10;
            return assert['equal'].call(null, x, 10);
        }.call(null));
        return assert['equal'].call(null, x, 5);
    });
    test.call(null, 'lambda sees enclosing scope', function () {
        var x = 5;
        return function () {
            return assert['equal'].call(null, x, 5);
        }.call(null);
    });
    return test.call(null, 'if sees enclosing scope', function () {
        var x = 10;
        return function () {
            if (true) {
                return assert['equal'].call(null, x, 10);
            } else {
            }
        }();
    });
});
suite.call(null, 'functions', function () {
    test.call(null, 'nullary function application', function () {
        assert['notEqual'].call(null, function () {
            return 5;
        }, 5);
        return assert['equal'].call(null, function () {
            return 5;
        }.call(null), 5);
    });
    return test.call(null, 'function application', function () {
        assert['equal'].call(null, function (x) {
            return x;
        }.call(null, 5), 5);
        return assert['equal'].call(null, function (x, y) {
            return add.call(null, x, y);
        }.call(null, 5, 10), 15);
    });
});
