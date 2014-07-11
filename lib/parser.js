var fs = require('fs');
var jison = require('jison');
var prettyjson = require('prettyjson');

var jsonOpts = {};

var bnf = fs.readFileSync('lib/parser.jison', 'utf8');
var parser = new jison.Parser(bnf);

console.log(prettyjson.render(parser.parse([
  "main = fn x {",
  "  y = add x.y, 'apples';",
  "  in y",
  "  where z = 5;",
  "};"
].join('\n')), jsonOpts));

console.log(prettyjson.render(parser.parse([
  "main = repeatedly do {",
  "  x <- getStringInput;",
  "  y = plus (parseInt x), 10;",
  "  putStringOutput x;",
  "};"
].join('\n')), jsonOpts));

