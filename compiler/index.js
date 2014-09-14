var fs = require('fs');
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
  var parsed = layout.runParser(lexer, parser, source);
  var desugared = desugarer.desugar(parsed);
  console.log(JSON.stringify(desugared, null, 2));
  var transformed = transformer.transform(desugared);

  return escodegen.generate(transformed);
}

function compileFile(fileName) {
  var source = fs.readFileSync(fileName, { encoding: 'utf-8' });
  return compile(source);
}

module.exports = {
  compile: compile,
  compileFile: compileFile
};
