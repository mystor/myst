#!/usr/bin/env node
var compiler = require('./compiler');

// Mocha uses require.extensions to enable loading of tests written
// in languages other than Javascript. As I don't need to force consumers
// of this library to run the test suite, I don't feel bad about using
// require.extensions in this scenario.
if (require.extensions) {
  require.extensions['.myst'] = function(module, filename) {
    try {
      var compiled = compiler.compileFile(filename, {});
      return module._compile(compiled, filename);
    } catch(e) {
      // When there was a problem building the program, simply emit a file
      // which contains a failing test, that way the test reporter knows that
      // the file failed to compile, but doesn't stop running
      return module._compile([
        "suite(" + JSON.stringify(filename) + ", function() {",
        "  test('should compile', function() {",
        "    throw new Error(" + JSON.stringify(e.message) + ");",
        "  });",
        "});"
      ].join('\n'), filename);
    }
  };
}

if (require.main === module) {
  var child_process = require('child_process');
  var path = require('path');

  var cp = child_process.fork(path.join(
    __dirname,
    'node_modules',
    '.bin',
    'mocha'
  ), [ '-u', 'tdd', '--compilers', 'myst:'+__filename ], {
    cwd: __dirname
  });

  cp.on('exit', function(code) {
    process.exit(code);
  });
}
