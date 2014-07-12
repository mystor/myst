/* Parse mah language */

%lex

%%
"//"[^\n]*"\n"          {/* Ignore single-line comments */}
"/*"([^*]|"*"[^/])"*/"    {/* Ignore multi-line comments */}
\s+                     {/* Ignore Whitespace */}
/* CODE BLOCKS */
"fn"                    {return 'FUNCTION';}
"do"                    {return 'DO';}
"in"                    {return 'IN';}
"where"                 {return 'WHERE';}

"module"                {return 'MODULE';} // TODO: Remove

/* Special Values */
"true"                  {return 'TRUE';}
"false"                 {return 'FALSE';}
/* BLOCK DELIMITERS */
"{"                     {return '{';}
"}"                     {return '}';}
"["                     {return '[';}
"]"                     {return ']';}
"("                     {return '(';}
")"                     {return ')';}

"<-"                    {return '<-';} /* Monadic bind in do block */

/* OPERATORS */
"+"                     {return '+';}
"-"                     {return '-';} /* Binary & Unary */
"*"                     {return '*';}
"/"                     {return '/';}
"%"                     {return '%';}

"=="                    {return '==';}
"!="                    {return '!=';}
"<="                    {return '<=';}
">="                    {return '>=';}
"<"                     {return '<';}
">"                     {return '>';}

"||"                    {return '||';}
"&&"                    {return '&&';}

"!"                     {return '!';} /* Unary */

"="                     {return '=';}

/* match SEPERATOR */
","                     {return ',';}

"."                     {return '.';}

";"                     {return ';';} /* Statement Seperator */
"_"                     {return '_';}

"\""(\\\"|[^"])*"\""    {return 'STRING';}
"'"(\\\'|[^'])*"'"      {return 'STRING';}

[0-9]+("."[0-9]+)?\b    {return 'NUMBER';}
[a-zA-Z][a-zA-Z_0-9]*\b {return 'IDENTIFIER';}
<<EOF>>                 {return 'EOF';}

/lex

%left '='
%right '||'
%right '&&'
%nonassoc '==' '!=' '<' '>' '<=' '>='
%left '+' '-' 
%left '*' '/' '%'
%right '!'
%precedence NEG
%left INVOCATION


%start program

%%

/* Primitives - I use eval here, as they are supposed to be the same as their JS counterparts */
literal
    : STRING { $$ = {type: 'literally', value: eval($1)}; }
    | NUMBER { $$ = {type: 'literal', value: eval($1)}; }
    | TRUE  { $$ = {type: 'literal', valueType: 'BOOLEAN', value: true}; }
    | FALSE { $$ = {type: 'literal', valueType: 'BOOLEAN', value: false}; }
    ;

identifier
    : IDENTIFIER { $$ = {type: 'identifier', name: $1}; }
    ;

/* The entry point for the program */
program
    : declarations EOF
        { return {type: 'program', declarations: $1}; }
    ;

declarations
    : { $$ = []; }
    | declaration ';' declarations
        { $$ = $3.slice(); $$.unshift($1); }
    ;

declaration
    : IDENTIFIER '=' expression
        { $$ = {type: 'declaration', name: $1, value: $3}; }
    ;

argument
    : prim_expression { $$ = $1; }
    | '_' { $$ = {type: 'placeholder'}; }
    ;

argument_list
    : argument { $$ = [$1]; }
    | argument_list ',' argument
        { $$ = $1.slice(); $$.push($3); }
    ;

match
    : identifier { $$ = $1; }
    | '_' {$$ = {type: 'placeholder'}; }
    ;
match_list
    : match { $$ = [$1]; }
    | match_list ',' match
        { $$ = $1.slice(); $$.push($3); }
    ;

optional_match_list
    : { $$ = []; }
    | match_list
    ;

function_body
    : expression
        { $$ = {type: 'functionBody', returns: $1, declarations: []}; }
    | expression WHERE declarations
        { $$ = {type: 'functionBody', returns: $1, declarations: $3}; }
    | declarations IN expression
        { $$ = {type: 'functionBody', returns: $3, declarations: $1}; }
    | declarations IN expression WHERE declarations
        { $$ = {type: 'functionBody', returns: $3, declarations: $1.concat($5)}; }
    ;

do_body_item
    : member '<-' expression
        { $$ = {type: 'bind', target: $1, value: $3}; }
    | expression
        { $$ = {type: 'action', value: $1}; }
    | declaration
        { $$ = $1; }
    ;

do_body
    : { $$ = []; }
    | do_body_item ';' do_body
        { $$ = $3; $$.unshift($1); }
    ;

member
    : member '.' identifier
        { $$ = {type: 'memberExpression', object: $1, property: $3}; }
    | identifier
        { $$ = $1; }
    ;

prim_expression
    : literal { $$ = $1; }
    | '(' expression ')' { $$ = $2; }
    | member { $$ = $1; }
    | FUNCTION match_list '{' function_body '}'
        { $$ = {type: 'function', matchs: $2, body: $4}; }
    | DO optional_match_list '{' do_body '}'
        { $$ = {type: 'do', matchs: $2, body: $4}; }
    | '!' prim_expression
        { $$ = {type: 'unary', matchs: $2, op: $1}; }
    ;

expression
    : prim_expression { $$ = $1; }
    | prim_expression argument_list %prec INVOCATION
        { $$ = {type: 'invocation', callee: $1, matchs: $2}; }
    | expression '+'  expression { $$ = {type: 'binaryOp', op: $2, left: $1, right: $3}; }
    | expression '-'  expression { $$ = {type: 'binaryOp', op: $2, left: $1, right: $3}; }
    | expression '*'  expression { $$ = {type: 'binaryOp', op: $2, left: $1, right: $3}; }
    | expression '/'  expression { $$ = {type: 'binaryOp', op: $2, left: $1, right: $3}; }
    | expression '%'  expression { $$ = {type: 'binaryOp', op: $2, left: $1, right: $3}; }
    | expression '==' expression { $$ = {type: 'binaryOp', op: $2, left: $1, right: $3}; }
    | expression '!=' expression { $$ = {type: 'binaryOp', op: $2, left: $1, right: $3}; }
    | expression '<'  expression { $$ = {type: 'binaryOp', op: $2, left: $1, right: $3}; }
    | expression '>'  expression { $$ = {type: 'binaryOp', op: $2, left: $1, right: $3}; }
    | expression '<=' expression { $$ = {type: 'binaryOp', op: $2, left: $1, right: $3}; }
    | expression '>=' expression { $$ = {type: 'binaryOp', op: $2, left: $1, right: $3}; }
    | expression '||' expression { $$ = {type: 'binaryOp', op: $2, left: $1, right: $3}; }
    | expression '&&' expression { $$ = {type: 'binaryOp', op: $2, left: $1, right: $3}; }
    ;

/* bin_op
    : '+'  appl_expression { $$ = {op: $1, expr: $2}; }
    | '-'  appl_expression { $$ = {op: $1, expr: $2}; }
    | '*'  appl_expression { $$ = {op: $1, expr: $2}; }
    | '/'  appl_expression { $$ = {op: $1, expr: $2}; }
    | '%'  appl_expression { $$ = {op: $1, expr: $2}; }
    | '==' appl_expression { $$ = {op: $1, expr: $2}; }
    | '!=' appl_expression { $$ = {op: $1, expr: $2}; }
    | '<'  appl_expression { $$ = {op: $1, expr: $2}; }
    | '>'  appl_expression { $$ = {op: $1, expr: $2}; }
    | '<=' appl_expression { $$ = {op: $1, expr: $2}; }
    | '>=' appl_expression { $$ = {op: $1, expr: $2}; }
    | '||' appl_expression { $$ = {op: $1, expr: $2}; }
    | '&&' appl_expression { $$ = {op: $1, expr: $2}; }
    ;

prim_expression
    : literal {$$ = $1;}
    | '(' expression ')'
        { $$ = $2; }
    | member
        { $$ = $1; }
    | FUNCTION match_list '{' function_body '}'
        { $$ = {type: 'lambda', matchs: $2, body: $4}; }
    | DO optional_match_list '{' do_body '}'
        { $$ = {type: 'do', matchs: $2, body: $4}; }
    | '!' prim_expression
        { $$ = {type: 'unaryExpr', op: $1, expr: $2}; }
    ;

appl_expression
    : prim_expression {$$ = $1;}
    | expression argument_list
        { $$ = {type: 'functionCall', callee: $1, matchs: $2}; }
    ;

expression
    : appl_expression {$$ = $1;}
    | '-' prim_expression %prec NEG
    | appl_expression bin_op
        { $$ = {type: 'binaryExpr', left: $1, right: $2.expr, op: $2.op}; }
    ;
*/

