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
var length = exports.length = function (x) {
        return __rt.G(imm['Sequence'], 'from').call(null, x)['length'];
    };
var isList = exports.isList = function (x) {
        return Array['isArray'].call(null, x) || instanceOf.call(null, x, imm['Sequence']);
    };
var Map = exports.Map = imm['Map'].call(null);
var Vec = exports.Vec = imm['Vector'].call(null);
var Set = exports.Set = imm['Set'].call(null);
var Obj = exports.Obj = Object.call(null);
var Arr = exports.Arr = Array.call(null);
var show = exports.show = rt['show'];
var get = exports.get = function (o, p) {
        var np = __rt.T(lt.call(null, p, 0)) ? add.call(null, length.call(null, o), p) : p;
        return rt['get'].call(null, o, np);
    };
var set = exports.set = rt['set'];
var memoize = exports.memoize = function (f) {
        var memo = merge.call(null, Obj, __rt.M({}));
        return function (x) {
            if (__rt.T(__rt.G(memo, 'hasOwnProperty').call(null, x))) {
                return getProperty.call(null, memo, x);
            } else {
                var res = f.call(null, x);
                return set.call(null, memo, x, res);
                return res;
            }
        };
    };
var instanceOf = exports.instanceOf = rt['instanceOf'];
var slice = exports.slice = function (x, f, t) {
        return __rt.G(__rt.G(imm['Sequence'], 'from').call(null, x), 'slice').call(null, f, t);
    };
var range = exports.range = imm['Range'];
var error = exports.error = rt['error'];
var attempt = exports.attempt = rt['attempt'];
