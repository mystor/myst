var mori = require('mori');

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

  var idx = 0;

  // If the first lexeme is preceded only by whitespace on the same line, the lexeme
  // is preceded by {n} where n is the indentation of the lexeme
  if (['<{'].indexOf(tokens[0].tok) === -1) {
    var n = tokens[0].loc.first_indent;
    tokens.unshift(new CurlyLayoutToken(n));
    idx++;
  }

  while (idx < tokens.length) {
    var jump = 1;

    // if not followed by lexeme '{', token '{n}" added after
    // the keyword, where n is the indentation of the next lexeme
    // if there is one, or 0 if the next lexeme is EOF
    var specialKeywords = ['=', 'DO', '->', 'THEN', 'ELSE', 'OF'];
    if (specialKeywords.indexOf(tokens[idx].tok) !== -1) { // Is 'let', 'where', 'do' or 'of'
      if (tokens.length === idx + 1) {                                     // at EOF
        tokens.push(new CurlyLayoutToken(0));
        jump++;
      } else if (tokens[idx + 1].tok !== '<{') {                            // no explicit block
        var n = tokens[idx + 1].loc.first_indent;
        tokens.splice(idx + 1, 0, new CurlyLayoutToken(n));
        jump++;
      }
    }

    // Where the start of a lexeme is preceded only by white space on the same line,
    // this lexeme is preceded by <n> where n is the indentation of the lexeme, provided
    // that it is not, as a consequence of the other rules, preceded by {n}
    // and that it is not THEN or ELSE
    if (idx === 0 ||                                                  // First token OR
        (! (tokens[idx - 1] instanceof CurlyLayoutToken) &&           // Not preceded by {n} AND
         tokens[idx - 1].loc.last_line < tokens[idx].loc.last_line)) {// First on line
      // Preceded by <n>

      if (tokens[idx].tok !== 'THEN' && tokens[idx].tok !== 'ELSE') {
        var n = tokens[idx].loc.first_indent;
        tokens.splice(idx, 0, new PointyLayoutToken(n));
        jump++;
      }
    }

    // Move to the next token
    idx += jump;
  }

  return tokens;
}

// Generate the next token to send to the parser, removing any
// Layout Tokens, and inserting braces where necessary for a correct
// parse.
function next(remaining, stack, isParseError) {
  var out = [];

  if (remaining.length > 0) {
    var tok = remaining.shift();        // Tok is the current token (automatically popped)
    var stackEmpty = stack.length <= 0; // Is the stack empty?
    var m = !stackEmpty ? stack[0] : 0; // m is the first element in the stack (or 0)

    if (tok instanceof PointyLayoutToken) {       // L (<n>:ts) ms
      if (!stackEmpty && m == tok.n) {            // L (<n>:ts) (m:ms) = ; : (L ts (m:ms)) if m = n
        out.push({tok: ';'});
      } else if (!stackEmpty && tok.n < m) {      // L (<n>:ts) (m:ms) = } : (L (<n>:ts) ms) if n < m
        out.push({tok: '}>'});
        stack.shift();
        remaining.unshift(tok);
      } else {                                    // L (<n>:ts) ms = L ts ms
        return next(remaining, stack, isParseError);
      }
    } else if (tok instanceof CurlyLayoutToken) {
      if (stack.length > 0 && tok.n > stack[0]) { // L({n}:ts) (m:ms) = { : (L ts (n:m:ms)) if n > m
        stack.unshift(tok.n);
        out.push({tok: '<{'});
      } else if (tok.n > 0) {                     // L ({n}:ts) [] = { : (L ts [n]) if n > 0
        stack.unshift(tok.n);
        out.push({tok: '<{'});
      } else {                                    // L ({n}:ts) ms = { : } : (L (<n>:ts) ms)
        out.push({tok: '<{'});
        out.push({tok: '}>'});
        remaining.unshift(new PointyLayoutToken(tok.n));
      }
    } else if (tok.tok === '}>') {
      if (!stackEmpty && m === 0) {               // L (}:ts) (0:ms) = } : (L ts ms)
        out.push(tok /*}>*/);
        stack.shift();
      } else {
        throw new Error('Implicit closing brace matches implicit opening brace');
      }
    } else if (tok.tok === '<{') {                 // L ({:ts) ms = { : (L ts (0:ms))
      out.push(tok /*<{*/);
      stack.unshift(0);
    } else {
      if (!stackEmpty && m !== 0 && isParseError(tok)) { // L (t:ts) (m:ms) = } : (L (t:ts) ms)
                                                 //     if m != 0 and parse-error(t)
        out.push({tok: '}>'});
        remaining.unshift(tok);
        stack.shift();
      } else {                                   // L (t:ts) ms = t : (L ts ms)
        out.push(tok);
      }
    }
  } else if (stack.length > 0) { // Finalize any contexts
    if (stack[0] === 0) {
      throw new Error('Reached EOF with out finding matching \'}>\'');
    }
    out.push({tok: '}>'});
    stack.shift();
  }

  return out;
}


// Rewrite of the active parser algorithm used by jison, to avoid state
function initParser(parser) {
  // Create the initial state for the parser
  // This can be passed as pstate to parser(pstate, token) to
  // run the parser
  var yy = {};
  for (var k in parser.yy) {
    if (parser.yy.hasOwnProperty(k)) {
      yy[k] = parser.yy[k];
    }
  }

  return mori.hash_map(
    'parser', parser,
    'stack', mori.vector(0),
    'tstack', mori.vector(),
    'vstack', mori.vector(null),
    'lstack', mori.vector(),
    'yytext', '',
    'yylineno', 0,
    'yyleng', 0,
    'recovering', 0,
    'args', [].slice.call(arguments, 1),
    'yy', yy
  );
}

function parse(pstate, token) {
  // Run one step of the parser. Will return an object. The object will be either:
  // { type: 'done', value: PARSED_VALUE }
  // or
  // { type: 'continue', state: pstate }
  // or
  // { type: 'error', token: token, expected: expected }

  var TERROR = 2;

  // Extract state from pstate
  var parser      = mori.get(pstate, 'parser')
    , stack       = mori.get(pstate, 'stack')
    , tstack      = mori.get(pstate, 'tstack')
    , vstack      = mori.get(pstate, 'vstack')
    , lstack      = mori.get(pstate, 'lstack')
    , yytext      = mori.get(pstate, 'yytext')
    , yylineno    = mori.get(pstate, 'yylineno')
    , yyleng      = mori.get(pstate, 'yyleng')
    , recovering  = mori.get(pstate, 'recovering')
    , args        = mori.get(pstate, 'args')
    , yy          = mori.get(pstate, 'yy');

  if (typeof token.tok !== 'number') {
    var symbol = parser.symbols_[token.tok] || token.tok;
  }

  var table = parser.table;

  function reifyState() {
    return mori.hash_map(
      'parser', parser,
      'stack', stack,
      'tstack', tstack,
      'vstack', vstack,
      'lstack', lstack,
      'yytext', yytext,
      'yylineno', yylineno,
      'yyleng', yyleng,
      'recovering', recovering,
      'args', args,
      'yy', yy
    );
  }

  var action, yyval = {};
  while (true) {
    state = mori.peek(stack);

    if (parser.defaultActions[state]) {
      action = parser.defaultActions[state];
    } else {
      if (symbol === null || typeof symbol === 'undefined') {
        return {
          event: 'continue',  // Waiting for the next token!
          state: reifyState()
        };
      }
      action = table[state] && table[state][symbol];
    }

    if (typeof action === 'undefined' || ! action.length || ! action[0]) {
      // We are in a dead-end state - send an error to the calling system
      var errStr = '';
      expected = [];
      for (p in table[state]) {
        if (parser.terminals_[p] && p > TERROR) {
          expected.push('\'' + parser.terminals_[p] + '\'');
        }
      }

      return {
        event: 'error',
        token: token,
        expected: expected
      };
    }

    if (action[0] instanceof Array && action.length > 1) {
      throw new Error('Parse Error: multiple actions possible at state: ' + state + ', token: ' + symbol);
    }

    switch(action[0]) {
      case 1:  // Shift
        stack = mori.conj(stack, symbol, action[1]);
        vstack = mori.conj(vstack, token.value);
        lstack = mori.conj(lstack, token.loc);
        yyleng = token.leng;
        yytext = token.value;
        yylineno = token.lineno;
        yyloc = token.loc;

        symbol = null;
        break;
      case 2:  // Reduce
        len = parser.productions_[action[1]][1];
        yyval.$ = mori.get(vstack, mori.count(vstack) - len);

        var first = mori.get(lstack, mori.count(lstack) - (len || 1))
          , last = mori.peek(lstack);

        yyval._$ = {
          first_line: first.first_line,
          last_line: last.last_line,
          first_column: first.first_column,
          last_column: last.last_column
        };

        try {
          var r = parser.performAction.apply(yyval, [
              yytext,
              yyleng,
              yylineno,
              yy,
              action[1],
              mori.clj_to_js(vstack),
              mori.clj_to_js(lstack)
          ].concat(args));
        } catch (e) {
          throw new Error(JSON.stringify(token));
        }

        if (typeof r !== 'undefined')
          return {event: 'done', value: r};

        while (len) {
          // Pardon the ugly state, no super easy way to do it
          stack = mori.pop(mori.pop(stack));
          vstack = mori.pop(vstack);
          lstack = mori.pop(lstack);
          len--;
        }

        stack = mori.conj(stack, parser.productions_[action[1]][0]);
        vstack = mori.conj(vstack, yyval.$);
        lstack = mori.conj(lstack, yyval._$);
        newState = table[mori.get(stack, mori.count(stack) - 2)][mori.peek(stack)];
        stack = mori.conj(stack, newState);
        break;
      case 3:  // Accept
        return {event: 'done'};
    }
  }
}

function runParser(lexer, parser, input) {
  // Run the lexer
  lexer.setInput(input);

  var tok, tokens = [];
  while (typeof (tok = lexer.lex()) !== 'undefined')
    tokens.push(tok);

  var EOF = tokens.pop();

  // Add the layout tokens
  tokens = insertLayoutTokens(tokens);

  // Create the parser state
  var stack = [];
  var upcoming = [];
  var state = initParser(parser);
  var loc = { // Updated as new tokens come in
    first_line: 1,
    last_line: 1,
    first_column: 0,
    last_column: 0
  };
  while (true) {
    if (! upcoming.length)
      upcoming = next(tokens, stack, isParseError);

    var status;
    if (upcoming.length) {
      var tok = upcoming.shift();
      if (tok.loc)
        loc = tok.loc;
      else
        tok.loc = loc;

      status = parse(state, tok);
    } else {
      if (EOF.loc)
        loc = EOF.loc;
      else
        EOF.loc = loc;

      status = parse(state, EOF);
      EOF = undefined;
    }

    switch (status.event) {
      case 'error':
        /* Generate the code error display */
        var token = status.token;
        var expected = status.expected;
        var indent = loc.first_column;
        var display = input.split('\n')[loc.first_line - 1];
        display += '\n' + Array(indent + 1).join('-') + '^';

        /* Create the error message */
        var errorString = '';
        errorString += 'Parse error on line ' + loc.first_line + ':\n';
        errorString += display + '\n';
        errorString += 'Expecting ' + expected.join(', ') + ', got \'' + tok.tok + '\'';

        /* Throw the error */
        throw new Error(errorString);
      case 'done':
        return status.value; // We are done parsing - return the AST
      case 'continue':
        state = status.state; // Save the state, and continue
        break;
      default:
        throw new Error('Unexpected return type from parser!');
    }
  }

  // isParseError returns true if the currently parsed tokens, plus
  // the token tok, is not a valid prefix of the Myst grammar. Otherwise,
  // it returns false.
  function isParseError(tok) {
    return parse(state, tok).event === 'error' && parse(state, {tok: '}>'}).event !== 'error'; // TODO: Maybe cache to avoid recomputing?
  }
}

module.exports = {
  runParser: runParser
};
