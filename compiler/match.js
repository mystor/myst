// https://github.com/clojure/core.match/wiki/Understanding-the-algorithm

// Match against structure!

var Syntax = require('./parserScope');

function assert(c) {
  if (!c) throw new Error("Assertion failed!");
}

function isWildcard(x) {
  return Syntax.isPlaceholder(x) || Syntax.isIdentifier(x);
}

function isStructural(x) {
  return Syntax.isObjectDestructure(x) || Syntax.isArrayDestructure(x);
}

function isLiteral(x) {
  return Syntax.isLiteral(x);
}


function necessaryColumn(matchMatrix) {
  assert(matchMatrix.length > 0);


  var ranks = matchMatrix.reduce(function(memo, row, rownum) {
    return memo.map(function(rank, i) {
      if (rank < rownum) return rank; // Don't change if it falls behind
      if (!isWildcard(row[i])) {
        return rank + 1;
      } else {
        return rank;
      }
    });
  }, matchMatrix[0].map(function() { return 0; }));

  return ranks.reduce(function(memo, rank, idx) {
    if (memo.rank < rank)
      return {idx: idx, rank: rank};
    else
      return memo;
  }, {idx: -1, rank: 0}).idx;
}

var example =
[[
  Syntax.Literal(5),
  Syntax.Literal(3),
  Syntax.Identifier('a')
],
[
  Syntax.Placeholder(),
  Syntax.Placeholder(),
  Syntax.Literal(3)
]];

console.log(necessaryColumn(example));
