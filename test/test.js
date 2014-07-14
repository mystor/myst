var fs = require('fs');
var jison = require('jison');
var prettyjson = require('prettyjson');

var jsonOpts = {};

var parser = require('../lib/compiler/parser.js');
var compiler = require('../lib/compiler/compiler.js');
var desugar = require('../lib/compiler/desugar.js');

var escodegen = require('escodegen');

var parsed = parser.parse([
  "main = fn x _ {",
  "  a = b;",
  "  c = a _ x;",
  "  c + x",
  "};",
  "",
  "feign = do name {",
  "  log (str 'hello! ' name);",
  "  x <- read;",
  "  y = parseInt x;",
  "  log y;",
  "};"
].join('\n'));

console.log(prettyjson.render(parsed, jsonOpts));

var desugared = desugar.desugar(parsed);

console.log(prettyjson.render(desugared, jsonOpts));

var transformed = compiler.transform(desugared);

// console.log(prettyjson.render(transformed, jsonOpts));

console.log(escodegen.generate(transformed));

