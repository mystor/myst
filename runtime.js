var immutable = require('immutable');

function add(a, b) {
  if (typeof a !== 'number' || typeof b !== 'number') throw new Error('Cannot add non-numbers');
  return a + b;
}

function sub(a, b) {
  if (typeof a !== 'number' || typeof b !== 'number') throw new Error('Cannot sub non-numbers');
  return a - b;
}

function mul(a, b) {
  if (typeof a !== 'number' || typeof b !== 'number') throw new Error('Cannot mul non-numbers');
  return a * b;
}

function div(a, b) {
  if (typeof a !== 'number' || typeof b !== 'number') throw new Error('Cannot div non-numbers');
  return a / b;
}

function modulo(a, b) {
  if (typeof a !== 'number' || typeof b !== 'number') throw new Error('Cannot modulo non-numbers');
  return a % b;
}

function binAnd(a, b) {
  if (typeof a !== 'number' || typeof b !== 'number') throw new Error('Cannot binAnd non-numbers');
  return a & b;
}

function binOr(a, b) {
  if (typeof a !== 'number' || typeof b !== 'number') throw new Error('Cannot binOr non-numbers');
  return a | b;
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
  get: get
};
