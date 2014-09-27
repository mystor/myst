var immutable = require('immutable');
var Map = immutable.Map;
var Vector = immutable.Vector;
var Sequence = immutable.Sequence;

function add(a, b) {
  if (+a !== a || +b !== b) throw new Error('Cannot add non-numbers');
  return a + b;
}

function sub(a, b) {
  if (+a !== a || +b !== b) throw new Error('Cannot sub non-numbers');
  return a - b;
}

function mul(a, b) {
  if (+a !== a || +b !== b) throw new Error('Cannot mul non-numbers');
  return a * b;
}

function div(a, b) {
  if (+a !== a || +b !== b) throw new Error('Cannot div non-numbers');
  return a / b;
}

function negate(a) {
  if (+a !== a) throw new Error('Cannot negate non-numbers');
  return -a;
}

function modulo(a, b) {
  if (+a !== a || +b !== b) throw new Error('Cannot modulo non-numbers');
  return a % b;
}

function binAnd(a, b) {
  if (+a !== a || +b !== b) throw new Error('Cannot binAnd non-numbers');
  return a & b;
}

function binOr(a, b) {
  if (+a !== a || +b !== b) throw new Error('Cannot binOr non-numbers');
  return a | b;
}

function binNot(a) {
  if (+a !== a) throw new Error('Cannot binNot non-numbers');
  return ~a;
}

var eq = immutable.is;

function neq(a, b) {
  return !eq(a, b);
}

function lte(a, b) {
  return a <= b;
}

function gte(a, b) {
  return a >= b;
}

function lt(a, b) {
  return a < b;
}

function gt(a, b) {
  return a > b;
}

function concat(a, b) {
  if (Array.isArray(a)) {
    return a.concat(b);
  } else if (a instanceof immutable.Sequence) {
    return a.concat(b);
  } else if (typeof a === 'string' && typeof b === 'string') {
    return a + b;
  } else {
    throw new Error('Cannot concat those two types');
  }
}

function show(x) {
  return ''+x;
}

// Determine if a value is truthy (in Myst terms)
function truth(x) {
  return x != null && x !== false;
}

function getMethod(object, property) {
  var val = object[property];
  return val.bind(object);
}

/* Merge the object b into the object a, producing a new object */
function merge(a, b) {
  var merged;
  if (a instanceof immutable.Sequence) {
    // Use merge to create another immutable seq
    merged = a.merge(b);
  } else if (Array.isArray(a)) { // Object.create(Array.prototype) doesn't work :'(
    merged = Array.prototype.slice.call(a);
    Sequence(b).forEach(function(v, k) { merged[k] = v; });
  } else {
    var proto = Object.getPrototypeOf(a);
    merged = Object.create(proto);
    Object.keys(a).forEach(function(k) { merged[k] = a[k]; });
    Sequence(b).forEach(function(v, k) { merged[k] = v; });
  }
  return merged;
};

module.exports = {
  G: getMethod,
  getMethod: getMethod,
  M: Map,
  Map: Map,
  V: Vector,
  Vector: Vector,
  merge: merge,
  truth: truth,
  add: add,
  sub: sub,
  mul: mul,
  div: div,
  negate: negate,
  modulo: modulo,
  binAnd: binAnd,
  binOr: binOr,
  binNot: binNot,
  eq: eq,
  neq: neq,
  lte: lte,
  gte: gte,
  lt: lt,
  gt: gt,
  concat: concat,
  show: show
};
