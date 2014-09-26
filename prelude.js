var __rt = require('./runtime');
var rt = require('./runtime');
var imm = require('immutable');
var add = exports.add = rt['add'];
var sub = exports.sub = rt['sub'];
var mul = exports.mul = rt['mul'];
var div = exports.div = rt['div'];
var concat = exports.concat = rt['concat'];
var neg = exports.neg = function (x) {
        return sub.call(null, 0, x);
    };
var inc = exports.inc = function (x) {
        return add.call(null, x, 1);
    };
var dec = exports.dec = function (x) {
        return sub.call(null, x, 1);
    };
var binAnd = exports.binAnd = rt['binAnd'];
var binOr = exports.binOr = rt['binOr'];
var binNot = exports.binNot = rt['binNot'];
var eq = exports.eq = rt['eq'];
var neq = exports.neq = rt['neq'];
var lte = exports.lte = rt['lte'];
var gte = exports.gte = rt['gte'];
var lt = exports.lt = rt['lt'];
var gt = exports.gt = rt['gt'];
var merge = exports.merge = rt['merge'];
var map = exports.map = function (f, x) {
        return __rt.G(__rt.G(imm['Sequence'], 'from').call(null, x), 'map').call(null, f);
    };
var filter = exports.filter = function (f, x) {
        return __rt.G(__rt.G(imm['Sequence'], 'from').call(null, x), 'filter').call(null, function (__0) {
            return rt['truth'].call(null, f.call(null, __0));
        });
    };
var fold = exports.fold = function (f, z, x) {
        return __rt.G(__rt.G(imm['Sequence'], 'from').call(null, x), 'reduce').call(null, f, z);
    };
var Map = exports.Map = imm['Map'].call(null);
var Vec = exports.Vec = imm['Vector'].call(null);
var Set = exports.Set = imm['Set'].call(null);
var Obj = exports.Obj = Object.call(null);
var Arr = exports.Arr = Array.call(null);
var memoize = exports.memoize = function (f) {
        var memo = merge.call(null, Obj, __rt.M({ 'a': 'b' }));
        return function (x) {
            if (__rt.G(memo, 'hasOwnProperty').call(null, x)) {
                return getProperty.call(null, memo, x);
            } else {
                var res = f.call(null, x);
                return set.call(null, memo, x, res);
                return res;
            }
        };
    };
var range = exports.range = imm['Range'];
