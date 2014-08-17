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
        out.push({tok: ';'});
      } else if (!stackEmpty && tok.n < m) {      // L (<n>:ts) (m:ms) = } : (L (<n>:ts) ms) if n < m
        out.push({tok: '}'});
        stack.shift();
        remaining.unshift(tok);
      } else {                                    // L (<n>:ts) ms = L ts ms
      }
    } else if (tok instanceof CurlyLayoutToken) {
      if (stack.length > 0 && tok.n > stack[0]) { // L({n}:ts) (m:ms) = { : (L ts (n:m:ms)) if n > m
        stack.unshift(tok.n);
        out.push({tok: '{'});
      } else if (tok.n > 0) {                     // L ({n}:ts) [] = { : (L ts [n]) if n > 0
        stack.unshift(tok.n);
        out.push({tok: '{'});
      } else {                                    // L ({n}:ts) ms = { : } : (L (<n>:ts) ms)
        out.push({tok: '{'});
        out.push({tok: '}'});
        remaining.unshift(new PointyLayoutToken(tok.n));
      }
    } else if (tok.tok === '}') {
      if (!stackEmpty && m === 0) {               // L (}:ts) (0:ms) = } : (L ts ms)
        out.push(tok /*}*/);
        stack.shift();
      } else {
        throw new Error('Implicit closing brace matches implicit opening brace');
      }
    } else if (tok.tok === '{') {                 // L ({:ts) ms = { : (L ts (0:ms))
      out.push(tok /*{*/);
      stack.unshift(0);
    } else {
      if (!stackEmpty && m !== 0 && false) {     // L (t:ts) (m:ms) = } : (L (t:ts) ms)
        // TODO: Implement parse-error(t)        //     if m != 0 and parse-error(t)
        out.push({tok: '}'});
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
    out.push({tok: '}'});
    stack.shift();
  }

  // Add the EOF token back on
  out.push(EOF);
  return out;
}


// The LayoutTransformer takes a lexer, and applies the layout algorithms to it,
// adding {, } and ; where necessary to make parsing the token stream possible
function LayoutTransformer(lexer) {
  var tokens = [];

  this.input = '';
  this.yyloc = this.yylloc = {
    first_column: 0,
    first_line: 1,
    last_column: 0,
    last_line: 1
  };
  this.yylineno = 0;

  this.setInput = function(input) {
    this.input = input;
    // Run the lexer
    lexer.setInput(input);

    tokens = [];
    var tok;
    while (typeof (tok = lexer.lex()) !== 'undefined')
      tokens.push(tok);

    // Add the layout tokens
    tokens = layout(insertLayoutTokens(tokens));
  };

  this.lex = function() {
    // Provide a single token to the owning process
    if (! tokens.length) return undefined;

    var tok = tokens.shift();
    if (tok.loc) {
      this.yyloc = this.yylloc = tok.loc;
      this.yylineno = tok.loc.last_line;
    }

    return tok.tok;
  };

  this.showPosition = function() {
    var indent = this.yyloc.first_column;
    var line = this.input.split('\n')[this.yyloc.first_line - 1];
    return line + '\n' + Array(indent + 1).join('-') + '^';
  };
}

module.exports = {
  LayoutTransformer: LayoutTransformer,
  insertLayoutTokens: insertLayoutTokens,
  layout: layout
};
