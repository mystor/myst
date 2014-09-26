var ast = require('./ast');
var immut = require('immutable');
var Syntax = ast.Syntax;

function __rt_import(options) {
  return {
    type: 'VariableDeclaration',
    declarations: [
      {
        type: 'VariableDeclarator',
        id: {
          type: 'Identifier',
          name: '__rt'
        },
        init: {
          type: 'CallExpression',
          callee: {
            type: 'Identifier',
            name: 'require'
          },
          arguments: [
            {
              type: 'Literal',
              value: options.runtime || 'myst/runtime'
            }
          ]
        }
      }
    ],
    kind: 'var'
  };
}

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

function expr(handler) {
  return function(ast, ctx) {
    var handled = handler(ast, ctx.merge({ statement: false, return: false }));
    if (ctx.get('statement')) {
      if (ctx.get('return')) {
        return {
          type: 'ReturnStatement',
          argument: handled
        };
      } else {
        return {
          type: 'ExpressionStatement',
          expression: handled
        };
      }
    } else {
      return handled;
    }
  };
}

function isStatement(x) {
  return Syntax.isBasicDeclaration(x) || Syntax.isImport(x) || Syntax.isDeclaration(x);
}

function makeEmitter(options) {
  var emits = {
    Program: function(program, ctx) {
      var cCtx = ctx.merge({
        statement: true,
        toplevel: true,
        return: false
      });

      return {
        type: 'Program',
        body: [__rt_import(options)].concat(program.body.map(function(stmt) {
          return emit(stmt, cCtx);
        }))
      };
    },

    Import: function(req, ctx) {
      if (! ctx.get('toplevel') || ! ctx.get('statement'))
        throw new Error('Can only import values in the toplevel scope');

      return {
        type: 'VariableDeclaration',
        declarations: [
          {
            type: 'VariableDeclarator',
            id: emit(req.as, ctx.merge({ statement: false, toplevel: false })),
            init: {
              type: 'CallExpression',
              callee: {
                type: 'Identifier',
                name: 'require'
              },
              arguments: [
                emit(req.resource, ctx.merge({ statement: false, toplevel: false }))
              ]
            }
          }
        ],
        kind: 'var'
      };
    },

    Identifier: expr(function(identifier, ctx) {
      return {
        type: 'Identifier',
        name: identifier.name
      };
    }),

    Literal: expr(function(literal, ctx) {
      return {
        type: 'Literal',
        value: literal.value
      };
    }),

    BasicDeclaration: function(decl, ctx) {
      var target = emit(decl.target, ctx.merge({ statement: false }));
      var init = emit(decl.value, ctx.merge({ statement: false }));
      if (ctx.get('toplevel')) {
        init = {
          type: 'AssignmentExpression',
          operator: '=',
          left: {
            type: 'MemberExpression',
            object: { type: 'Identifier', name: 'exports' },
            property: target,
            computed: false
          },
          right: init
        };
      }

      return {
        type: 'VariableDeclaration',
        declarations: [
          {
            type: 'VariableDeclarator',
            id: target,
            init: init
          }
        ],
        kind: 'var'
      };
    },

    Invocation: expr(function(invocation, ctx) {
      return {
        type: 'CallExpression',
        callee: {
          type: 'MemberExpression',
          computed: false,
          object: emit(invocation.callee, ctx),
          property: {
            type: 'Identifier',
            name: 'call'
          }
        },
        arguments: [
          {
            type: 'Literal',
            value: null
          }
        ].concat(emit(invocation.arguments, ctx))
      };
    }),

    Operation: expr(function(operation, ctx) {
      switch (operation.name) {
      case 'or':
        return {
          type: 'LogicalExpression',
          operator: '||',
          left: emit(operation.fst, ctx),
          right: emit(operation.snd, ctx)
        };

      case 'and':
        return {
          type: 'LogicalExpression',
          operator: '&&',
          left: emit(operation.fst, ctx),
          right: emit(operation.snd, ctx)
        };

      default:
        throw new Error('Can only emit && and || operators');
      }
    }),

    Lambda: expr(function(lambda, ctx) {
      var last = lambda.body[lambda.body.length - 1];
      var start = lambda.body.slice(0, lambda.body.length - 1);

      var body = start.map(function(stmt) {
        return emit(stmt, ctx.merge({
          toplevel: false,
          statement: true,
          return: false
        }));
      });

      body.push(emit(last, ctx.merge({
        toplevel: false,
        statement: true,
        return: true
      })));

      return {
        type: 'FunctionExpression',
        id: null,
        params: emit(lambda.parameters, ctx), // TODO: Handle better?
        defaults: [],
        body: {
          type: 'BlockStatement',
          body: body
        },
        rest: null,
        generator: false,
        expression: false
      };
    }),

    If: function(ifExpr, ctx) {
      var cond = emit(ifExpr.cond, ctx.merge({
        statement: false,
        return: false,
        toplevel: false
      }));

      if (ctx.get('statement')) {
        return {  // TODO: Don't emit else branch unless necessary
          type: 'IfStatement',
          test: cond,
          consequent: {
            type: 'BlockStatement',
            body: emit(ifExpr.consequent, ctx.merge({ toplevel: false }))
          },
          alternate: {
            type: 'BlockStatement',
            body: emit(ifExpr.alternate, ctx.merge({ toplevel: false }))
          }
        };
      } else {
        if (ifExpr.consequent.length === 1 && ifExpr.alternate.length === 1) {
          // Can be represented as a ternary expression
          return {
            type: 'ConditionalExpression',
            test: cond,
            consequent: emit(ifExpr.consequent[0], ctx),
            alternate: emit(ifExpr.alternate[0], ctx)
          };
        } else {
          return emit(Syntax.Invocation( // Wrap in an immediately-invoked function
            Syntax.Lambda([], [ifExpr]),
            []
          ), ctx);
        }
      }
    },

    Member: expr(function(member, ctx) {
      return {
        type: 'MemberExpression',
        object: emit(member.object, ctx),
        property: {
          type: 'Literal',
          value: member.property
        },
        computed: true
      };
    }),

    Method: expr(function(method, ctx) {
      return {
        type: 'CallExpression',
        callee: __rt_dot('G'),
        arguments: [
          emit(method.object, ctx),
          {
            type: 'Literal',
            value: method.property
          }
        ]
      };
    }),

    Object: expr(function(object, ctx) {
      return {
        type: 'CallExpression',
        callee: __rt_dot('M'),
        arguments: [
          {
            type: 'ObjectExpression',
            properties: object.properties.map(function(property) {
              return {
                type: 'Property',
                key: emit(property.key, ctx),
                value: emit(property.value, ctx),
                kind: 'init'
              };
            })
          }
        ]
      };
    }),

    Array: expr(function(array, ctx) {
      return {
        type: 'CallExpression',
        callee: __rt_dot('V'),
        arguments: emit(array.items, ctx)
      };
    })
  };

  function emit(ast, ctx) {
    if (Array.isArray(ast))
      return ast.map(function(ast) { return emit(ast, ctx); });

    if (! emits.hasOwnProperty(ast.type))
      throw new Error('The type: ' + ast.type + ' is not supported');

    return emits[ast.type](ast, ctx);
  }

  return emit;
};

function emit(ast, options) {
  var em = makeEmitter(options)(ast, immut.Map());
  return em;
}

module.exports = {
  emit: emit
};
