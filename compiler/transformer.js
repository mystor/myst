var Syntax = require('./parserScope');
var jsast = require('./jsast');
var ast = require('./ast');

function __rt_dot(name) {
  return {
    type: 'MemberExpression',
    computed: false,
    object: {
      type: 'Identifier',
      name: '__rt'
    },
    property: {
      type: 'Identifier',
      name: name
    }
  };
}

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
      callee: __rt_dot('C'),
      arguments: [
        transform(invocation.callee),
        {
          type: 'ArrayExpression',
          elements: transform(invocation.arguments)
        }
      ]
    };

    return {
      type: 'CallExpression',
      callee: transform(invocation.callee),
      arguments: transform(invocation.arguments)
    };
  },

  Operation: function(operation) {
    switch (operation.name) {
      case 'or':
      return {
        type: 'LogicalExpression',
        operator: '||',
        left: transform(operation.fst),
        right: transform(operation.snd)
      };

      case 'and':
      return {
        type: 'LogicalExpression',
        operator: '&&',
        left: transform(operation.fst),
        right: transform(operation.snd)
      };

      default:
      throw new Error('Can only transform && and || operators');
    }
  },

  Lambda: function(lambda) {
    var lBody = lambda.body.slice();
    var last = lBody.pop();

    var body = lBody.map(function(stmt) {
      if (Syntax.isBasicDeclaration(stmt)) {
        return transform(stmt);
      } else {
        return {
          type: 'ExpressionStatement',
          expression: transform(stmt)
        };
      }
    });

    if (Syntax.isBasicDeclaration(last)) {
      body.push(transform(last));
    } else {
      body.push({
        type: 'ReturnStatement',
        argument: Syntax.isInvocation(last) ? {
          type: 'CallExpression',
          callee: __rt_dot('T'),
          arguments: [
            transform(last.callee),
            {
              type: 'ArrayExpression',
              elements: transform(last.arguments)
            }
          ]
        } : transform(last)
      });
    }

    return {
      type: 'CallExpression',
      callee: __rt_dot('F'),
      arguments: [{
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
      }]
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
