module.exports = {
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

  Declaration: function(target, value) {
    return {
      type: 'Declaration',
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

  PropertyDestructure: function(property, as) {
    return {
      type: 'PropertyDestructure',
      property: property,
      as: as
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

  Member: function(object, property) {
    return {
      type: 'Member',
      object: object,
      property: property
    };
  }
};
