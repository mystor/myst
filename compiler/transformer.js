var Syntax = require('./parserScope');
var jsast = require('./jsast');
var ast = require('./ast');

var runtime = require('../runtime');
var runtimeImport = function() {
  return transform({
    type: 'Import',
    target: { type: 'Literal', value: 'myst/runtime' },
    names: Object.keys(runtime).map(function(str) {
      return { type: 'Identifier', name: str };
    }),
    as: ast.uniqueId()
  });
};

var transforms = {
  Program: function(program) {
    return { // TODO Imports
      type: 'Program',
      body: transform(program.body)
    };
  },
  
  Identifier: function(identifier) {
    return {
      type: 'Identifier',
      name: identifier.name
    };
  },

  Literal: function(literal) {
    return {
      type: 'Literal',
      value: literal.value
    };
  },

  BasicDeclaration: function(decl) {
    return {
      type: 'VariableDeclaration',
      declarations: [
        {
          type: 'VariableDeclarator',
          id: transform(decl.target),
          init: transform(decl.value) // Desugarer should ensure all Decls have 1 statement
        }
      ],
      kind: 'var'
    };
  },

  Invocation: function(invocation) {
    return {
      type: 'CallExpression',
      callee: transform(invocation.callee),
      arguments: transform(invocation.arguments)
    };
  },

  Lambda: function(lambda) {
    var body = lambda.body.map(function(stmt) {
      if (Syntax.isBasicDeclaration(stmt)) {
        return transform(stmt);
      } else {
        return {
          type: 'ExpressionStatement',
          expression: transform(stmt)
        };
      }
    });

    // Return the last entry
    if (body[body.length - 1].type === 'ExpressionStatement') {
      var last = body[body.length - 1];
      body[body.length - 1] = {
        type: 'ReturnStatement',
        argument: last.expression
      };
    }

    return {
      type: 'FunctionExpression',
      id: null,
      params: transform(lambda.parameters),
      defaults: [],
      body: {
        type: 'BlockStatement',
        body: body
      },
      rest: null,
      generator: false,
      expression: false
    };
  }
};

function transform(ast) {
  if (Array.isArray(ast))
    return ast.map(transform);

  if (! transforms.hasOwnProperty(ast.type))
    throw new Error('The type: ' + ast.type + ' is not supported');

  return transforms[ast.type](ast);
}

module.exports = {
  transform: transform
};
