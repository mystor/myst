var fs = require('fs');
var path = require('path');
var jison = require('jison');
// var prettyjson = require('prettyjson');
var compiler = require('myst/compiler');

var p = path.join(__dirname, 'myModule.myst');
var code = fs.readFileSync(p, { encoding: 'UTF-8' });

/*var lexer = require('myst/compiler/lexer').lexer;
var layout = require('myst/compiler/layout');

var layoutTransformer = new layout.LayoutTransformer(lexer);
layoutTransformer.setInput(code);

var tok;
while (typeof (tok = layoutTransformer.lex()) !== 'undefined')
  console.log(tok); */

console.log('***********************');

var parser = require('myst/compiler/parser');
var lexer = require('myst/compiler/lexer');
var layout = require('myst/compiler/layout');

console.log(
    JSON.stringify(layout.parserWrapper(lexer.lexer, parser.parser, code), null, 2));
// console.log(JSON.stringify(parser.parse(code), null, 2));

// var parser = require('myst/compiler/parser');
// console.log(prettyjson.render(parser.parse(code), {}));

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
