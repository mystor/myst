var Parser = require('jison').Parser;

function BinOp(name) {
  return (function() {
    return yy.Operation(__name__, $1, $3);
  }).toString().replace('__name__', JSON.stringify(name));
}

function UnOp(name) {
  return (function() {
    return yy.UnaryOperation(__name__, $2);
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
    var newVal = [arguments[i-1], "$$ = (" + arguments[i].toString() + ")(); /* $$.loc = @0; */"];
    if (arguments[i].prec)
      newVal.push({prec: arguments[i].prec});

    val.push(newVal);
  }

  grammar.bnf[nonterminal] = val;
}

/** BEGIN GRAMMAR **/

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
    ['left', '#'],
    ['left', '.', ':'],
    ['left', 'NEG'],
    ['left', 'INVOCATION']
  ],

  bnf: {
    start: [['program', 'return $1;']]
  }
};

nt('opt_semi',
   '', function() {},
   ';', function() {}
);

/* Simple Primitive Objects */
nt('identifier',
   'IDENTIFIER', function() {
     return yy.Identifier($1);
   }
);

nt('identifierName',
   'identifier', id,
   'IMPORT', function() { return yy.Identifier('import'); },
   'FROM', function() { return yy.Identifier('from'); },
   'AS', function() { return yy.Identifier('as'); },
   'TRUE', function() { return yy.Identifier('true'); },
   'FALSE', function() { return yy.Identifier('false'); },
   'FN', function() { return yy.Identifier('fn'); },
   'LET', function() { return yy.Identifier('let'); },
   'DO', function() { return yy.Identifier('do'); },
   'IF', function() { return yy.Identifier('if'); },
   'THEN', function() { return yy.Identifier('then'); },
   'ELSE', function() { return yy.Identifier('else'); }
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

/* Program Entry Point */
nt('program',
   '{ statements } EOF', function() {
     return yy.Program($2);
   }
);

nt('statements',
   'statement', function() {
     return [$1];
   },
   'statements ; statement', function() {
     var x = $1.slice(); x.push($3); return x;
   }
);

nt('statement',
   'expression', id,
   'import', id,
   'declaration', id
);

nt('import_segment',
   '.', function() { return '.'; },
   '. .', function() { return '..'; },
   'IDENTIFIER', function() { return $1; }
);

nt('import_segments',
   'import_segment', function() {
     return [$1];
   },
   'import_segments / import_segment', function() {
     var x = $1.slice(); x.push($3); return x;
   }
);

nt('import',
   'IMPORT import_segments', function() {
     var as = $2[$2.length - 1];
     if (as === '.' || as === '..') throw new Error('Last segment in import must be identifier');
     return yy.Import(yy.Literal($2.join('/')), yy.Identifier($2[$2.length - 1]));
   },
   'IMPORT literal AS identifier', function() {
     return yy.Import($2, $4);
   }
);

nt('declaration', // TODO: Add guards
   'LET bind_target = { statements }', function() {
     return yy.Declaration($2, $5);
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
     var x = $1.slice(); x.push($2); return x;
   }
);

nt('parameter',
   'identifier', id,
   'destructure', id  // TODO: Re-implement
);

/* Operators */
nt('binary',
   'expression + expression', BinOp('add'),
   'expression - expression', BinOp('sub'),
   'expression / expression', BinOp('div'),
   'expression * expression', BinOp('mul'),
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
   '- expression', Prec('NEG', UnOp('neg')), // TODO: Prescidence
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
     var x = $1.slice(); x.push($2); return x;
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
   'FN parameter_list -> { statements }', Prec('LAMBDA', function() {
     return yy.Lambda($2, $5);
   }),
   'FN -> { statements }', Prec('LAMBDA', function() {
     return yy.Lambda([], $4);
   })
);

nt('if',
   'IF expression THEN { statements }', function() {
     return yy.If($2, $5, []);
   },
   'IF expression THEN { statements } ELSE { statements }', function() {
     return yy.If($2, $5, $9);
   }
);

/* Members */
nt('member',
   'basic_expression . identifierName', function() {
     return yy.Member($1, $3.name);
   },
   'basic_expression : identifierName', function() {
     return yy.Method($1, $3.name);
   }
);

nt('merge',
   'basic_expression # basic_expression', function() {
     return yy.Merge($1, $3);
   }
);

nt('data_literal',
   'OBJ mapish', function() {
     return yy.Map('Obj', $2);
   },
   'MAP mapish', function() {
     return yy.Map('Map', $2);
   },
   'ARR vecish', function() {
     return yy.Vec('Arr', $2);
   },
   'VEC vecish', function() {
     return yy.Vec('Vec', $2);
   },
   'SET vecish', function() {
     return yy.Vec('Set', $2);
   }
);

nt('mapish',
   '{ opt_semi }', function() { return []; },
   '{ properties opt_semi }', function() { return $2; }
);

nt('properties',
   'property', function() {
     return [$1];
   },
   'properties ; property', function() {
     return $1.concat($3);
   }
);

nt('property',
   'identifierName : expression', function() {
     return yy.Property($1, $3);
   }
);

nt('vecish',
   '{ opt_semi }', function() { return []; },
   '{ items opt_semi }', function() { return $2; }
);

nt('items',
   'expression', function() {
     return [$1];
   },
   'items ; expression', function() {
     return $1.concat($3);
   }
);

nt('optional_match_identifier',
   '', function() {
     return null;
   },
   '@ identifier', function() {
     return $2;
   }
);

nt('list_match',
   '[ ] optional_match_identifier', function() {
     return yy.ListMatch([], $3);
   },
   '[ match_list ] optional_match_identifier', function() {
     return yy.ListMatch($2, $4);
   }
);

nt('match_list',
   'match', function() {
     return [$1];
   },
   'match_list ; match', function() {
     var x = $1.slice(); x.push($3); return x;
   },
   // Splats
   '.. identifier', function() {
     return [yy.Splat($2)];
   },
   'match_list ; .. identifier', function() {
     var x = $1.slice(); x.push(yy.Splat($4)); return x;
   }
);

nt('match',
   'map_match', id,  // TODO: Implement
   'list_match', id,
   'identifier', id,
   'placeholder', id,
   'literal', id
);

nt('alternative',
   'match -> { statements }', function() {
     return yy.Alternative([$1], $4);
   }
);

nt('alternative_list',
   'alternative', function() {
     return [$1];
   },
   'alternative_list ; alternative', function() {
     var x = $1.slice(); x.push($3); return x;
   }
);

nt('case',
   'CASE expression OF { alternative_list }', function() {
     return yy.Case([$2], $5);
   }
);

nt('basic_expression',
   '( expression )', function() {return $2;},
   'identifier',   id,
   'member',       id,
   'literal',      id,
   'lambda',       id,
   'data_literal', id,
   'merge',        id,
   'case',         id
);


nt('expression',
   'basic_expression', id,
   'invocation',       id,
   'binary',           id,
   'unary',            id,
   'if',               id
);

/** END GRAMMAR **/

var parser = new Parser(grammar);
parser.yy = require('./ast').Syntax;

module.exports = parser;
