grammar Wynntils;

script
    : LCURLY expression RCURLY EOF
    ;

expression
    : functionCall
    | STRING
    | literal
    ;

functionCall
    : IDENTIFIER                         # NoArgsFunction
    | IDENTIFIER LPAREN argList? RPAREN  # ParenFunction
    ;


argList
    : expression (SEMI expression)*
    ;

literal
    : BOOLEAN
    | NUMBER
    | STRING
    ;

LCURLY: '{';
RCURLY: '}';
LPAREN: '(';
RPAREN: ')';
SEMI:   ';';

BOOLEAN: 'true' | 'false';

STRING: '"' (ESC_SEQ | ~["\\])* '"'
      | '\'' (ESC_SEQ | ~['\\])* '\'';

fragment ESC_SEQ: '\\' [n\\{}EBLMH];

NUMBER: '-'? INT ('.' [0-9]+)?;
fragment INT: [0-9]+;

IDENTIFIER: [a-zA-Z_][a-zA-Z0-9_]*;

WS: [ \t\r\n]+ -> skip;
