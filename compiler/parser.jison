/* Parse mah language */

%lex

%%
"//"[^\n]*"\n"          {/* Ignore single-line comments */}
"/*"([^*]|"*"[^/])"*/"  {/* Ignore multi-line comments */}
\s+                     {/* Ignore Whitespace */}
/* CODE BLOCKS */
"fn"                    {return 'FUNCTION';}
"do"                    {return 'DO';}

"import"                {return 'IMPORT';}
"from"                  {return 'FROM';}
"as"                    {return 'AS';}

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

"::"                    {return '::';}
"<-"                    {return '<-';} /* Monadic bind in do block */

/* OPERATORS */
":"                     {return ':';}
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
%right ':' '++'
%left '+' '-' 
%left '*' '/' '%'
%right '!'
%left '.'
%precedence NEG
%left INVOCATION


%start program

%%

/* The entry point for the program */
program
    : imports declarations EOF
        { return {type: 'Program', declarations: $2, imports: $1, loc: @0}; }
    ;

/* Imports */

imports
    : { $$ = []; }
    | imports import ';'
        { $$ = $1.slice(); $$.push($2); }
    ;

import
    : FROM string IMPORT import_names
        { $$ = {type: 'Import', names: $4, target: $2, as: null, loc: @0}; }
    | FROM string IMPORT import_names AS identifier
        { $$ = {type: 'Import', names: $4, target: $2, as: $6, loc: @0}; }
    | IMPORT string AS identifier
        { $$ = {type: 'Import', names: [], target: $2, as: $4, loc: @0}; }
    ;

import_names
    : identifier
        { $$ = [$1]; }
    | import_names ',' identifier
        { $$ = $1.slice(); $$.push($3); }
    ;
    

/* Primitives - I use eval here, as they are supposed to be the same as their JS counterparts */
string
    : STRING { $$ = {type: 'Literal', value: eval($1), loc: @0}; }
    ;

number
    : NUMBER { $$ = {type: 'Literal', value: eval($1), loc: @0}; }
    ;

boolean
    : TRUE { $$ = {type: 'Literal', value: true, loc: @0}; }
    | FALSE { $$ = {type: 'Literal', value: false, loc: @0}; }
    ;

literal
    : string { $$ = $1; }
    | number { $$ = $1; }
    | boolean { $$ = $1; }
    ;

identifier
    : IDENTIFIER { $$ = {type: 'Identifier', name: $1, loc: @0}; }
    ;

placeholder
    : '_' { $$ = {type: 'Placeholder', loc: @0}; }
    ;

/* Variable Declarations */

declarations
    : { $$ = []; }
    | declarations declaration ';'
        { $$ = $1.slice(); $$.push($2); }
    ;

declaration
    : IDENTIFIER '=' expression
        { $$ = {type: 'Declaration', name: $1, value: $3, loc: @0}; }
    ;

/* Match (potentially destructuring assignments) */

match
    : identifier { $$ = $1; }
    | placeholder { $$ = $1; }
    ;

match_list
    : match { $$ = [$1]; }
    | match_list match
        { $$ = $1.slice(); $$.push($2); }
    ;

optional_match_list
    : { $$ = []; }
    | match_list { $$ = $1; }
    ;

/* Functions */

function_body
    : declarations expression
        { $$ = {type: 'FunctionBody', returns: $2, declarations: $1, loc: @0}; }
    ;

function
    : FUNCTION match_list '{' function_body '}'
        { $$ = {type: 'Function', params: $2, body: $4, loc: @0}; }
    ; 

/* "DO" block */

do_body_item
    : identifier '<-' expression
        { $$ = {type: 'Bind', target: $1, value: $3, loc: @0}; }
    | expression
        { $$ = {type: 'Action', value: $1, loc: @0}; }
    | declaration
        { $$ = $1; }
    ;

do_body
    : { $$ = []; }
    | do_body_item ';' do_body
        { $$ = $3; $$.unshift($1); }
    ;

do
    : DO prim_expression optional_match_list '{' do_body '}'
        { $$ = {type: 'Do', monad: $2, params: $3, body: $5, loc: @0}; }
    ;

/* Member Expression */

member
    : prim_expression '.' identifier
        { $$ = {type: 'Member', object: $1, property: $3, loc: @0}; }
    | identifier
        { $$ = $1; }
    ;

/* Object Literals */

obj_property
    : identifier ':' expression
        { $$ = {type: 'Property', key: $1, value: $3, loc: @0}; }
    | literal ':' expression
        { $$ = {type: 'Property', key: $1, value: $3, loc: @0}; }
    ;

obj_properties
    : obj_property
        { $$ = [$1]; }
    | obj_properties ',' obj_property
        { $$ = $1.slice(); $$.push($3); }
    ;

obj_literal
    : '{' obj_properties '}'
        { $$ = {type: 'Object', properties: $2, loc: @0}; }
    ;

/* Array Literals */

array_items
    : expression
        { $$ = [$1]; }
    | array_items ',' expression
        { $$ = $1.slice(); $$.push($3); }
    ;

array_literal
    : '[' array_items ']'
        { $$ = {type: 'Array', elements: $2, loc: @0}; }
    ;

/* Function Invocations */

argument
    : prim_expression { $$ = $1; }
    | placeholder { $$ = $1; }
    ;

argument_list
    : argument { $$ = [$1]; }
    | argument_list argument
        { $$ = $1.slice(); $$.push($2); }
    ;

invocation
    : prim_expression argument_list %prec INVOCATION
        { $$ = {type: 'Invocation', callee: $1, arguments: $2, loc: @0}; }
    ;

/* Expressions */

prim_expression
    : literal { $$ = $1; }
    | '(' expression ')' { $$ = $2; }
    | member { $$ = $1; }
    | obj_literal { $$ = $1; }
    | array_literal { $$ = $1; }
    | do { $$ = $1; }
    | function { $$ = $1; }
    | '!' prim_expression
        { $$ = {type: 'UnaryOperator', argument: $2, op: $1, loc: @0}; }
    ;

expression
    : prim_expression { $$ = $1; }
    | invocation { $$ = $1; }
    | '-' prim_expression %prec NEG
        { $$ = {type: 'UnaryOperator', argument: $2, op: $1, loc: @0}; }
    | expression '+'  expression { $$ = {type: 'BinaryOperator', op: $2, left: $1, right: $3, loc: @0}; }
    | expression '-'  expression { $$ = {type: 'BinaryOperator', op: $2, left: $1, right: $3, loc: @0}; }
    | expression '*'  expression { $$ = {type: 'BinaryOperator', op: $2, left: $1, right: $3, loc: @0}; }
    | expression '/'  expression { $$ = {type: 'BinaryOperator', op: $2, left: $1, right: $3, loc: @0}; }
    | expression '%'  expression { $$ = {type: 'BinaryOperator', op: $2, left: $1, right: $3, loc: @0}; }
    | expression '==' expression { $$ = {type: 'BinaryOperator', op: $2, left: $1, right: $3, loc: @0}; }
    | expression '!=' expression { $$ = {type: 'BinaryOperator', op: $2, left: $1, right: $3, loc: @0}; }
    | expression '<'  expression { $$ = {type: 'BinaryOperator', op: $2, left: $1, right: $3, loc: @0}; }
    | expression '>'  expression { $$ = {type: 'BinaryOperator', op: $2, left: $1, right: $3, loc: @0}; }
    | expression '<=' expression { $$ = {type: 'BinaryOperator', op: $2, left: $1, right: $3, loc: @0}; }
    | expression '>=' expression { $$ = {type: 'BinaryOperator', op: $2, left: $1, right: $3, loc: @0}; }
    | expression '||' expression { $$ = {type: 'BinaryOperator', op: $2, left: $1, right: $3, loc: @0}; }
    | expression '&&' expression { $$ = {type: 'BinaryOperator', op: $2, left: $1, right: $3, loc: @0}; }
    | expression ':'  expression { $$ = {type: 'BinaryOperator', op: $2, left: $1, right: $3, loc: @0}; }
    ;


