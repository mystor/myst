var fs = require('fs');
var escodegen = require('escodegen');
var immutable = require('immutable');

/* Reading in Myst code */
var lexer = require('./lexer.js');
var layout = require('./layout.js');
var parser = require('./parser.js');

/* Simplifying & Optimizing */
var desugarer = require('./desugar.js');

/* Emitting JavaScript code */
var emitter = require('./emitter.js');

function compile(source, options) {
  options = immutable.Map({
    importPrelude: true,
    prelude: 'myst/prelude',
    runtime: 'myst/runtime'
  }).merge(options).toObject();

  var parsed = layout.runParser(lexer, parser, source, options);
  var desugared = desugarer.desugar(parsed, options);
  var emitted = emitter.emit(desugared, options);

  return escodegen.generate(emitted);
}

function compileFile(fileName, options) {
  var source = fs.readFileSync(fileName, { encoding: 'utf-8' });
  return compile(source, options);
}

module.exports = {
  compile: compile,
  compileFile: compileFile
};
