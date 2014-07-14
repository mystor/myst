/* Parse mah language */

%lex

%%
"//"[^\n]*"\n"          {/* Ignore single-line comments */}
"/*"([^*]|"*"[^/])"*/"  {/* Ignore multi-line comments */}
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
%precedence NEG
%left INVOCATION


%start program

%%

/* Primitives - I use eval here, as they are supposed to be the same as their JS counterparts */
literal
    : STRING { $$ = {type: 'Literal', value: eval($1)}; }
    | NUMBER { $$ = {type: 'Literal', value: eval($1)}; }
    | TRUE  { $$ = {type: 'Literal', valueType: 'BOOLEAN', value: true}; }
    | FALSE { $$ = {type: 'Literal', valueType: 'BOOLEAN', value: false}; }
    ;

identifier
    : IDENTIFIER { $$ = {type: 'Identifier', name: $1}; }
    ;

placeholder
    : '_' { $$ = {type: 'Placeholder'}; }
    ;

/* The entry point for the program */
program
    : declarations EOF
        { return {type: 'Program', declarations: $1}; }
    ;

declarations
    : { $$ = []; }
    | declarations declaration ';'
        { $$ = $1.slice(); $$.push($2); }
    ;

declaration
    : IDENTIFIER '=' expression
        { $$ = {type: 'Declaration', name: $1, value: $3}; }
    ;

argument
    : prim_expression { $$ = $1; }
    | placeholder { $$ = $1; }
    ;

argument_list
    : argument { $$ = [$1]; }
    | argument_list argument
        { $$ = $1.slice(); $$.push($2); }
    ;

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
    | match_list
    ;

function_body
    : declarations expression
        { $$ = {type: 'FunctionBody', returns: $2, declarations: $1}; }
    ;

do_body_item
    : member '<-' expression
        { $$ = {type: 'Bind', target: $1, value: $3}; }
    | expression
        { $$ = {type: 'Action', value: $1}; }
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
        { $$ = {type: 'Member', object: $1, property: $3}; }
    | member '::' identifier
        { $$ = {type: 'Member', object: $1, property: $3}; }
    | identifier
        { $$ = $1; }
    ;

obj_property
    : identifier ':' expression
        { $$ = {type: 'Property', key: $1, value: $3}; }
    | literal ':' expression
        { $$ = {type: 'Property', key: $1, value: $3}; }
    ;

obj_properties
    : obj_property
        { $$ = [$1]; }
    | obj_properties ',' obj_property
        { $$ = $1.slice(); $$.push($3); }
    ;

obj_literal
    : '{' obj_properties '}'
        { $$ = {type: 'Object', properties: $2}; }
    ;

array_items
    : expression
        { $$ = [$1]; }
    | array_items ',' expression
        { $$ = $1.slice(); $$.push($3); }
    ;

array_literal
    : '[' array_items ']'
        { $$ = {type: 'Array', elements: $2}; }
    ;

prim_expression
    : literal { $$ = $1; }
    | '(' expression ')' { $$ = $2; }
    | member { $$ = $1; }
    | obj_literal { $$ = $1; }
    | array_literal { $$ = $1; }
    | FUNCTION match_list '{' function_body '}'
        { $$ = {type: 'Function', params: $2, body: $4}; }
    | DO optional_match_list '{' do_body '}'
        { $$ = {type: 'Do', params: $2, body: $4}; }
    | '!' prim_expression
        { $$ = {type: 'UnaryOperator', arguments: [$2], op: $1}; }
    ;

expression
    : prim_expression { $$ = $1; }
    | prim_expression argument_list %prec INVOCATION
        { $$ = {type: 'Invocation', callee: $1, arguments: $2}; }
    | expression '+'  expression { $$ = {type: 'BinaryOperator', op: $2, left: $1, right: $3}; }
    | expression '-'  expression { $$ = {type: 'BinaryOperator', op: $2, left: $1, right: $3}; }
    | expression '*'  expression { $$ = {type: 'BinaryOperator', op: $2, left: $1, right: $3}; }
    | expression '/'  expression { $$ = {type: 'BinaryOperator', op: $2, left: $1, right: $3}; }
    | expression '%'  expression { $$ = {type: 'BinaryOperator', op: $2, left: $1, right: $3}; }
    | expression '==' expression { $$ = {type: 'BinaryOperator', op: $2, left: $1, right: $3}; }
    | expression '!=' expression { $$ = {type: 'BinaryOperator', op: $2, left: $1, right: $3}; }
    | expression '<'  expression { $$ = {type: 'BinaryOperator', op: $2, left: $1, right: $3}; }
    | expression '>'  expression { $$ = {type: 'BinaryOperator', op: $2, left: $1, right: $3}; }
    | expression '<=' expression { $$ = {type: 'BinaryOperator', op: $2, left: $1, right: $3}; }
    | expression '>=' expression { $$ = {type: 'BinaryOperator', op: $2, left: $1, right: $3}; }
    | expression '||' expression { $$ = {type: 'BinaryOperator', op: $2, left: $1, right: $3}; }
    | expression '&&' expression { $$ = {type: 'BinaryOperator', op: $2, left: $1, right: $3}; }
    | expression ':'  expression { $$ = {type: 'BinaryOperator', op: $2, left: $1, right: $3}; }
    ;

