var escodegen = require('escodegen');
var esmangle = require('esmangle');

var parser = require('./parser.js');
var desugarer = require('./desugar.js');
var transformer = require('./transformer.js');

function compile(source, minify) {
  var parsed = parser.parse(source);
  var desugared = desugarer.desugar(parsed);
  var transformed = transformer.transform(desugared);
  
  if (minify) {
    var optimized = esmangle.optimize(transformed, null);
    var mangled = esmangle.mangle(optimized);

    return escodegen.generate(mangled, {
      format: {
        renumber: true,
        hexadecimal: true,
        escapeless: true,
        compact: true,
        semicolons: false,
        parentheses: false
      }
    });
  }

  return escodegen.generate(transformed);
}

module.exports = {
  compile: compile
};

