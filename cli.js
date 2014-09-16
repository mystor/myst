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
          help: 'Whether to implicitly import the prelude',
          default: true,
          flag: true
        },
        runtime: {
          full: 'runtime',
          help: 'Import path for the runtime',
          default: 'myst/runtime'
        },
        prelude: {
          full: 'prelude',
          help: 'Import path for the prelude',
          default: 'myst/prelude'
        }
      }).parse();

var source = compiler.compileFile(opts.input, opts);
console.log(source); // Write to stdout
