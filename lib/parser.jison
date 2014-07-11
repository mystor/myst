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

"<-"                    {return '<-';}
"="                     {return '=';} /* ASSIGNMENT OPERATOR */

","                     {return ',';} /* Argument seperator - probably unnecessary... */
"."                     {return '.';}
";"                     {return 'SEPERATOR';}
"\""(\\\"|[^"])*"\""    {return 'STRING';}
"'"(\\\'|[^'])*"'"      {return 'STRING';}
[0-9]+("."[0-9]+)?\b    {return 'NUMBER';}
[a-zA-Z][a-zA-Z_0-9]*\b {return 'IDENTIFIER';}
/* I will add custom infix operators at some point... maybe... */
/* [-+<>=/?!@#$%^&*|:~]+   {return 'OPERATOR'} */
<<EOF>>                 {return 'EOF';}

/lex

%left 'OPERATOR'
%left '='
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
    | declaration SEPERATOR declarations
        { $$ = $3.slice(); $$.unshift($1); }
    ;

declaration
    : IDENTIFIER '=' expression
        { $$ = {type: 'declaration', name: $1, value: $3}; }
    ;

expression_list
    : restricted_expression { $$ = [$1]; }
    | expression_list ',' restricted_expression
        { $$ = $1.slice(); $$.push($3); }
    ;

argument_list
    : identifier { $$ = [$1]; }
    | argument_list ',' identifier
        { $$ = $1.slice(); $$.push($3); }
    ;

optional_argument_list
    : { $$ = []; }
    | argument_list
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
    | do_body_item SEPERATOR do_body
        { $$ = $3; $$.unshift($1); }
    ;

member
    : member '.' identifier
        { $$ = {type: 'memberExpression', object: $1, property: $3}; }
    | identifier
        { $$ = $1; }
    ;

restricted_expression
    : literal {$$ = $1;}
    | '(' expression ')'
        { $$ = $2; }
    | member
        { $$ = $1; }
    | FUNCTION argument_list '{' function_body '}'
        { $$ = {type: 'lambda', arguments: $2, body: $4}; }
    | DO optional_argument_list '{' do_body '}'
        { $$ = {type: 'do', arguments: $2, body: $4}; }
    ;

expression
    : restricted_expression {$$ = $1;}
    | expression expression_list
        { $$ = {type: 'functionCall', callee: $1, arguments: $2}; }
    ;


