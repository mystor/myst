var jsast = require('./jsast.js');

var runtimeImport = {
  type: 'VariableDeclaration',
  declarations: [
    {
      type: 'VariableDeclarator',
      id: jsast.runtime_DOT_(),
      init: {
        type: 'CallExpression',
        callee: {
          type: 'Identifier',
          name: 'require'
        },
        arguments: [
          {
            type: 'Literal',
            value: 'myst/runtime'
          }
        ]
      }
    }
  ],
  kind: 'var'
};

var transforms = {
  Program: function(ast) {
    var imports = ast.imports.map(function(imprt) {
      var declarations = imprt.names.map(function(name) {
        return {
          type: 'VariableDeclarator',
          id: transform(name),
          init: {
            type: 'MemberExpression',
            object: transform(imprt.as),
            property: transform(name)
          }
        };
      });

      declarations.unshift({
        type: 'VariableDeclarator',
        id: transform(imprt.as),
        init: {
          type: 'CallExpression',
          callee: {
            type: 'Identifier',
            name: 'require'
          },
          arguments: [
            transform(imprt.target)
          ]
        }
      });

      return {
        type: 'VariableDeclaration',
        declarations: declarations,
        kind: 'var'
      };
    });

    var body = [
      runtimeImport,
      {
        type: 'VariableDeclaration',
        declarations: transformAll(ast.declarations),
        kind: 'var'
      }
    ].concat(imports);

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
      callee: jsast.runtime_DOT_('Pure'),
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
          declarations: transformAll(ast.declarations),
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
    args = args.concat(transformAll(ast.arguments));

    return {
      type: 'CallExpression',
      callee: jsast.runtime_DOT_('call'),
      arguments: args
    }
  },

  Object: function(ast) {
    return {
      type: 'CallExpression',
      callee: jsast.runtime_DOT_('Immutable'),
      arguments: [
        {
          type: 'ObjectExpression',
          properties: transformAll(ast.properties)
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
      callee: jsast.runtime_DOT_('Immutable'),
      arguments: [
        {
          type: 'ArrayExpression',
          elements: transformAll(ast.elements)
        }
      ]
    };
  }
};

function transform(ast) {
  if (! transforms.hasOwnProperty(ast.type))
    throw new Error('The type: ' + ast.type + ' is not supported');

  return transforms[ast.type](ast);
}

function transformAll(asts) {
  return asts.map(function(ast) {
    return transform(ast);
  });
}

module.exports = {
  transform: transform
};

