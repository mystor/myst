var compiler = require('./compiler');

var opts = require('nomnom')
      .script('myst')
      .options({
        input: {
          position: 0,
          help: 'Myst file to compile',
          required: true
        },
        importPrelude: {
          full: 'import-prelude',
          default: true,
          flag: true
        }
      }).parse();

var source = compiler.compileFile(opts.input, opts);
console.log(source); // Write to stdout
