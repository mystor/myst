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
  Program: function(ast) {
    var body = [
      runtimeImport(),
      {
        type: 'VariableDeclaration',
        declarations: transform(ast.declarations),
        kind: 'var'
      },
      {
        type: 'ExpressionStatement',
        expression: {
          type: 'AssignmentExpression',
          operator: '=',
          left: jsast.getMembers('module', 'exports'),
          right: {
            type: 'ObjectExpression',
            properties: ast.declarations.map(function(declaration) {
              return {
                type: "Property",
                key: {
                  type: 'Identifier',
                  name: declaration.name
                },
                value: {
                  type: 'Identifier',
                  name: declaration.name
                },
                kind: 'var'
              };
            })
          }
        }
      }
    ].concat(transform(ast.imports));

    return {
      type: 'Program',
      body: [
        {
          type: 'ExpressionStatement',
          expression: {
            type: 'CallExpression',
            callee: jsast.anonFn([], body),
            arguments: []
          }
        }
      ]
    };
  },

  Import: function(ast) {
    var declarations = ast.names.map(function(name) {
      return {
        type: 'VariableDeclarator',
        id: transform(name),
        init: {
          type: 'MemberExpression',
          object: transform(ast.as),
          property: transform(name)
        }
      };
    });

    declarations.unshift({
      type: 'VariableDeclarator',
      id: transform(ast.as),
      init: {
        type: 'CallExpression',
        callee: {
          type: 'Identifier',
          name: 'require'
        },
        arguments: [
          transform(ast.target)
        ]
      }
    });

    return {
      type: 'VariableDeclaration',
      declarations: declarations,
      kind: 'var'
    };
  },

  Declaration: function(ast) {
    return {
      type: 'VariableDeclarator',
      id: {
        type: 'Identifier',
        name: ast.name
      },
      init: jsast.thunk(transform(ast.value))
    };
  },

  Literal: function(ast) {
    return {
      type: 'Literal',
      value: ast.value
    };
  },

  Identifier: function(ast) {
    return {
      type: 'Identifier',
      name: ast.name
    };
  },

  Function: function(ast) {
    return {
      type: 'CallExpression',
      callee: jsast.getMembers('Pure'),
      arguments: [
        jsast.anonFn(ast.params.map(function(param) {
          if (param.type !== 'Identifier')
            throw new Error('Argument type must be an Identifier'); // The transformer should remove all of the other types for you

          return param.name;
        }), transform(ast.body))
      ]
    };
  },

  FunctionBody: function(ast) {
    if (ast.declarations.length > 0) {
      return [
        {
          type: 'VariableDeclaration',
          declarations: transform(ast.declarations),
          kind: 'var'
        },
        {
          type: 'ReturnStatement',
          argument: transform(ast.returns)
        }
      ];
    } else {
      return [{
        type: 'ReturnStatement',
        argument: transform(ast.returns)
      }];
    }
  },

  Invocation: function(ast) {
    var args = [transform(ast.callee)];
    args = args.concat(transform(ast.arguments));

    return {
      type: 'CallExpression',
      callee: jsast.getMembers('call'),
      arguments: args
    }
  },

  Object: function(ast) {
    return {
      type: 'CallExpression',
      callee: jsast.getMembers('Immutable'),
      arguments: [
        {
          type: 'ObjectExpression',
          properties: transform(ast.properties)
        }
      ]
    };
  },

  Property: function(ast) {
    return {
      type: 'Property',
      key: transform(ast.key),
      value: transform(ast.value),
      kind: 'init'
    };
  },

  Array: function(ast) {
    return {
      type: 'CallExpression',
      callee: jsast.getMembers('Immutable'),
      arguments: [
        {
          type: 'ArrayExpression',
          elements: transform(ast.elements)
        }
      ]
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
