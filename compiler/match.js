// https://github.com/clojure/core.match/wiki/Understanding-the-algorithm

// Match against structure!

var Syntax = require('./ast').Syntax;

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


function generateSwitch(matchMatrix, column, values, row) {
  var conds = matchMatrix.map(function(row) {
    return row[column];
  });

  var options = getOptions(conds);

  options.reduceRight(function(memo, option) {
  });
}

/* [Destructure] -> [{cond: Destructure, nums: [int]}] */
// Refine to unique destructures, and list branches which are satisfied by each
function getOptions(conds) {
  // Returns all unique conditions, and the rows which match them
  var unique = conds.reduce(function(memo, cond, condnum) {
    // { cond: cond, nums: [] }
    var found = false;
    memo = memo.map(function(item) {
      if (sameBranch(item.cond, cond)) {
        item.nums.append(condnum);
        found = true;
      }
      return item;
    });

    if (!found) memo.append({ cond: cond, nums: [condnum] });

    return memo;
  }, []);

  return unique;
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
