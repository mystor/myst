var __rt = require('./runtime');
var rt = require('./runtime');
var imm = require('immutable');
var add = rt['add'];
var sub = rt['sub'];
var mul = rt['mul'];
var div = rt['div'];
var concat = rt['concat'];
var inc = function (x) {
    return add.call(null, x, 1);
};
var dec = function (x) {
    return sub.call(null, x, 1);
};
var binAnd = rt['binAnd'];
var binOr = rt['binOr'];
var binNot = rt['binNot'];
var eq = rt['eq'];
var neq = rt['neq'];
var lte = rt['lte'];
var gte = rt['gte'];
var lt = rt['lt'];
var gt = rt['gt'];
var merge = rt['merge'];
var map = function (f, x) {
    return __rt.G(__rt.G(imm['Sequence'], 'from').call(null, x), 'map').call(null, f);
};
var filter = function (f, x) {
    return __rt.G(__rt.G(imm['Sequence'], 'from').call(null, x), 'filter').call(null, function (__0) {
        return rt['truth'].call(null, f.call(null, __0));
    });
};
var fold = function (f, z, x) {
    return __rt.G(__rt.G(imm['Sequence'], 'from').call(null, x), 'reduce').call(null, f, z);
};
var Map = imm['Map'].call(null);
var Vec = imm['Vector'].call(null);
var Set = imm['Set'].call(null);
var Obj = Object.call(null);
var Arr = Array.call(null);
var memoize = function (f) {
    var memo = merge.call(null, Obj, __rt.M({ 'a': 'b' }));
    return function (x) {
        return function () {
            if (__rt.G(memo, 'hasOwnProperty').call(null, x)) {
                return getProperty.call(null, memo, x);
            } else {
                var res = f.call(null, x);
                set.call(null, memo, x, res);
                return res;
            }
        }();
    };
};
var range = imm['Range'];
