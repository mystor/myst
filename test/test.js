var fs = require('fs');
var path = require('path');
var jison = require('jison');
var prettyjson = require('prettyjson');
var compiler = require('myst/compiler');

var p = path.join(__dirname, 'myModule.myst');
var code = fs.readFileSync(p, { encoding: 'UTF-8' });

var compiled = compiler.compile(code);

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
