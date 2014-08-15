var Lexer = require('lex');

function reSanitize(x) {
  return x.replace(/[#-}]/g, '\\$&');
}

var lexer = new Lexer;

var inBraces = 0;
var indent = [0];

var oldAddRule = lexer.addRule;
lexer.addRule = function(re, fn) {
  return oldAddRule.call(lexer, re, function(lexeme) {
    this.yyloc.first_column = this.yyloc.last_column;
    this.yyloc.first_line = this.yyloc.last_line;
    for (var i=0; i < lexeme.length; i++) {
      if (lexeme.charAt(i) === '\n') {
        this.yyloc.last_column = 0;
        this.yyloc.last_line++;
      } else {
        this.yyloc.last_column++;
      }
    }

    return fn.apply(this, arguments);
  });
};

/* Comments & Newlines */
lexer.addRule(/(?:--[^\n]*)?\n[\t ]*/g, function(lexeme) {
  if (inBraces)
    return undefined;

  var tokens = ['NEWLINE'];

  var indentation = lexeme.split('\n')[1].length;

  if (indentation > indent[0]) {
    indent.unshift(indentation);
    tokens.push('INDENT');
  } else {
    while (indentation < indent[0]) {
      tokens.push('DEDENT');
      indent.shift();
    }
  }

  return tokens;
});

/* Ignore Other Whitespace */
lexer.addRule(/\s+/, function(lexeme) {});

/* Keywords */
lexer.addRule(/(?:import|from|as|true|false|fn)\w/, function(lexeme) {
  return lexeme.toUpperCase();
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
lexer.addRule(/[$a-zA-Z_][$a-zA-Z0-9_]*\b/, function(lexeme) {
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
