var __rt = require('myst/runtime');
var __0 = require('myst/prelude');
var add = exports.add = __0['add'];
var sub = exports.sub = __0['sub'];
var mul = exports.mul = __0['mul'];
var div = exports.div = __0['div'];
var concat = exports.concat = __0['concat'];
var neg = exports.neg = __0['neg'];
var inc = exports.inc = __0['inc'];
var dec = exports.dec = __0['dec'];
var binAnd = exports.binAnd = __0['binAnd'];
var binOr = exports.binOr = __0['binOr'];
var binNot = exports.binNot = __0['binNot'];
var eq = exports.eq = __0['eq'];
var neq = exports.neq = __0['neq'];
var lte = exports.lte = __0['lte'];
var gte = exports.gte = __0['gte'];
var lt = exports.lt = __0['lt'];
var gt = exports.gt = __0['gt'];
var merge = exports.merge = __0['merge'];
var map = exports.map = __0['map'];
var filter = exports.filter = __0['filter'];
var fold = exports.fold = __0['fold'];
var Map = exports.Map = __0['Map'];
var Vec = exports.Vec = __0['Vec'];
var Set = exports.Set = __0['Set'];
var Obj = exports.Obj = __0['Obj'];
var Arr = exports.Arr = __0['Arr'];
var memoize = exports.memoize = __0['memoize'];
var range = exports.range = __0['range'];
var assert = require('assert');
var compiler = require('myst/compiler');
var compileErr = exports.compileErr = function (code) {
        return assert['throws'].call(null, function () {
            return compiler['compile'].call(null, code, Obj);
        });
    };
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
        return compileErr.call(null, concat.call(null, 'let x = 5\n', 'let x = 10'));
    });
    test.call(null, 'if isolates values', function () {
        var x = 5;
        if (true) {
            var x = 10;
            assert['equal'].call(null, x, 10);
        } else {
        }
        return assert['equal'].call(null, x, 5);
    });
    test.call(null, 'cannot use values defined in inner scope', function () {
        return compileErr.call(null, concat.call(null, 'if true\n', concat.call(null, '   then let x = 10\n', concat.call(null, '   else let x = 20\n', 'x'))));
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
        if (true) {
            return assert['equal'].call(null, x, 10);
        } else {
        }
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
