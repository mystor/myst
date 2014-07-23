var fs = require('fs');
var jison = require('jison');
var prettyjson = require('prettyjson');
var compiler = require('myst/compiler');

/* var parsed = parser.parse([
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

var parsed = parser.parse([
  "log = fn msg { bind G::console::log (fn log { log msg }) };",
  "main = log 'Hello World!';"
  ].join('\n')); */

/* var parsed = parser.parse([
  "Maybe = extend Monad {",
  "  bind: fn a b {",
  "    if (instance Just a)",
  "       (b a.value)",
  "       a",
  "  },",
  "  return: Just",
  "};",

  "Just = data a { value: a };",
  "Nothing = data { value: error 'Attempt to get value of Nothing' };",

  "main = do IO {",
  "  return = IO.return;",
  "  console::log 'Hello World';",
  "  return 10",
  "};"
  ].join('\n')); */

var code = [
  "import 'fs' as fs;",
  "main = do IO {",
  "  x <- hello 'world';",
  "  print x;",
  "};"
].join('\n');

console.log(compiler.compile(code));
