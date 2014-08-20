var fs = require('fs');
var path = require('path');
var jison = require('jison');
// var prettyjson = require('prettyjson');
var compiler = require('myst/compiler');

var p = path.join(__dirname, 'myModule.myst');
var code = fs.readFileSync(p, { encoding: 'UTF-8' });

console.log('***********************');

var parser = require('myst/compiler/parser');
var lexer = require('myst/compiler/lexer');
var layout = require('myst/compiler/layout');

var ast = layout.runParser(lexer, parser, code);

console.log(JSON.stringify(ast, null, 2));

var desugar = require('myst/compiler/desugar');
console.log(JSON.stringify(desugar.desugar(ast), null, 2));

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
