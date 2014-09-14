var fs = require('fs');
var escodegen = require('escodegen');

/* Reading in Myst code */
var lexer = require('./lexer.js');
var layout = require('./layout.js');
var parser = require('./parser.js');

/* Simplifying & Optimizing */
var desugarer = require('./desugar.js');

/* Emitting JavaScript code */
var emitter = require('./emitter.js');

function compile(source) {
  var parsed = layout.runParser(lexer, parser, source);
  var desugared = desugarer.desugar(parsed);
  var emitted = emitter.emit(desugared);

  return escodegen.generate(emitted);
}

function compileFile(fileName) {
  var source = fs.readFileSync(fileName, { encoding: 'utf-8' });
  return compile(source);
}

module.exports = {
  compile: compile,
  compileFile: compileFile
};
