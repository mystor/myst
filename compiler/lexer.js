var Lexer = require('lex');

function reSanitize(x) {
  return x.replace(/[#-}]/g, '\\$&');
}

var lexer = new Lexer;

lexer.showPosition = function() {
  /* Lexers support displaying the current position in the document in Jison */
  var indent = this.yyloc.last_column;
  var some = this.input.substring(this.index - indent);
  var lineEnd = some.indexOf('\n');
  var segment = some.substring(0, lineEnd);
  return segment + '\n' + Array(this.yyloc.first_column + 1).join('-') + '^';
};

var oldAddRule = lexer.addRule;
lexer.addRule = function(re, fn) {
  /* Record the current location in the file */
  return oldAddRule.call(lexer, re, function(lexeme) {
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
        yytext: this.yytext,
        loc: yyloc
      };
    } else {
      return undefined;
    }
  });
};

/*******************
 * Lexical Grammar *
 *******************/

/* Ignore comments and newlines */
lexer.addRule(/(?:\s|--[^\n]*\n)+/, function(lexeme) {});

/* Brackets */
lexer.addRule(/\{|\(|\[/, function(lexeme) {
  return lexeme;
});

lexer.addRule(/\}|\)|\]/, function(lexeme) {
  return lexeme;
});

/* Operators */
lexer.addRule(new RegExp([
  '++',                                    // Concatenation
  '>>', '<<', '|>', '<|',                  // Control Flow
  '->', '<-',                              // Functions and binds
  '==', '!=', '<=', '>=', '<', '>',        // Comparison
  '||', '&&', '!',                         // Logical
  '|', '=', ':', '~', '%', ',', '.', ';',  // Special
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
var keywords = ['import', 'from', 'as', 'true', 'false', 'fn', 'let', 'do'];
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

/* The layout Lexer handles the problem of inserting { } and ; when necessary */
var layoutLexer = new (function LayoutLexer() {
  var tokens = [];

  this.yyloc = this.yylloc = {
    first_column: 0,
    first_line: 1,
    last_column: 0,
    last_line: 1
  };
  this.yylineno = 0;

  /**************************
   * LAYOUT TRANSFORMATIONS *
   **************************/
  // Taken from http://www.haskell.org/onlinereport/syntax-iso.html
  // Translated to imperitive form (probably with horrific errors)

  // Layout Tokens
  function CurlyLayoutToken(n) {this.n = n; this.tok = '{'+n+'}';}
  function PointyLayoutToken(n) {this.n = n; this.tok = '<'+n+'>';}

  // Run the script to insert layout tokens before laying out!
  function insertLayoutTokens(tokens) {
    tokens = tokens.slice();

    // Ensure that the last element is EOF and pop it
    var EOF = tokens.pop();
    if (EOF.tok !== 'EOF')
      throw new Error('Last token is not EOF'); // TODO: Will this ever happen?

    var idx = 0;

    // If the first lexeme is preceded only by whitespace on the same line, the lexeme
    // is preceded by {n} where n is the indentation of the lexeme
    if (['{'].indexOf(tokens[0].tok) === -1) {
      var n = tokens[0].loc.first_indent;
      tokens.unshift(new CurlyLayoutToken(n));
      idx++;
    }

    while (idx < tokens.length) {
      var jump = 1;

      // if not followed by lexeme '{', token '{n}" added after
      // the keyword, where n is the indentation of the next lexeme
      // if there is one, or 0 if the next lexeme is EOF
      var specialKeywords = ['=', 'DO'];
      if (specialKeywords.indexOf(tokens[idx].tok) !== -1) { // Is 'let', 'where', 'do' or 'of'
        if (tokens.length === idx + 1) {                                     // at EOF
          tokens.push(new CurlyLayoutToken(0));
          jump++;
        } else if (tokens[idx + 1].tok !== '{' ||                            // no explicit block
                   tokens.length > idx + 3 && tokens[idx + 3].tok === ':') { // { part of Object Literal
          var n = tokens[idx + 1].loc.first_indent;
          tokens.splice(idx + 1, 0, new CurlyLayoutToken(n));
          jump++;
        }
      }

      // Where the start of a lexeme is preceded only by white space on the same line,
      // this lexeme is preceded by <n> where n is the indentation of the lexeme, provided
      // that it is not, as a consequence of the other rules, preceded by {n}
      if (idx === 0 ||                                                  // First token OR
          (! (tokens[idx - 1] instanceof CurlyLayoutToken) &&           // Not preceded by {n} AND
           tokens[idx - 1].loc.last_line < tokens[idx].loc.last_line)) {// First on line
        // Preceded by <n>
        var n = tokens[idx].loc.first_indent;
        tokens.splice(idx, 0, new PointyLayoutToken(n));
        jump++;
      }

      // Move to the next token
      idx += jump;
    }

    tokens.push(EOF);
    return tokens;
  }

  function layout(tokens) {
    var remaining = tokens.slice();
    var EOF = remaining.pop();
    var out = [];
    var stack = [];

    while (remaining.length > 0) {
      var tok = remaining.shift();        // Tok is the current token (automatically popped)
      var stackEmpty = stack.length <= 0; // Is the stack empty?
      var m = !stackEmpty ? stack[0] : 0; // m is the first element in the stack (or 0)

      if (tok instanceof PointyLayoutToken) {       // L (<n>:ts) ms
        if (!stackEmpty && m == tok.n) {            // L (<n>:ts) (m:ms) = ; : (L ts (m:ms)) if m = n
          out.push(';');
        } else if (!stackEmpty && tok.n < m) {      // L (<n>:ts) (m:ms) = } : (L (<n>:ts) ms) if n < m
          out.push('}');
          stack.shift();
          remaining.unshift(tok);
        } else {                                    // L (<n>:ts) ms = L ts ms
        }
      } else if (tok instanceof CurlyLayoutToken) {
        if (stack.length > 0 && tok.n > stack[0]) { // L({n}:ts) (m:ms) = { : (L ts (n:m:ms)) if n > m
          stack.unshift(tok.n);
          out.push('{');
        } else if (tok.n > 0) {                     // L ({n}:ts) [] = { : (L ts [n]) if n > 0
          stack.unshift(tok.n);
          out.push('{');
        } else {                                    // L ({n}:ts) ms = { : } : (L (<n>:ts) ms)
          out.push('{');
          out.push('}');
          remaining.unshift(new PointyLayoutToken(tok.n));
        }
      } else if (tok.tok === '}') {
        if (!stackEmpty && m === 0) {               // L (}:ts) (0:ms) = } : (L ts ms)
          out.push('}');
          stack.shift();
        } else {
          throw new Error('Implicit closing brace matches implicit opening brace');
        }
      } else if (tok.tok === '{') {                 // L ({:ts) ms = { : (L ts (0:ms))
        out.push('{');
        stack.unshift(0);
      } else {
        if (!stackEmpty && m !== 0 && false) {     // L (t:ts) (m:ms) = } : (L (t:ts) ms)
          // TODO: Implement parse-error(t)        //     if m != 0 and parse-error(t)
          out.push('}');
          remaining.unshift(tok);
          stack.shift();
        } else {                                   // L (t:ts) ms = t : (L ts ms)
          out.push(tok);
        }
      }
    }

    // Finalize any contexts
    while (stack.length > 0) {
      if (stack[0] === 0) {
        throw new Error('At EOF and inside explicit context');
      }
      out.push('}');
      stack.shift();
    }

    // Add the EOF token back on
    out.push(EOF);
    return out;
  }

  this.setInput = function(input) {
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

    // Set up the internal lexer
    lexer.setInput(input);

    // Run the internal lexer
    tokens = [];
    var tok;
    while (typeof (tok = lexer.lex()) !== 'undefined') {
      tokens.push(tok);
    }

    // Perform the layouting
    tokens = insertLayoutTokens(tokens);
    tokens = layout(tokens);

    tokens.forEach(function(token) {
      if (typeof token === 'string') // TODO: Fix this
        console.log(token);
      else
        console.log(token.tok);
    });
  };

  this.lex = function() {
  };
})();

module.exports = {
  lex: function(input) {
    layoutLexer.setInput(input);
    /* lexer.setInput(input);
    var tokens = [];
    var token;
    while (typeof (token = lexer.lex()) !== 'undefined') {
      tokens.push(token);
    }
    return tokens; */
  },
  lexer: lexer
};
