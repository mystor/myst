var ast = require('./ast');
var Syntax = ast.Syntax;

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

function makeEmitter(options) {
  var emits = {
    Program: function(program) {
      return { // TODO Imports
        type: 'Program',
        body: [
          {
            type: 'VariableDeclaration',
            declarations: [
              {
                type: 'VariableDeclarator', // -- Runtime
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
          }
        ].concat(emit(program.body))
      };
    },

    Import: function(req) {
      return {
        type: 'VariableDeclaration',
        declarations: [
          {
            type: 'VariableDeclarator',
            id: emit(req.as),
            init: {
              type: 'CallExpression',
              callee: {
                type: 'Identifier',
                name: 'require'
              },
              arguments: [
                emit(req.resource)
              ]
            }
          }
        ],
        kind: 'var'
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
            id: emit(decl.target),
            init: emit(decl.value) // Desugarer should ensure all Decls have 1 statement
          }
        ],
        kind: 'var'
      };
    },

    Invocation: function(invocation) {
      return {
        type: 'CallExpression',
        callee: {
          type: 'MemberExpression',
          computed: false,
          object: emit(invocation.callee),
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
        ].concat(emit(invocation.arguments))
      };
    },

    Operation: function(operation) {
      switch (operation.name) {
      case 'or':
        return {
          type: 'LogicalExpression',
          operator: '||',
          left: emit(operation.fst),
          right: emit(operation.snd)
        };

      case 'and':
        return {
          type: 'LogicalExpression',
          operator: '&&',
          left: emit(operation.fst),
          right: emit(operation.snd)
        };

      default:
        throw new Error('Can only emit && and || operators');
      }
    },

    Lambda: function(lambda) {
      var body = lambda.body.map(function(stmt, idx) {
        if (Syntax.isBasicDeclaration(stmt)) {
          return emit(stmt);
        } else {
          if (idx === lambda.body.length - 1) {
            return {
              type: 'ReturnStatement',
              argument: emit(stmt)
            };
          } else {
            return {
              type: 'ExpressionStatement',
              expression: emit(stmt)
            };
          }
        }
      });

      return {
        type: 'FunctionExpression',
        id: null,
        params: emit(lambda.parameters),
        defaults: [],
        body: {
          type: 'BlockStatement',
          body: body
        },
        rest: null,
        generator: false,
        expression: false
      };
    },

    If: function(ifExpr) {
      if (ifExpr.consequent.length === 1 &&
          ifExpr.alternate.length === 1) {
        return {
          type: 'ConditionalExpression',
          test: emit(ifExpr.cond),
          consequent: emit(ifExpr.consequent[0]),
          alternate: emit(ifExpr.alternate[0])
        };
      } else {
        var thn = ifExpr.consequent.map(function(maybeExpr) {
          if (Syntax.isBasicDeclaration(maybeExpr)) {
            return emit(maybeExpr);
          } else {
            return {
              type: 'ExpressionStatement',
              expression: emit(maybeExpr)
            };
          }
        });

        if (thn.length &&
            thn[thn.length - 1].type === 'ExpressionStatement') {
          thn[thn.length - 1] = {
            type: 'ReturnStatement',
            argument: thn[thn.length - 1].expression
          };
        }

        var els = ifExpr.alternate.map(function(maybeExpr) {
          if (Syntax.isBasicDeclaration(maybeExpr)) {
            return emit(maybeExpr);
          } else {
            return {
              type: 'ExpressionStatement',
              expression: emit(maybeExpr)
            };
          }
        });

        if (els.length &&
            els[els.length - 1].type === 'ExpressionStatement') {
          els[els.length - 1] = {
            type: 'ReturnStatement',
            argument: els[els.length - 1].expression
          };
        }

        return {
          type: 'CallExpression',
          callee: {
            type: 'FunctionExpression',
            id: null,
            params: [],
            defaults: [],
            body: {
              type: 'BlockStatement',
              body: [
                {
                  type: 'IfStatement',
                  test: emit(ifExpr.cond),
                  consequent: {
                    type: 'BlockStatement',
                    body: thn
                  },
                  alternate: {
                    type: 'BlockStatement',
                    body: els
                  }
                }
              ]
            },
            rest: null,
            generator: false,
            expression: false
          },
          arguments: []
        };
      }
    },

    Member: function(member) {
      return {
        type: 'CallExpression',
        callee: __rt_dot('G'),
        arguments: [
          emit(member.object),
          {
            type: 'Literal',
            value: member.property
          }
        ]
      };
    },

    Object: function(object) {
      return {
        type: 'CallExpression',
        callee: __rt_dot('O'),
        arguments: object.properties.map(function(property) {
          return [emit(property.key), emit(property.value)];
        }).reduce(function(a, b) { return a.concat(b); })
      };
    },

    Array: function(array) {
      return {
        type: 'CallExpression',
        callee: __rt_dot('A'),
        arguments: emit(array.items)
      };
    }
  };

  function emit(ast) {
    if (Array.isArray(ast))
      return ast.map(emit);

    if (! emits.hasOwnProperty(ast.type))
      throw new Error('The type: ' + ast.type + ' is not supported');

    return emits[ast.type](ast);
  }

  return emit;
};

function emit(ast, options) {
  return makeEmitter(options)(ast);
}

module.exports = {
  emit: emit
};
