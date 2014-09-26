var ast = require('./ast');
var uniqueId = ast.uniqueId;
var Syntax = ast.Syntax;

var preludeImports = function() {
    var prelude = require('../prelude');

    return Object.keys(prelude).map(function(str) {
      return { type: 'Identifier', name: str };
    });
};

function makeDesugarer(options) {
  var desugarers = {
    Literal: function(literal) { return [0, literal]; },

    Identifier: function(identifier) { return [0, identifier]; },

    Program: function(program) {
      var body = [];
      if (options.importPrelude) {
        var preludeId = ast.uniqueId();
        body.push(
          Syntax.Import(Syntax.Literal(options.prelude), preludeId)
        );
        body = body.concat(preludeImports().map(function(name) {
          return Syntax.BasicDeclaration(name, Syntax.Member(preludeId, name.name));
        }));
      }

      return [0, Syntax.Program(body.concat(desugar(program.body)))];
    },

    Import: function(req) {
      return [0, Syntax.Import(
        desugar(req.resource),
        desugar(req.as)
      )];
    },

    Declaration: function(declaration, state) {
      switch (state) {
      case 1: // Clean up Binds (function binds & destructures)
        if (Syntax.isFunctionBind(declaration.target)) {
          return [2, Syntax.Declaration(
            declaration.target.name,
            [Syntax.Lambda(
              declaration.target.parameters,
              declaration.value
            )]
          )];
        } else if (Syntax.isObjectDestructure(declaration.target)) {
          var uid = uniqueId();
          var decls = [Syntax.Declaration(uid, declaration.value)];
          decls = decls.concat(declaration.target.properties.map(function(property) {
            return Syntax.Declaration(
              property.as,
              [ Syntax.Member(uid, property.property) ]
            );
          }));
          return [0, desugar(decls)];
        } else if (Syntax.isArrayDestructure(declaration.target)) {
          var uid = uniqueId();
          var decls = [Syntax.Declaration(uid, declaration.value)];
          decls = decls.concat(declaration.target.items.map(function(item, i) {
            return Syntax.Declaration(
              item,
              [ Syntax.Member(uid, i) ]
            );
          }));
          return [0, desugar(decls)];
        }
      case 2: // Simplify into a BasicDeclaration
        if (declaration.value.length === 1 &&
            ! Syntax.isDeclaration(declaration.value[0])) {
          return [0, Syntax.BasicDeclaration(
            desugar(declaration.target),
            desugar(declaration.value[0])
          )];
        } else {
          return [0, Syntax.BasicDeclaration(
            desugar(declaration.target),
            desugar(Syntax.Invocation(Syntax.Lambda([], declaration.value), []))
          )];
        }
      }

      console.log(state);
      throw new Error('Invalid State');
    },

    FunctionBind: function() { throw new Error('Invalid FunctionBind'); },

    ObjectDestructure: function() { throw new Error('Invalid ObjectDestructure'); },

    PropertyDestructure: function() { throw new Error('Invalid PropertyDestructure'); },

    ArrayDestructure: function() { throw new Error('Invalid ArrayDestructure'); },

    Operation: function(operation) {
      switch (operation.name) {
      case 'rpipe':
        return [1, Syntax.Operation(
          'lpipe',
          operation.snd,
          operation.fst)];

      case 'lpipe':
        return [1, Syntax.Invocation(
          operation.fst,
          [ operation.snd ]
        )];

      case 'rcompose':
        return [1, Syntax.Operation(
          'lcompose',
          operation.snd,
          operation.fst)];

      case 'lcompose':
        var uid = uniqueId();
        return [1, Syntax.Lambda(
          [ uid ],
          [
            Syntax.Invocation(
              operation.fst,
              [ Syntax.Invocation(
                operation.snd,
                [ uid ]
              ) ]
            )
          ]
        )];

      case 'or':
      case 'and':
        return [0, Syntax.Operation(
          operation.name,
          desugar(operation.fst),
          desugar(operation.snd)
        )];
      }
      return [1, Syntax.Invocation(
        Syntax.Identifier(operation.name),
        [operation.fst, operation.snd]
      )];
    },

    UnaryOperation: function(unary) {
      return [1, Syntax.Invocation(
        Syntax.Identifier(unary.name),
        [unary.arg]
      )];
    },

    Invocation: function(invocation, state) {
      switch (state) {
      case 1:
        if (invocation.arguments.some(Syntax.isPlaceholder)) {
          var uids = [];
          var args = invocation.arguments.map(function(argument) {
            if (Syntax.isPlaceholder(argument)) {
              var uid = uniqueId();
              uids.push(uid);
              return uid;
            }
            return argument;
          });

          return [1, Syntax.Lambda(
            uids,
            [ Syntax.Invocation(invocation.callee, args) ]
          )];
        } else {
          return [2, invocation];
        }
      case 2:
        return [0, Syntax.Invocation(
          desugar(invocation.callee),
          desugar(invocation.arguments))];
      }

      throw new Error('Invalid State');
    },

    Placeholder: function() { throw new Error('Invalid Placeholder'); },

    Lambda: function(lambda, state) {
      switch (state) {
      case 1: // Move destructures into body as assignments
        var destructures = [];
        var parameters = lambda.parameters.map(function(parameter) {
          if (/Destructure/.test(parameter.type)) {
            var uid = uniqueId();
            destructures.push(Syntax.Declaration(parameter, [uid]));
            return uid;
          }
          return parameter;
        });

        return [2, Syntax.Lambda(parameters, destructures.concat(lambda.body))];

      case 2: // Decend
        return [0, Syntax.Lambda(desugar(lambda.parameters), desugar(lambda.body))];
      }

      throw new Error('Invalid State');
    },

    If: function(ifExpr) {
      return [0, Syntax.If(
        desugar(ifExpr.cond),
        desugar(ifExpr.consequent),
        desugar(ifExpr.alternate)
      )];
    },

    Member: function(member) {
      return [0, Syntax.Member(
        desugar(member.object),
        member.property
      )];
    },

    Method: function(method) {
      return [0, Syntax.Method(
        desugar(method.object),
        method.property
      )];
    },

    Merge: function(merge) {
      return [0, Syntax.Invocation(
        Syntax.Identifier('merge'),
        [
          desugar(merge.into),
          desugar(merge.from)
        ]
      )];
    },

    Object: function(object) {
      return [0, Syntax.Object(
        desugar(object.properties)
      )];
    },

    ObjectProperty: function(prop) {
      return [0, Syntax.ObjectProperty(
        prop.key.value,
        desugar(prop.value)
      )];
    },

    Array: function(array) {
      return [0, Syntax.Array(
        desugar(array.items)
      )];
    }

  };

  function flatten(list) {
    var newList = [];

    list.forEach(function(i) {
      if (Array.isArray(i))
        newList = newList.concat(i);
      else
        newList.push(i);
    });

    return newList;
  }

  function desugar(ast) {
    if (Array.isArray(ast)) // Desugar every element of an array
      return flatten(ast.map(desugar));

    var c = 0, s = 1;
    while (s) {
      if (! desugarers.hasOwnProperty(ast.type))
        throw new Error('No desugarer for type: ' + ast.type + ' on node: ' + ast);

      var r = desugarers[ast.type](ast, s);
      s = r[0], ast = r[1];

      if (c++ > 1000) throw new Error('Desugar ' + ast.type + ' not done after 1000 iterations');
    }

    return ast;
  }

  return desugar;
}

function desugar(ast, options) {
  return makeDesugarer(options)(ast);
}

module.exports = {
  desugar: desugar
};
