var Generator = require('jison').Generator;

var grammar = {
  'operators': [
    ['left', '=', 'LAMBDA'],
    ['right', '||'],
    ['right', '&&'],
    ['nonassoc', '==', '!=', '<', '>', '<=', '>='],
    ['right', '++'],
    ['left', '+', '-'],
    ['left', '*', '/'],
    ['left', '|>', '>>'],
    ['right', '<|', '<<'],
    ['right', '!'],
    ['left', '.'],
    ['left', 'NEG'],
    ['left', 'INVOCATION']
  ],

  bnf: {
    start: [['program', 'return $1;']]
  }
};

function BinOp(name) {
  return (function() {
    return yy.Operation(__name__, $1, $3);
  }).toString().replace('__name__', JSON.stringify(name));
}

function UnOp(name) {
  return (function() {
    return yy.Operation(__name__, $2);
  }).toString().replace('__name__', JSON.stringify(name));
}

function id() {
  return $1;
}

function Prec(prec, fn) {
  fn.prec = prec;
  return fn;
}

function nt(nonterminal) {
  var val = [];

  for (var i=2; i<arguments.length; i+=2) {
    var newVal = [arguments[i-1], "$$ = (" + arguments[i].toString() + ")(); $$.loc = @0;"];
    if (arguments[i].prec)
      newVal.push({prec: arguments[i].prec});

    val.push(newVal);
  }

  grammar.bnf[nonterminal] = val;
}

/* Simple Primitive Objects */
nt('identifier',
   'IDENTIFIER', function() {
     return yy.Identifier($1);
   }
);

nt('literal',
   'TRUE', function() {
     return yy.Literal(true);
   },
   'FALSE', function() {
     return yy.Literal(false);
   },
   'STRING', function() {
     return yy.Literal(eval($1)); // TODO: Remove dependency on eval
   },
   'NUMBER', function() {
     return yy.Literal(eval($1)); // TODO: Remove dependency on eval
   }
);

nt('program', // TODO: Change $$= to return
   'statements EOF', function() {
     return yy.Program($1);
   }
);

nt('statements',
   '', function() {
     return [];
   },
   'statements NEWLINE', function() {
     return $1;
   },
   'statements statement', function() {
     $1.push($2); return $1;
   }
);

nt('statement',
   'declaration', function() {
     return $1;
   },
   'expression NEWLINE', function() {
     return yy.ExpressionStatement($1);
   }
);

nt('declaration', // TODO: Add guards
   'LET bind_target = expression NEWLINE', function() {
     return yy.Declaration($2, $4);
   },
   'LET bind_target = NEWLINE INDENT statements DEDENT', function() {
     return yy.Declaration($2, $6);
   }
);

nt('bind_target', // TODO: Basic Decomposition
   'parameter', function() {
     return $1;
   },
   'identifier parameter_list', function() {
     return yy.FunctionBind($1, $2);
   }
);

nt('parameter_list',
   'parameter', function() {
     return [$1];
   },
   'parameter_list parameter', function() {
     $1.push($2); return $1;
   }
);

nt('parameter',
   'identifier', id,
   'destructure', id
);

nt('destructure',
   '{ obj_destructure_list }', function() { return $2; },
   '[ arr_destructure_list ]', function() { return $2; }
);

nt('obj_destructure_list',
   'obj_destructure', function() { return [$1]; },
   'obj_destructure_list , obj_destructure', function() {
     $1.push($3); return $1;
   }
);

nt('obj_destructure',
   'identifier', function() {
     return yy.PropertyDestructure($1, $1);
   },
   'identifier : parameter', function() {
     return yy.PropertyDestructure($1, $3);
   }
);

nt('arr_destructure_list',
   'parameter', function() { return [$1]; },
   'arr_destructure_list , parameter', function() {
     $1.push($3); return $1;
   }
);

/* Operators */
nt('binary',
   'expression + expression', BinOp('add'),
   'expression - expression', BinOp('sub'),
   'expression / expression', BinOp('div'),
   'expression * expression', BinOp('mult'),
   'expression ++ expression', BinOp('concat'),
   'expression >> expression', BinOp('rcompose'),
   'expression << expression', BinOp('lcompose'),
   'expression |> expression', BinOp('rpipe'),
   'expression <| expression', BinOp('lpipe'),
   'expression == expression', BinOp('eq'),
   'expression != expression', BinOp('neq'),
   'expression <= expression', BinOp('lte'),
   'expression >= expression', BinOp('gte'),
   'expression < expression', BinOp('lt'),
   'expression > expression', BinOp('gt'),
   'expression || expression', BinOp('or'),
   'expression && expression', BinOp('and')
);

nt('unary',
   // '- expression', UnOp('neg'), // TODO: Prescidence
   '! expression', UnOp('not')
);

/* Invocations */
nt('invocation',
   'basic_expression argument_list', Prec('INVOCATION', function() {
     return yy.Invocation($1, $2);
   }),
   'basic_expression !', Prec('INVOCATION', function() {
     return yy.Invocation($1, []);
   })
);

nt('argument_list',
   'argument', function() {
     return [$1];
   },
   'argument_list argument', function() {
     $1.push($2); return $1;
   }
);

nt('argument',
   'basic_expression', id,
   '%', function() {
     return yy.Placeholder(1); // TODO: Add numbered placehodlers
   }
);

/* Lambda */
nt('lambda',
   'FN parameter_list -> expression', Prec('LAMBDA', function() {
     return yy.Lambda($2, $4); // TODO: Convert to statements?
   }),
   'FN parameter_list -> NEWLINE INDENT statements DEDENT', function() {
     return yy.Lambda($2, $6);
   }
);

/* Members */
nt('member',
   'basic_expression . IDENTIFIER', function() {
     return yy.Member($1, $3);
   }
);

nt('basic_expression',
   '( expression )', function() {return $2;},
   'identifier', id,
   'member',     id,
   'literal',    id
);


nt('expression',
   'basic_expression', id,
   'invocation',       id,
   // 'unary',            id,
   'binary',           id,
   'lambda',           id
);

var generator = new Generator(grammar);

// Modify the generator to send the current state & parse table to the lexer
// This is done such that we can implement parse-error(t)
// TODO: Actually implement parse-error(t)
var oldGenerateModuleExpr = generator.generateModuleExpr;
generator.generateModuleExpr = function() {
  var moduleExpr = oldGenerateModuleExpr.apply(this, arguments);
  moduleExpr.replace('self.lexer.lex()', 'self.lexer.lex(table, state)');
  return moduleExpr;
};

// Create the parser
var parser = generator.createParser();

parser.yy = require('./parserScope');
parser.lexer = require('./lexer').lexer;

module.exports = {
  parse: function(input) {
    return parser.parse(input);
  },
  parser: parser
};
