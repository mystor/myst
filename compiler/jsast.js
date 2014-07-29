var slice = [].slice;

// This class is intended to make it easier to make some JS ast objects
var getMembers = function(obj) {
  if (arguments.length === 1) {
    return {
      type: 'Identifier',
      name: arguments[0]
    };
  } else {
    var y = {
      type: 'MemberExpression',
      computed: false,
      object: getMembers.apply(null, slice.call(arguments, 0, -1)),
      property: {
        type: 'Identifier',
        name: arguments[arguments.length - 1]
      }
    };

    return y;
  }
};

var anonFn = function(args, body) {
  return {
    type: 'FunctionExpression',
    id: null,
    params: args.map(function(arg) {
      return {
        type: 'Identifier',
        name: arg
      };
    }),
    defaults: [],
    body: {
      type: 'BlockStatement',
      body: body
    },
    rest: null,
    generator: false,
    expression: false
  };
};

var thunk = function(value) {
  return {
    type: 'CallExpression',
    callee: getMembers('Thunk'),
    arguments: [
      anonFn([], [
        {
          type: 'ReturnStatement',
          argument: value
        }
      ])
    ]
  };
};

var declarations = function(decls) {
  return {
    type: 'VariableDeclaration',
    declarations: decls.map(function(decl) {
      return {
        type: 'VariableDeclarator',
        id: {
          type: 'Identifier',
          name: decl.name
        },
        init: decl.init
      };
    }),
    kind: 'var'
  };
};

module.exports = {
  getMembers: getMembers,
  anonFn: anonFn,
  thunk: thunk,
  declarations: declarations
};
