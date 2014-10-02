// https://github.com/clojure/core.match/wiki/Understanding-the-algorithm

// Match against structure!

var ast = require('./ast');
var Syntax = ast.Syntax;

function isWildcard(x) {
  return Syntax.isPlaceholder(x) || Syntax.isIdentifier(x);
}

function isStructural(x) {
  return Syntax.isMapMatch(x) || Syntax.isListMatch(x);
}

function isLiteral(x) {
  return Syntax.isLiteral(x);
}

function ListLength(listMatch) {
  return {
    type: 'ListLength',
    match: listMatch,
    fixed: true,  // TODO: Implement splats
    length: listMatch.items.length
  };
}

function isListLength(x) {
  return x.type === 'ListLength';
}

var IMPLIES = 1
  , UNKNOWN = 0
  , CONTRADICTS = -1;

function logicRltn(x, y) {
  if (isWildcard(y))
    return IMPLIES;  // Everything implies Wildcard!

  else if (isWildcard(x))
    return UNKNOWN;  // No conclusions can be drawn from Wildcard

  else if (isLiteral(x)) {
    if (isLiteral(y) && x.value === y.value) {
      return IMPLIES;
    } else {
      return CONTRADICTS;  // Literals only match other literals with equal values
    }
  }

  else if (isStructural(x)) {
    if (isStructural(x) && x.type === y.type) {
      return IMPLIES;
    } else {
      return CONTRADICTS;
    }
  }

  else if (isListLength(x)) {
    if (isListLength(y)) {
      if (x.fixed) {
        if (y.fixed) {
          if (x.length === y.length) {
            return IMPLIES;
          } else {
            return CONTRADICTS;
          }
        } else {
          if (x.length <= y.length) {
            return IMPLIES;
          } else {
            return CONTRADICTS;
          }
        }
      } else {
        if (y.fixed) {
          if (x.length > y.length) {
            return CONTRADICTS;
          } else {
            return UNKNOWN;
          }
        } else {
          if (x.length >= y.length) {
            return IMPLIES;
          } else {
            return UNKNOWN;
          }
        }
      }
    } else {
      return CONTRADICTS;
    }
  }

  else throw new Error('Unknown type of first argument: ' + x);
}

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
function success(ids, opt, col) {
  var id = ids[col];
  var dropCol = true;

  var newAlts = opt.alternatives.map(function(alt) {
    var target = alt.targets[col];
    if (logicRltn(opt.cond, target) === IMPLIES) {
      var newTargets = alt.targets.slice();
      var newBody = alt.body.slice();

      // Add any variable bindings to the body of the condition
      if (Syntax.isIdentifier(target)) {
        newBody.unshift(Syntax.BasicDeclaration(target, id));
      }

      // Replace the column item with a wildcard, as it has been tested
      newTargets[col] = Syntax.Placeholder(); // TODO: Check this is correct
      return Syntax.Alternative(newTargets, newBody);
    } else {
      // We have found another item in this column which might need to be checked
      // Thus, we cannot drop the column
      dropCol = false;
      return alt;
    }
  });

  if (dropCol) {
    // Drop the column from every alternative
    newAlts.forEach(function(alt) {
      alt.targets.splice(col, 1);
    });

    // As well as from the ids list
    ids = ids.slice();
    ids.splice(col, 1);
  }

  return [ids, newAlts];
}

function toSwitch(identifiers, alternatives) {
  if (identifiers.length === 0)
    return Syntax.Block(alternatives[0].body); // We have reached a terminal branch!

  var col = chooseCol(alternatives);

  // Determine what options must be considered at this switching point
  // We want the minimal set of options necessary
  var options = [];
  alternatives.forEach(function(alt) {
    var addOurselves = true;
    var target = alt.targets[col];
    options.forEach(function(option) {
      // If the given option doesn't contradict our target, we want
      // to add ourselves to that option's alternative list
      if (logicRltn(option.cond, target) !== CONTRADICTS) {
        option.alternatives.push(alt);

        // If every time our target is true, the condition is also true,
        // we have our bases covered, and no longer need to add ourselves
        if (logicRltn(target, option.cond) === IMPLIES) {
          addOurselves = false;
        }
      }
    });

    if (addOurselves) {
      options.push({
        alternatives: [alt],
        cond: alt.targets[col]
      });
    }
  });


  return options.reduceRight(function(els, option) {
    var successIdsAlts = success(identifiers, option, col);
    var thnIds = successIdsAlts[0], thnAlts = successIdsAlts[1];
    var id = identifiers[col];

    if (isWildcard(option.cond)) {
      return toSwitch(thnIds, thnAlts);
    }

    else if (isLiteral(option.cond)) {
      return Syntax.If(
        Syntax.Operation('eq', id, option.cond),
        [ toSwitch(thnIds, thnAlts) ],
        [ els ]
      );
    }

    else if (Syntax.isListMatch(option.cond)) {
      thnIds = thnIds.slice(); thnIds.push(id); // Add the ID
      thnAlts = thnAlts.map(function(alt, i) {
        var newTargets = alt.targets.slice();
        newTargets.push(ListLength( // Get the original condition, and create a listlength
          option.alternatives[i].targets[col]
        ));
        return Syntax.Alternative(
          newTargets,
          alt.body
        );
      });
      return Syntax.If(
        Syntax.Invocation(Syntax.Identifier('isList'), [ id ]),
        [ toSwitch(thnIds, thnAlts) ],
        [ els ]
      );
    }

    else if (isListLength(option.cond)) {
      var nIds = {};
      var rows = [];

      option.alternatives.forEach(function(alt) {
        var target = alt.targets[col];
        var row = {};
        if (logicRltn(option.cond, target) === IMPLIES &&
            isListLength(target)) {
          target.match.items.forEach(function(item, i) {
            if (Syntax.isPlaceholder(item)) return;

            // TODO: Handle splats and negative indices

            nIds[i] = nIds[i] || ast.uniqueId();
            row[i] = item;
          });
        }
        rows.push(row);
      });

      var necessaryIdxs = Object.keys(nIds);
      thnIds = thnIds.concat(necessaryIdxs.map(function(i) { return nIds[i]; }));

      thnAlts = thnAlts.map(function(alt, i) {
        var row = rows[i];
        var newTargets = alt.targets.concat(
          necessaryIdxs.map(function(idx) {
            return row[idx] || Syntax.Placeholder();
          })
        );
        return Syntax.Alternative(
          newTargets,
          alt.body
        );
      });

      var body = necessaryIdxs.map(function(idx) {
        return Syntax.BasicDeclaration(nIds[idx],
                                       Syntax.Operation('get', id, Syntax.Literal(Number(idx))));
      });
      body.push(toSwitch(thnIds, thnAlts));

      return Syntax.If(
        Syntax.Operation(
          option.cond.fixed ? 'eq' : 'gte',
          Syntax.Invocation(Syntax.Identifier('length'), [ id ]),
          Syntax.Literal(option.cond.length)
        ),
        body,
        [ els ]
      );
    }

    else throw new Error('BAKJHASDJHGASKD');
  }, Syntax.Invocation(Syntax.Identifier('error'), []));
}

function processCase(stmt) {
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

  block.body.push(cases);
  return block;
}

exports.processCase = processCase;
