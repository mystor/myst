var immutable = require('immutable');

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

function eq(a, b) {
  return a === b; // TODO: Support deep equals in immutablejs objects
}

function neq(a, b) {
  return a !== b; // TODO: Support deep equals in immutablejs objects
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

// Determine if a value is truthy (in Myst terms)
function truth(x) {
  return x != null && x !== false;
}


function get(object, property) {
  // TODO: Add support for accessing properties of immutable objects
  if (object.__unbound)
    return get(object.__unbound, property);

  var val = object[property];
  if (typeof val === 'function') { // Make sure that this is bound correctly
    var bound = Function.prototype.bind.call(val, object);
    bound.__unbound = val;
    return bound;
  }

  return val;
}

module.exports = {
  G: get,
  get: get,
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
  gt: gt
};
