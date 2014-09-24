var Lexer = require('lex');

var lexer = new Lexer;

// Unfortunately, the Lexer provided by the `lex` module, which I am using,
// doesn't support any tracking of location in the document, which is necessary
// for the layout to work correctly, and for useful error messages to be avaliable
// to users. These are patches to the internal functions to fix these problems,
// as well as add support for recording extra information (for use by the layout engine)

var oldAddRule = lexer.addRule;
lexer.addRule = function(re, fn) {
  /* Record the current location in the file */
  return oldAddRule.call(lexer, re, function(lexeme) {
    this.yytext = lexeme;
    // Update the location in the file
    var yyloc = {
      first_column: this.yyloc.last_column,
      first_line: this.yyloc.last_line,
      last_column: this.yyloc.last_column,
      last_line: this.yyloc.last_line,

      first_indent: this.yyloc.last_indent,
      last_indent: this.yyloc.last_indent
    };

    for (var i=0; i < lexeme.length; i++) {
      if (lexeme.charAt(i) === '\n') {
        yyloc.last_column = 0;
        yyloc.last_indent = 1;
        yyloc.last_line++;
        this.yylineno++;
      } else if (lexeme.charAt(i) === '\t') {
        yyloc.last_column++;
        yyloc.last_indent = ((yyloc.last_indent / 8 + 1) | 0) * 8; // TODO: Check!
      } else {
        yyloc.last_column++;
        yyloc.last_indent++;
      }
    }

    this.yyloc = this.yylloc = yyloc;

    // Run the original rule
    var tok = fn.apply(this, arguments);
    if (tok) {
      return {
        tok: tok,
        value: this.yytext,
        loc: yyloc
      };
    } else {
      return undefined;
    }
  });
};

var oldSetInput = lexer.setInput;
lexer.setInput = function(input) {
  lexer.yyloc = {
    first_column: 0,
    first_line: 1,
    last_line: 1,
    last_column: 0,

    first_indent: 1,
    last_indent: 1
  };

  lexer.yylineno = 1;
  lexer.yylloc = lexer.yyloc;

  oldSetInput.apply(this, arguments);
};

/*******************
 * Lexical Grammar *
 *******************/
function reSanitize(x) { // Sanitize a string for adding to a regex
  return x.replace(/[#-}]/g, '\\$&');
}

/* Ignore comments and newlines */
lexer.addRule(/(?:\s|--[^\n]*\n)+/, function(lexeme) {});

/* Operators */
lexer.addRule(new RegExp([
  '++',                                         // Concatenation
  '>>', '<<', '|>', '<|',                       // Control Flow
  '->', '<-',                                   // Functions and binds
  '==', '!=', '<=', '>=', '<', '>',             // Comparison
  '||', '&&', '!',                              // Logical
  '|', '=', ':', '~', '%', ',', '.', ';', '#',  // Special
  '+', '-', '*', '/',                           // Arithmetic
  '{', '}', '(', ')', '[', ']'                  // Brackets
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
var keywords = ['import', 'from', 'as', 'true', 'false', 'fn', 'let', 'do', 'if', 'then', 'else'];
lexer.addRule(/[$a-zA-Z_][$a-zA-Z0-9_]*\b/, function(lexeme) {
  if (keywords.indexOf(lexeme) !== -1)
    return lexeme.toUpperCase();

  this.yytext = lexeme;
  return 'IDENTIFIER';
});

/* Numbers */
lexer.addRule(/[0-9]+(?:\.[0-9]+)?\b/, function(lexeme) {
  this.yytext = lexeme;
  return 'NUMBER';
});

/* EOF */
lexer.addRule(/$/, function(lexeme) {
  return "EOF";
});

module.exports = lexer;
