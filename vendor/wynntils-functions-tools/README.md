# Wynntils Language Tools

VS Code extension that brings Wynntils script authoring features directly into the editor. It ships with a custom language server that understands Wynntils functions and the project's superset syntax.

## Highlights

- Syntax highlighting and bracket awareness for `.wynntils` files.
- Function completions with signatures, return types, and aliases.
- Hover cards and signature-help backed by the Wynntils metadata catalog.
- Real-time diagnostics for missing arguments, invalid types, and structural issues.
- Superset workflow that compiles variable-enhanced scripts into plain Wynntils functions on demand.

## Superset Workflow

The extension supports a lightweight superset of Wynntils built around compile-time variables. Declare variables once, reference them across calls, and compile to standard Wynntils output whenever you are ready.

```js
let textColor = from_hex("#ffffff");
let bgColor = from_hex("#00ff00");
let edge = "PILL";

{to_background_text("Hello Wynntils!"; @{textColor}; @{bgColor}; @{edge}; @{edge})}
```

Compiles to:
```js
{to_background_text("Hello Wynntils!"; from_hex("#ffffff"); from_hex("#00ff00"); "PILL"; "PILL")}
```

- Variables use `let name = value;` syntax at the top level.
- Supported literal types: numbers, booleans, quoted strings, and hex colors.
- Reference variables inside function arguments with `@{name}`.
- Optional arguments can be skipped; diagnostics flag missing required values and type mismatches.
- Run the command palette entry `Wynntils: Compile` to produce a new editor tab that contains plain Wynntils functions with variables inlined. Your original superset document stays open so you can iterate.

## Everyday Editing

- Open or create a `.wynntils` file and start typing—language support activates automatically.
- Type a function name followed by `(` to trigger signature help; separators update the highlighted parameter as you move through arguments.
- Hover over a function to review its description, required/optional arguments, and alias list.

## Development Notes

- `npm run build` compiles both the extension host (`src/`) and language server (`server/`).
- Function metadata lives under `server/src/data`; update and rebuild to refresh completions, hovers, signatures, and hints.

