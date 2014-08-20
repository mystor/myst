var escodegen = require('escodegen');

/* Reading in Myst code */
var lexer = require('./lexer.js');
var layout = require('./layout.js');
var parser = require('./parser.js');

/* Simplifying & Optimizing */
var desugarer = require('./desugar.js');

/* Emitting JavaScript code */
var transformer = require('./transformer.js');

function compile(source) {
  var parsed = layout.parserWrapper(lexer.lexer, parser.parser, source);
  var desugared = desugarer.desugar(parsed);
  var transformed = transformer.transform(desugared);

  return escodegen.generate(transformed);
}

module.exports = {
  compile: compile
};

