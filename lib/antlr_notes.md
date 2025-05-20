Wynntils.g4 was created by GPT 4o based on some example function, plus schema.prisma
and the escaped characters function from the actual mod.

To generate files (everything in lib/antlr), first download antlr4 jar from https://www.antlr.org/download.html.
<br> Then run
(in project root)`java -jar antlr4 -Dlanguage=TypeScript -visitor -o lib/antlr lib/Wynntils.g4`

https://github.com/antlr/antlr4/blob/master/doc/typescript-target.md

https://steadybit.com/blog/behind-the-scenes-query-language-parsing/
https://steadybit.com/blog/behind-the-scenes-query-language-editor/
