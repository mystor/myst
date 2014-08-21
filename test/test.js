var fs = require('fs');
var path = require('path');
var jison = require('jison');
var escodegen = require('escodegen');
// var prettyjson = require('prettyjson');
var compiler = require('myst/compiler');

var p = path.join(__dirname, 'myModule.myst');
var code = fs.readFileSync(p, { encoding: 'UTF-8' });

console.log('***********************');

var parser = require('myst/compiler/parser');
var lexer = require('myst/compiler/lexer');
var layout = require('myst/compiler/layout');

var ast = layout.runParser(lexer, parser, code);

// console.log(JSON.stringify(ast, null, 2));

var desugar = require('myst/compiler/desugar');
var desugared = desugar.desugar(ast);

var transform = require('myst/compiler/transformer');
var transformed = transform.transform(desugared);
console.log(JSON.stringify(transformed, null, 2));

var out = escodegen.generate(transformed);
console.log(out);

/* var compiled = compiler.compile(code);

console.log([
  "******************",
  "* Generated Code *",
  "******************",
  ""
].join('\n'));
console.log(compiled);

var out = path.join(__dirname, 'myModule.js_out');
fs.writeFileSync(out, compiled, { encoding: 'UTF-8' });

console.log([
  "********************",
  "* Execution Result *",
  "********************",
  ""
].join('\n'));
var myModule = require('./myModule.js_out');
myModule.main();
*/
