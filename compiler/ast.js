var idCounter = 0;
function uniqueId(loc) {
  return { type: 'Identifier', name: '__' + idCounter++, loc: loc };
}

module.exports = {
  uniqueId: uniqueId
};

