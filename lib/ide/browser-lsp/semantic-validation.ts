import type { FunctionMetadata, FunctionsCatalog } from "@/lib/ide/browser-lsp/catalog";
import type { FunctionCall, ParsedArgument } from "@/lib/ide/browser-lsp/parser";
import { TokenKind } from "@/lib/ide/browser-lsp/lexer";
import { isTypeCompatible, type TypeInferenceContext, inferArgumentType } from "@/lib/ide/browser-lsp/type-system";
import type { LspCompletionItem } from "@/lib/ide/types";
import { normalizeFunctionLookupName } from "@/lib/function-names";

export type SemanticIssue = {
    offset: number;
    length: number;
    message: string;
};

export type SemanticValidationContext = {
    functionCall: FunctionCall;
    metadata: FunctionMetadata;
    sourceText: string;
    inferType(argument: ParsedArgument | undefined): string | undefined;
    isStaticallyKnownLiteral(argument: ParsedArgument | undefined): argument is ParsedArgument;
};

export type SemanticCompletionContext = {
    activeParameter: number;
    metadata: FunctionMetadata;
};

export type SemanticConstraint = {
    descriptor?: SemanticConstraintDescriptor;
    validate?(context: SemanticValidationContext): SemanticIssue[];
    complete?(context: SemanticCompletionContext): LspCompletionItem[];
    ownsBareIdentifier?(argumentIndex: number): boolean;
    validatesArgument?(argumentIndex: number): boolean;
};

export type SemanticConstraintDescriptor =
    | {
          kind: "allowedLiterals";
          argumentIndex: number;
          values: readonly string[];
      }
    | {
          kind: "variadicPairs";
          argumentIndex: number;
          minimumPairs: number;
          listName: string;
      };

export type RegisteredSemanticConstraint = SemanticConstraintDescriptor & {
    functionName: string;
};

export type FunctionSemanticSpec = {
    constraints: SemanticConstraint[];
    validate?(context: SemanticValidationContext): SemanticIssue[];
    complete?(context: SemanticCompletionContext): LspCompletionItem[];
};

export type SemanticValidationRuntime = {
    callLookup: Map<number, FunctionCall>;
    catalog: FunctionsCatalog;
    sourceText: string;
    typeInferenceContext: TypeInferenceContext;
};

export type VariadicPairOptions = {
    startIndex: number;
    minimumPairs: number;
    keyConstraint?: PairKeyConstraint;
    listName: string;
};

export type PairKeyConstraint = {
    validate(keyArgument: ParsedArgument, context: SemanticValidationContext, pairIndex: number): SemanticIssue[];
};

const COMPLETION_ITEM_KIND_ENUM_MEMBER = 20;
const ARMOR_SLOTS = ["Helmet", "Chestplate", "Leggings", "Boots"] as const;
const BOMB_SORT_ORDERS = ["NEWEST", "OLDEST"] as const;
const WYNNCRAFT_SHADERS = [
    "BLINK",
    "FADE",
    "FADE_2",
    "GRADIENT",
    "GRADIENT_2",
    "ITALIC",
    "ITALIC_2",
    "RAINBOW",
    "SHINE",
    "WARP",
] as const;
const BACKGROUND_EDGE_STYLES = ["NONE", "PILL", "BOX", "FLAG", "RIBBON"] as const;
const SPELL_DIRECTIONS = ["RLR", "RRR", "RLL", "RRL", "LRL", "LLL", "LRR", "LLR"] as const;
const SPELL_CLASSES = [
    "Mage",
    "Dark Wizard",
    "Archer",
    "Hunter",
    "Warrior",
    "Knight",
    "Assassin",
    "Ninja",
    "Shaman",
    "Skyseer",
] as const;
const PROFESSIONS = [
    "Woodcutting",
    "Mining",
    "Fishing",
    "Farming",
    "Alchemism",
    "Armouring",
    "Cooking",
    "Jeweling",
    "Scribing",
    "Tailoring",
    "Weaponsmithing",
    "Woodworking",
] as const;
const MOUNT_STATS = [
    "acceleration",
    "altitude",
    "jumpHeight",
    "energy",
    "handling",
    "potential",
    "boost",
    "speed",
    "toughness",
    "training",
] as const;
const CAPPED_MOUNT_STATS = MOUNT_STATS.filter((stat) => stat !== "potential");
const LOOTRUN_BEACON_COLORS = [
    "GREEN",
    "YELLOW",
    "BLUE",
    "PURPLE",
    "GRAY",
    "ORANGE",
    "RED",
    "DARK_GRAY",
    "WHITE",
    "AQUA",
    "PINK",
    "CRIMSON",
    "RAINBOW",
] as const;
const ACCESSORY_SLOTS = ["Ring_1", "Ring_2", "Bracelet", "Necklace"] as const;
const DEBUFF_NAMES = [
    "Bleeding",
    "Blindness",
    "Burning",
    "Confused",
    "Contaminated",
    "Crystallized",
    "Curse",
    "Discombobulated",
    "Enkindled",
    "Freezing",
    "Marked",
    "Poison",
    "Provoked",
    "Resistance",
    "Slowness",
    "Trick",
    "Twilight",
    "Weakness",
    "Whipped",
    "Wind Prison",
] as const;

const semanticSpecs = new Map<string, FunctionSemanticSpec>();

function registerAllowedLiterals(functionNames: readonly string[], argumentIndex: number, values: readonly string[]) {
    for (const functionName of functionNames) {
        semanticSpecs.set(functionName, { constraints: [allowedLiterals(argumentIndex, values)] });
    }
}

registerAllowedLiterals(["accessory_durability", "equipped_accessory_name"], 0, ACCESSORY_SLOTS);
registerAllowedLiterals(["armor_durability", "equipped_armor_name"], 0, ARMOR_SLOTS);
registerAllowedLiterals(
    [
        "bomb_end_time",
        "bomb_formatted_string",
        "bomb_length",
        "bomb_owner",
        "bomb_remaining_time",
        "bomb_start_time",
        "bomb_type",
        "bomb_world",
    ],
    2,
    BOMB_SORT_ORDERS,
);
registerAllowedLiterals(["capped_mount_stat", "mount_stat_max"], 0, CAPPED_MOUNT_STATS);
registerAllowedLiterals(["debuffs_in_radius_value"], 1, DEBUFF_NAMES);
registerAllowedLiterals(["targeted_mob_debuff_value"], 3, DEBUFF_NAMES);
registerAllowedLiterals(
    [
        "lootrun_beacon_count",
        "lootrun_beacon_vibrant",
        "lootrun_task_location",
        "lootrun_task_name",
        "lootrun_task_type",
    ],
    0,
    LOOTRUN_BEACON_COLORS,
);
registerAllowedLiterals(["mount_stat"], 0, MOUNT_STATS);
registerAllowedLiterals(
    [
        "profession_level",
        "profession_percentage",
        "profession_xp",
        "profession_xp_per_minute",
        "profession_xp_per_minute_raw",
    ],
    0,
    PROFESSIONS,
);
registerAllowedLiterals(["spell_name_from_number"], 1, SPELL_CLASSES);
registerAllowedLiterals(["wynncraft_shader"], 0, WYNNCRAFT_SHADERS);

semanticSpecs.set("spell_name_from_direction", {
    constraints: [allowedLiterals(0, SPELL_DIRECTIONS), allowedLiterals(1, SPELL_CLASSES)],
});
semanticSpecs.set("to_background_text", {
    constraints: [allowedLiterals(3, BACKGROUND_EDGE_STYLES), allowedLiterals(4, BACKGROUND_EDGE_STYLES)],
});
semanticSpecs.set("switch_case", {
    constraints: [
        variadicPairs({
            startIndex: 2,
            minimumPairs: 1,
            listName: "cases",
            keyConstraint: sameTypeAsArgument(0),
        }),
    ],
});

const semanticValidationDescriptors = Object.freeze(
    Array.from(semanticSpecs.entries()).flatMap(([functionName, spec]) =>
        spec.constraints.flatMap((constraint) =>
            constraint.descriptor ? [{ functionName, ...constraint.descriptor }] : [],
        ),
    ),
);

export function validateFunctionSemantics(
    functionCall: FunctionCall,
    metadata: FunctionMetadata,
    runtime: SemanticValidationRuntime,
): SemanticIssue[] {
    const spec = semanticSpecs.get(normalizeFunctionLookupName(metadata.canonicalName));

    if (!spec) {
        return [];
    }

    const context = createValidationContext(functionCall, metadata, runtime);
    const issues = spec.constraints.flatMap((constraint) => constraint.validate?.(context) ?? []);

    return issues.concat(spec.validate?.(context) ?? []);
}

export function collectSemanticBareLiteralOffsets(
    functionCalls: FunctionCall[],
    catalog: FunctionsCatalog,
): Set<number> {
    const offsets = new Set<number>();

    for (const functionCall of functionCalls) {
        const metadata = catalog.findByName(functionCall.name);

        if (!metadata) {
            continue;
        }

        const spec = semanticSpecs.get(normalizeFunctionLookupName(metadata.canonicalName));

        if (!spec) {
            continue;
        }

        for (let argumentIndex = 0; argumentIndex < functionCall.arguments.length; argumentIndex++) {
            const argument = functionCall.arguments[argumentIndex];

            if (
                argument.tokens.length === 1 &&
                argument.tokens[0].kind === TokenKind.Identifier &&
                spec.constraints.some((constraint) => constraint.ownsBareIdentifier?.(argumentIndex))
            ) {
                offsets.add(argument.tokens[0].offset);
            }
        }
    }

    return offsets;
}

export function createSemanticCompletionItems(
    metadata: FunctionMetadata | undefined,
    activeParameter: number,
): LspCompletionItem[] {
    if (!metadata) {
        return [];
    }

    const spec = semanticSpecs.get(normalizeFunctionLookupName(metadata.canonicalName));

    if (!spec) {
        return [];
    }

    const context = { activeParameter, metadata };
    const items = spec.constraints.flatMap((constraint) => constraint.complete?.(context) ?? []);

    return items.concat(spec.complete?.(context) ?? []);
}

export function hasSemanticArgumentValidation(functionName: string, argumentIndex: number) {
    const spec = semanticSpecs.get(normalizeFunctionLookupName(functionName));

    return Boolean(spec?.constraints.some((constraint) => constraint.validatesArgument?.(argumentIndex)));
}

export function getSemanticValidationDescriptors(): readonly RegisteredSemanticConstraint[] {
    return semanticValidationDescriptors;
}

export function allowedLiterals(argumentIndex: number, values: readonly string[]): SemanticConstraint {
    const allowedValues = new Set(values);
    const expectedValues = values.map((value) => `'${value}'`).join(", ");

    return {
        descriptor: {
            kind: "allowedLiterals",
            argumentIndex,
            values: Object.freeze([...values]),
        },
        ownsBareIdentifier(activeArgumentIndex) {
            return activeArgumentIndex === argumentIndex;
        },
        validatesArgument(activeArgumentIndex) {
            return activeArgumentIndex === argumentIndex;
        },
        validate(context) {
            const argument = context.functionCall.arguments[argumentIndex];

            if (!context.isStaticallyKnownLiteral(argument)) {
                return [];
            }

            const token = argument.tokens[0];
            const value = "value" in token ? token.value : "";

            if (allowedValues.has(value)) {
                return [];
            }

            return [
                issueForArgument(
                    argument,
                    `'${context.metadata.canonicalName}' argument ${argumentIndex + 1} must be one of ${expectedValues}.`,
                ),
            ];
        },
        complete(context) {
            if (context.activeParameter !== argumentIndex) {
                return [];
            }

            return values.map((value, index) => ({
                label: value,
                kind: COMPLETION_ITEM_KIND_ENUM_MEMBER,
                detail: `${context.metadata.canonicalName} allowed value`,
                insertText: value,
                sortText: `00_${String(index).padStart(3, "0")}_${value}`,
            }));
        },
    };
}

export function variadicPairs(options: VariadicPairOptions): SemanticConstraint {
    return {
        descriptor: {
            kind: "variadicPairs",
            argumentIndex: options.startIndex,
            minimumPairs: options.minimumPairs,
            listName: options.listName,
        },
        validatesArgument(argumentIndex) {
            return argumentIndex === options.startIndex;
        },
        validate(context) {
            const listArgument = context.functionCall.arguments[options.startIndex];
            const elements = listArgument
                ? (parseListElements(listArgument, context.sourceText) ??
                  context.functionCall.arguments.slice(options.startIndex))
                : [];
            const minimumElements = options.minimumPairs * 2;
            const issues: SemanticIssue[] = [];

            if (elements.length === 0 || elements.every((argument) => !hasValue(argument))) {
                return [
                    issueForCall(
                        context.functionCall,
                        `'${context.metadata.canonicalName}' requires at least ${options.minimumPairs} complete ${formatPairCount(options.minimumPairs)} in '${options.listName}'.`,
                    ),
                ];
            }

            if (elements.length < minimumElements) {
                const unmatchedArgument = elements.at(-1);

                return [
                    unmatchedArgument && hasValue(unmatchedArgument)
                        ? issueForArgument(
                              unmatchedArgument,
                              `'${context.metadata.canonicalName}' ${options.listName} value must be followed by its paired result.`,
                          )
                        : issueForCall(
                              context.functionCall,
                              `'${context.metadata.canonicalName}' requires at least ${options.minimumPairs} complete ${formatPairCount(options.minimumPairs)} in '${options.listName}'.`,
                          ),
                ];
            }

            if (elements.length % 2 !== 0) {
                const unmatchedArgument = elements[elements.length - 1];
                issues.push(
                    hasValue(unmatchedArgument)
                        ? issueForArgument(
                              unmatchedArgument,
                              `'${context.metadata.canonicalName}' ${options.listName} value must be followed by its paired result.`,
                          )
                        : issueForCall(
                              context.functionCall,
                              `'${context.metadata.canonicalName}' '${options.listName}' must contain complete value/result pairs.`,
                          ),
                );
            }

            for (let elementIndex = 0; elementIndex < elements.length; elementIndex++) {
                const argument = elements[elementIndex];
                const role = elementIndex % 2 === 0 ? "test value" : "result";

                if (!hasValue(argument)) {
                    issues.push(
                        issueForCall(
                            context.functionCall,
                            `'${context.metadata.canonicalName}' ${options.listName} pair ${Math.floor(elementIndex / 2) + 1} is missing its ${role}.`,
                        ),
                    );
                    continue;
                }

                if (elementIndex % 2 === 0 && options.keyConstraint) {
                    issues.push(...options.keyConstraint.validate(argument, context, Math.floor(elementIndex / 2)));
                }
            }

            return issues;
        },
    };
}

export function sameTypeAsArgument(referenceArgumentIndex: number): PairKeyConstraint {
    return {
        validate(keyArgument, context, pairIndex) {
            const referenceArgument = context.functionCall.arguments[referenceArgumentIndex];
            const referenceType = context.inferType(referenceArgument);
            const keyType = context.inferType(keyArgument);

            if (!referenceType || !keyType || isTypeCompatible(referenceType, keyType)) {
                return [];
            }

            return [
                issueForArgument(
                    keyArgument,
                    `'${context.metadata.canonicalName}' case ${pairIndex + 1} expects ${referenceType} to match argument ${referenceArgumentIndex + 1}; received ${keyType}.`,
                ),
            ];
        },
    };
}

function createValidationContext(
    functionCall: FunctionCall,
    metadata: FunctionMetadata,
    runtime: SemanticValidationRuntime,
): SemanticValidationContext {
    return {
        functionCall,
        metadata,
        sourceText: runtime.sourceText,
        inferType(argument) {
            if (!argument || !hasValue(argument)) {
                return undefined;
            }

            return inferArgumentType(argument, runtime.callLookup, runtime.catalog, runtime.typeInferenceContext);
        },
        isStaticallyKnownLiteral(argument): argument is ParsedArgument {
            if (!argument || argument.tokens.length !== 1) {
                return false;
            }

            const token = argument.tokens[0];

            if (token.kind !== TokenKind.Identifier && token.kind !== TokenKind.StringLiteral) {
                return false;
            }

            if (token.kind !== TokenKind.Identifier) {
                return true;
            }

            const possibleCall = runtime.callLookup.get(token.offset);

            return !possibleCall || !runtime.catalog.findByName(possibleCall.name);
        },
    };
}

function parseListElements(argument: ParsedArgument, sourceText: string): ParsedArgument[] | null {
    if (
        argument.tokens[0]?.kind !== TokenKind.LeftBracket ||
        argument.tokens[argument.tokens.length - 1]?.kind !== TokenKind.RightBracket
    ) {
        return null;
    }

    const elementTokenGroups: ParsedArgument["tokens"][] = [];
    let currentTokens: ParsedArgument["tokens"] = [];
    let bracketDepth = 0;
    let parenthesisDepth = 0;

    for (const token of argument.tokens.slice(1, -1)) {
        if (token.kind === TokenKind.Comma && bracketDepth === 0 && parenthesisDepth === 0) {
            elementTokenGroups.push(currentTokens);
            currentTokens = [];
            continue;
        }

        currentTokens.push(token);

        if (token.kind === TokenKind.LeftBracket) {
            bracketDepth++;
        } else if (token.kind === TokenKind.RightBracket) {
            bracketDepth--;
        } else if (token.kind === TokenKind.LeftParenthesis) {
            parenthesisDepth++;
        } else if (token.kind === TokenKind.RightParenthesis) {
            parenthesisDepth--;
        }
    }

    if (currentTokens.length > 0 || elementTokenGroups.length > 0) {
        elementTokenGroups.push(currentTokens);
    }

    return elementTokenGroups.map((tokens) => {
        if (tokens.length === 0) {
            return { text: "", startOffset: -1, endOffset: -1, tokens };
        }

        const startOffset = tokens[0].offset;
        const lastToken = tokens[tokens.length - 1];
        const endOffset = lastToken.offset + lastToken.length;

        return {
            text: sourceText.slice(startOffset, endOffset).trim(),
            startOffset,
            endOffset,
            tokens,
        };
    });
}

function hasValue(argument: ParsedArgument | undefined): argument is ParsedArgument {
    return Boolean(argument && argument.tokens.length > 0 && argument.text.trim().length > 0);
}

function issueForArgument(argument: ParsedArgument, message: string): SemanticIssue {
    return {
        offset: argument.startOffset,
        length: Math.max(argument.endOffset - argument.startOffset, 1),
        message,
    };
}

function issueForCall(functionCall: FunctionCall, message: string): SemanticIssue {
    return {
        offset: functionCall.startOffset,
        length: Math.max(functionCall.endOffset - functionCall.startOffset, 1),
        message,
    };
}

function formatPairCount(count: number) {
    return count === 1 ? "case/result pair" : "case/result pairs";
}
