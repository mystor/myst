var prelude = require('../prelude');
var preludeImports = Object.keys(prelude).map(function(str) {
  return { type: 'Identifier', name: str };
});

var uniqueId = require('./ast').uniqueId;

// Descend into the values named in [val]
function descendInto(val) {
  return function(ast) {
    val.forEach(function(k) {
      var subItems = ast[k];
      if (Array.isArray(subItems))
        ast[k] = desugar(subItems);
      else
        ast[k] = desugar(subItems);
    });

    return ast;
  };
}

// Convert a symbol into an identifier
function identifierify(string) {
  return (string
    .replace(':', '_COLON_')
    .replace('<', '_LT_')
    .replace('>', '_GT_')
    .replace('-', '_MINUS_')
    .replace('+', '_PLUS_')
    .replace('*', '_TIMES_')
    .replace('/', '_SLASH_')
    .replace('%', '_MODULO_')
    .replace('=', '_EQ_')
    .replace('!', '_EXCLAM_')
    .replace('|', '_BAR_')
    .replace('&', '_AND_')
    .replace('.', '_DOT_'));
}

var desugarers = {
  Program: function(ast) {
    // Add a new import for prelude if prelude isn't explicitly
    // imported somewhere else.
    var explicitPrelude = ast.imports.some(function(imprt) {
      return imprt.target.value === 'myst/prelude';
    });

    if (! explicitPrelude) {
      ast.imports.push({
        type: 'Import',
        target: {type: 'Literal', value: 'myst/prelude'},
        names: preludeImports,
        as: null
      });
    }

    // Desugar and return a new program!
    return {
      type: 'Program',
      imports: desugar(ast.imports),
      declarations: desugar(ast.declarations),
      loc: ast.loc
    };
  },

  Import: function(ast) {
    ast.as = ast.as || uniqueId(); // Ensure that _as_ is set.

    return ast;
  },

  Declaration: descendInto(['value']),

  Literal: descendInto([]),

  Identifier: descendInto([]),

  Function: function(ast) {
    // In a function signature, you can discard variables with placeholders,
    // give them valid names such that javascript won't complain
    ast.params = ast.params.map(function(param) {
      if (param.type === 'Placeholder') {
        return uniqueId(param.loc);
      } else {
        return param;
      }
    });

    ast.body = desugar(ast.body);
    return ast;
  },

  FunctionBody: descendInto(['declarations', 'returns']),

  Operator: function(ast) {
    return desugar({
      type: 'Invocation',
      callee: {type: 'Identifier', name: ast.callee},
      arguments: ast.arguments,
      loc: ast.loc
    });
  },

  Invocation: function(ast) {
    // Wrap functions for partial applications with _ placeholders
    if (ast.arguments.some(function(arg) { return arg.type === 'Placeholder'; })) {
      var wrapperParams = [];

      ast.arguments = ast.arguments.map(function(argument) {
        if (argument.type === 'Placeholder') {
          var newId = uniqueId(argument.loc);
          wrapperParams.push(newId);
          return newId;
        } else {
          return argument;
        }
      });

      return desugar({
        type: 'Function',
        params: wrapperParams.slice(),
        body: {
          type: 'FunctionBody',
          returns: ast,
          declarations: []
        }
      });
    } else {
      ast.callee = desugar(ast.callee);
      ast.arguments = desugar(ast.arguments);
      return ast;
    }
  },

  Do: function(ast) {
    if (ast.params.length > 0) {
      var params = ast.params;
      ast.params = [];
      return desugar({
        type: 'Function',
        params: params,
        body: {
          type: 'FunctionBody',
          returns: ast,
          declarations: []
        }
      });
    } else {
      var body = ast.body;
      var declarations = [];

      var expr = null;
      while (body.length > 0) {
        var last = body.pop();

        if (last.type === 'Declaration') {
          declarations.unshift(last);
        } else if (last.type === 'Action' || last.type === 'Bind') {
          var action = last.value;
          var target = last.target || {type: 'Placeholder'};
          if (expr) {
            expr = {
              type: 'Invocation',
              callee: {
                type: 'Member',
                object: ast.monad,
                property: {type: 'Identifier', name: 'bind'}
              },
              arguments: [
                action,
                {
                  type: 'Function',
                  params: [target],
                  body: {
                    type: 'FunctionBody',
                    declarations: declarations,
                    returns: expr
                  }
                }
              ]
            };

            declarations = [];
          } else {
            expr = action;
          }
        }

      }

      if (expr === null)
        throw new Error('do blocks must contain at least one non-declaration element');

      return desugar(expr);
    }
  },

  // This is a bit ugly - we need to handle transforming dereferencing
  // statements into the correct operation
  Member: function(ast) {
    // Recurse for previous members
    return desugar({
      type: 'Invocation',
      callee: { type: 'Identifier', name: 'get' },
      arguments: [
        ast.object,
        {
          type: 'Literal',
          value: ast.property.name
        }
      ]
    });
  },

  // // Operators are just functions
  // BinaryOperator: function(ast) {
  //   return desugar({
  //     type: 'Invocation',
  //     callee: {
  //       type: 'Identifier',
  //       name: identifierify(ast.op)
  //     },
  //     arguments: [ast.left, ast.right],
  //     loc: ast.loc
  //   });
  // },

  // UnaryOperator: function(ast) {
  //   return desugar({
  //     type: 'Invocation',
  //     callee: {
  //       type: 'Identifier',
  //       name: identifierify(ast.op)
  //     },
  //     arguments: ast.arguments,
  //     loc: ast.loc
  //   });
  // },

  Object: function(ast) {
    var args = [];
    ast.properties.forEach(function(prop) {
      if (prop.key.type === 'Identifier')
        args.push({
          type: 'Literal',
          value: prop.key.name,
          loc: prop.key.loc
        });
      else
        args.push(prop.key);
      args.push(prop.value);
    });

    return desugar({
      type: 'Invocation',
      callee: {
        type: 'Identifier',
        name: 'obj'
      },
      arguments: args,
      loc: ast.loc
    });
  },

  Array: function(ast) {
    return desugar({
      type: 'Invocation',
      callee: {
        type: 'Identifier',
        name: 'arr'
      },
      arguments: ast.elements,
      loc: ast.loc
    });
  }
};

function desugar(ast) {
  if (Array.isArray(ast)) // Desugar every element of an array
    return ast.map(desugar);

  if (! desugarers.hasOwnProperty(ast.type))
    throw new Error('No desugarer for type: ' + ast.type + ' on node: ' + ast);

  var x = desugarers[ast.type](ast);
  console.log(x);
  return x;
}

module.exports = {
  desugar: desugar
};
