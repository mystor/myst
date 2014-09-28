// https://github.com/clojure/core.match/wiki/Understanding-the-algorithm

// Match against structure!

var ast = require('./ast');
var Syntax = ast.Syntax;

function isWildcard(x) {
  return Syntax.isPlaceholder(x) || Syntax.isIdentifier(x);
}

function isStructural(x) {
  return Syntax.isObjectDestructure(x) || Syntax.isArrayDestructure(x);
}

function isLiteral(x) {
  return Syntax.isLiteral(x);
}

function isSupersetOf(x, y) {
  if (isWildcard(x))
    return true; // Wildcards are supersets of everything

  if (isLiteral(x)) {
    if (isLiteral(y) && x.value === y.value)
      return true;
    return false;
  }

  if (isStructural(x)) {
    if (isStructural(y) && y.type === x.type) // Stuctural matches are on type - we aren't worried about anything else
      return true;
    return false;
  }

  throw new Error('Unsupported type!');
};

// function necessaryColumn(matchMatrix) {
//   var ranks = matchMatrix.reduce(function(memo, row, rownum) {
//     return memo.map(function(rank, i) {
//       if (rank < rownum) return rank; // Don't change if it falls behind
//       if (!isWildcard(row[i])) {
//         return rank + 1;
//       } else {
//         return rank;
//       }
//     });
//   }, matchMatrix[0].map(function() { return 0; }));
//
//   return ranks.reduce(function(memo, rank, idx) {
//     if (memo.rank < rank)
//       return {idx: idx, rank: rank};
//     else
//       return memo;
//   }, {idx: -1, rank: 0}).idx;
// }

function chooseCol() {
  return 0; // TODO: Actually implement at some point
}

// Generate the identifier and alternatives set if the match is successful
// in the column given (doesn't consider adding new columns, that is done
// seperately.
function successIdsAlts(identifiers, alternatives, col) {
  var newIdentifiers = identifiers.slice();
  newIdentifiers.splice(col, 1); // Drop the identifier
  var id = identifiers[col];

  var newAlternatives = alternatives.map(function(alt) {
    var newTargets = alt.targets.slice();
    newTargets.splice(col, 1); // Drop the target
    var newBody = alt.body;
    if (Syntax.isIdentifier(alt.targets[col])) { // Bind to the value
      newBody = newBody.slice();
      newBody.unshift(Syntax.BasicDeclaration(alt.targets[col], id));
    }
    return Syntax.Alternative(newTargets, newBody);
  });

  return [newIdentifiers, newAlternatives];
}

function toSwitch(identifiers, alternatives) {
  if (identifiers.length === 0)
    return Syntax.Block(alternatives[0].body); // We have reached a terminal branch!

  var col = chooseCol(alternatives);

  // Loop through the alternatives, determining what options we need
  var options = [];
  alternatives.forEach(function(alt) {
    // Add ourselves to any existing option that is a subset of us
    var addOurselves = true;
    options.forEach(function(option) {
      if (isSupersetOf(alt.targets[col], option.cond)) {
        option.alternatives.push(alt); // Add ourselves!
      }

      if (isSupersetOf(option.cond, alt.targets[col])) {
        addOurselves = false;
      }
    });

    if (addOurselves) {
      options.push({
        alternatives: [alt],
        cond: alt.targets[col]
      });
    }
  });

  return options.reduceRight(function(memo, option) {
    var idsAlts = successIdsAlts(identifiers, option.alternatives, col);
    console.log(JSON.stringify(idsAlts, null, 2));
    if (isWildcard(option.cond)) {
      // We don't have to add any new columns, so we're done!
      return toSwitch(idsAlts[0], idsAlts[1]);
    } else if (isLiteral(option.cond)) {
      // Just check, and then we're done!
      return Syntax.If(
        Syntax.Operation('eq', identifiers[col], option.cond),
        [ toSwitch(idsAlts[0], idsAlts[1]) ],
        [ memo ]
      );
    } else {
      throw new Error('Not implemented yet!');
    }
  }, Syntax.Invocation(Syntax.Identifier('error'), []));
}

function processCase(stmt) {
  console.log(JSON.stringify(stmt, null, 2));
  var agumentedExprs = stmt.expressions.map(function(expression) {
    return [expression, ast.uniqueId()];
  });
  var block = Syntax.Block(
    agumentedExprs.map(function(p) {
      return Syntax.BasicDeclaration(p[1], p[0]);
    })
  );
  var identifiers = agumentedExprs.map(function(p) { return p[1]; });

  var cases = toSwitch(identifiers, stmt.alternatives);

  console.log(JSON.stringify(cases, null, 2));
}

exports.processCase = processCase;
