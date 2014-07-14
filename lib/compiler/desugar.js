var id_counter = 0;

function only(val) {
  return function(ast) {
    val.forEach(function(k) {
      var subItems = ast[k];
      if (Array.isArray(subItems))
        ast[k] = desugarAll(subItems);
      else
        ast[k] = desugar(subItems)
    });

    return ast;
  };
}

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
    .replace('&', '_AND_'));
}

var desugarers = {
  Program: only(['declarations']),

  Declaration: only(['value']),

  Literal: only([]),

  Identifier: only([]),

  Function: function(ast) {
    // Replace all placeholders with valid identifiers
    // Hopefully they don't conflict somehow

    ast.params = ast.params.map(function(param) {
      if (param.type === 'Placeholder') {
        return {
          type: 'Identifier',
          name: '__' + id_counter++,
          loc: param.loc
        };
      } else {
        return param;
      }
    });
    ast.body = desugar(ast.body);

    return ast;
  },

  FunctionBody: only(['declarations', 'returns']),

  Invocation: function(ast) {
    if (ast.arguments.some(function(arg) { return arg.type === 'Placeholder'; })) {
      var wrapperParams = [];
      ast.arguments = ast.arguments.map(function(argument) {
        if (argument.type === 'Placeholder') {
          var newId = {
            type: 'Identifier',
            name: '__' + id_counter++,
            loc: argument.loc
          };
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
      ast.arguments = desugarAll(ast.arguments);
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
          declarations.unshift(desugar(last));
        } else if (last.type === 'Action' || last.type === 'Bind') {
          // Get the expression
          var action = last.value;
          var target = last.target || {type: 'Placeholder'};
          if (expr) {
            expr = {
              type: 'Invocation',
              callee: {type: 'Identifier', name: 'bind'},
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
      // Consume all declarations off of the end of the list - they have no effect

      console.log("******", JSON.stringify(expr, null, 4));
      return desugar(expr);
    }
  },

  Member: function(ast) {
    // Recurse for previous members
    var object = desugar(ast.object);

    if (ast.op === '::') {
      var action = {
        type: 'Invocation',
        callee: {type: 'Identifier', name: 'derefM'},
        arguments: [
          {type: 'Placeholder'},
          {
            type: 'Literal',
            value: ast.property.name
          }
        ]
      };

      if (object.__io) {
        return desugar({
          type: 'Invocation',
          callee: {type: 'Identifier', name: 'bind'},
          arguments: [
            object,
            action
          ],
          __io: true
        });
      } else {
        return desugar({
          type: 'Invocation',
          callee: action,
          arguments: [object],
          __io: true
        });
      }
    } else if (ast.op === '.') {
      if (object.__io) { // XXX: Make this less disgusting
        var id = {type: 'Identifier', name: '__' + id_counter++};
        return desugar({
          type: 'Invocation',
          callee: {type: 'Identifier', name: 'bind'},
          arguments: [
            object,
            {
              type: 'Function',
              params: [id],
              body: {
                type: 'FunctionBody',
                declarations: [],
                returns: {
                  type: 'Invocation',
                  callee: {type: 'Identifier', name: 'unit'},
                  arguments: [
                    {
                      type: 'Invocation',
                      callee: {type: 'Identifier', name: 'deref'},
                      arguments: [
                        id,
                        {
                          type: 'Literal',
                          value: ast.property.name
                        }
                      ]
                    }
                  ]
                }
              }
            }
          ],
          __io: true
        });
      } else {
        return desugar({
          type: 'Invocation',
          callee: {type: 'Identifier', name: 'deref'},
          arguments: [
            object,
            {
              type: 'Literal',
              value: ast.property.name
            }
          ],
          __io: false
        });
      }
    }
  },

  BinaryOperator: function(ast) {
    return {
      type: 'Invocation',
      callee: {
        type: 'Identifier',
        name: identifierify(ast.op)
      },
      arguments: [ast.left, ast.right],
      loc: ast.loc
    };
  },

  UnaryOperator: function(ast) {
    return {
      type: 'Invocation',
      callee: {
        type: 'Identifier',
        name: identifierify(ast.op)
      },
      arguments: ast.arguments,
      loc: ast.loc
    };
  }
};

function desugar(ast) {
  console.log(ast);
  if (! desugarers.hasOwnProperty(ast.type))
    throw new Error('No desugarer for type: ' + ast.type)

  return desugarers[ast.type](ast);
}

function desugarAll(asts) {
  return asts.map(desugar);
}

module.exports = {
  desugar: desugar
};
