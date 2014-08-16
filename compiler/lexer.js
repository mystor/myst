var Lexer = require('lex');

function reSanitize(x) {
  return x.replace(/[#-}]/g, '\\$&');
}

var lexer = new Lexer;

// Modify the lexer - adding support for new stuff
lexer.showPosition = function() {
  var indent = this.yyloc.last_column;
  var some = this.input.substring(this.index - indent);
  var lineEnd = some.indexOf('\n');
  var segment = some.substring(0, lineEnd);
  return segment + '\n' + Array(this.yyloc.first_column + 1).join('-') + '^';
};

var inBraces = 0;
var indent = [0];

var oldAddRule = lexer.addRule;
lexer.addRule = function(re, fn) {
  return oldAddRule.call(lexer, re, function(lexeme) {
    // Update the location in the file
    var yyloc = {
      first_column: this.yyloc.last_column,
      first_line: this.yyloc.last_line,
      last_column: this.yyloc.last_column,
      last_line: this.yyloc.last_line
    };

    for (var i=0; i < lexeme.length; i++) {
      if (lexeme.charAt(i) === '\n') {
        yyloc.last_column = 0;
        yyloc.last_line++;
        this.yylineno++;
      } else {
        yyloc.last_column++;
      }
    }

    this.yyloc = this.yylloc = yyloc;

    // Run the original rule
    return fn.apply(this, arguments);
  });
};

/* Comments & Newlines */
lexer.addRule(/(?:\s|--[^\n]*\n)+/, function(lexeme) {
  if (inBraces || lexeme.indexOf('\n') === -1) return undefined;

  var tokens = ['NEWLINE'];

  var lines = lexeme.replace(/\t/, '        ').split('\n');
  var indentation = lines[lines.length - 1].length;

  if (indentation > indent[0]) {
    indent.unshift(indentation);
    tokens.push('INDENT');
  } else {
    while (indentation < indent[0]) {
      tokens.push('DEDENT');
      indent.shift();
    }
  }

  console.log(tokens);

  return tokens;
});

/* Brackets */
lexer.addRule(/\{|\(|\[/, function(lexeme) {
  inBraces++;
  return lexeme;
});

lexer.addRule(/\}|\)|\]/, function(lexeme) {
  if (inBraces > 0)
    inBraces--;
  else
    throw new Error("Unexpected closing brace");

  return lexeme;
});

/* Operators */
lexer.addRule(new RegExp([
  '++',                                    // Concatenation
  '>>', '<<', '|>', '<|',                  // Control Flow
  '->', '<-',                              // Functions and binds
  '==', '!=', '<=', '>=', '<', '>',        // Comparison
  '||', '&&', '!',                         // Logical
  '|', '=', ':', '~', '%', ',', '.',       // Special
  '+', '-', '*', '/'                       // Arithmetic
].map(reSanitize).join('|')), function(lexeme) {
  return lexeme;
});

/* Strings */
lexer.addRule(/'(?:\\'|[^'])*'/, function(lexeme) {
  this.yytext = lexeme;
  return 'STRING';
});

lexer.addRule(/"(?:\\"|[^"])*"/, function(lexeme) {
  this.yytext = lexeme;
  return 'STRING';
});

/* Identifiers */
var keywords = ['import', 'from', 'as', 'true', 'false', 'fn', 'let'];
lexer.addRule(/[$a-zA-Z_][$a-zA-Z0-9_]*\b/, function(lexeme) {
  if (keywords.indexOf(lexeme) !== -1)
    return lexeme.toUpperCase();

  this.yytext = lexeme;
  return 'IDENTIFIER';
});

/* Numbers */
lexer.addRule(/[0-9]+(?:"."[0-9]+)?\b/, function(lexeme) {
  this.yytext = lexeme;
  return 'NUMBER';
});

/* EOF */
lexer.addRule(/$/, function(lexeme) {
  return "EOF";
});

module.exports = {
  lex: function(input) {
    lexer.setInput(input);
    var tokens = [];
    var token;
    while (typeof (token = lexer.lex()) !== 'undefined') {
      tokens.push(token);
    }
    return tokens;
  },
  lexer: lexer
};
