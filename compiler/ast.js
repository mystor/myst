// Generate a unique id with an incrementing ID number. Shouldn't conflict
var idCounter = 0;
function uniqueId(loc) {
  return { type: 'Identifier', name: '__' + idCounter++, loc: loc };
}

// The different types of syntax objects
var Syntax = {
  Operation: function(name, fst, snd) {
    return { // TODO: Support unary better
      type: 'Operation',
      name: name,
      fst: fst,
      snd: snd
    };
  },

  Identifier: function(name) {
    return {
      type: 'Identifier',
      name: name
    };
  },

  Literal: function(value) {
    return {
      type: 'Literal',
      value: value
    };
  },

  Program: function(statements) {
    return {
      type: 'Program',
      body: statements
    };
  },

  ExpressionStatement: function(expression) {
    return {
      type: 'ExpressionStatement',
      value: expression
    };
  },

  Declaration: function(target /* Destructure | Identifier */, value /* [Statement] */) {
    return {
      type: 'Declaration',
      target: target,
      value: value
    };
  },

  BasicDeclaration: function(target /* Identifier */, value /* Expression */) {
    return {
      type: 'BasicDeclaration',
      target: target,
      value: value
    };
  },

  FunctionBind: function(name, parameters) {
    return {
      type: 'FunctionBind',
      name: name,
      parameters: parameters
    };
  },

  Case: function(expressions, alternatives) {
    return {
      type: 'Case',
      expressions: expressions,
      alternatives: alternatives
    };
  },

  Alternative: function(targets, body) {
    return {
      type: 'Alternative',
      targets: targets,
      body: body
    };
  },

  ObjectDestructure: function(properties) {
    return {
      type: 'ObjectDestructure',
      properties: properties
    };
  },

  PropertyDestructure: function(property, as) {
    return {
      type: 'PropertyDestructure',
      property: property,
      as: as
    };
  },

  ArrayDestructure: function(items) {
    return {
      type: 'ArrayDestructure',
      items: items
    };
  },

  Invocation: function(callee, arguments) {
    return {
      type: 'Invocation',
      callee: callee,
      arguments: arguments
    };
  },

  Placeholder: function(num) {
    return {
      type: 'Placeholder',
      index: num
    };
  },

  Lambda: function(parameters, body) {
    return {
      type: 'Lambda',
      parameters: parameters,
      body: body
    };
  },

  If: function(cond, consequent, alternate) {
    return {
      type: 'If',
      cond: cond,
      consequent: consequent,
      alternate: alternate
    };
  },

  Member: function(object, property) {
    return {
      type: 'Member',
      object: object,
      property: property
    };
  },

  Object: function(properties) {
    return {
      type: 'Object',
      properties: properties
    };
  },

  ObjectProperty: function(key, value) {
    return {
      type: 'ObjectProperty',
      key: Syntax.Literal(key),
      value: value
    };
  },

  Array: function(items) {
    return {
      type: 'Array',
      items: items
    };
  }
};

// isObject etc functions
Object.keys(Syntax).forEach(function(type) {
  Syntax['is'+type] = function(o) {
    return typeof o === 'object' && o.type === type;
  };
});

module.exports = {
  uniqueId: uniqueId,
  Syntax: Syntax
};
