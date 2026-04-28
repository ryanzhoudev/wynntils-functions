import type { FunctionArgumentMetadata } from "@/lib/ide/browser-lsp/catalog";

export type ArgumentSlot = {
    argument: FunctionArgumentMetadata;
    index: number;
    isListRest: boolean;
};

export function resolveArgumentSlot(argumentsMetadata: FunctionArgumentMetadata[], argumentIndex: number): ArgumentSlot | null {
    const exactArgument = argumentsMetadata[argumentIndex];

    if (exactArgument) {
        return {
            argument: exactArgument,
            index: argumentIndex,
            isListRest: false,
        };
    }

    const lastArgumentIndex = argumentsMetadata.length - 1;
    const lastArgument = argumentsMetadata[lastArgumentIndex];

    if (!lastArgument || !isListArgument(lastArgument)) {
        return null;
    }

    return {
        argument: lastArgument,
        index: lastArgumentIndex,
        isListRest: true,
    };
}

export function isListArgument(argument: FunctionArgumentMetadata | undefined) {
    return normalizeArgumentType(argument?.type) === "list";
}

export function canOmitArgument(argument: FunctionArgumentMetadata) {
    return !argument.required || isListArgument(argument);
}

export function formatArgumentLabel(argument: FunctionArgumentMetadata) {
    const suffix = isListArgument(argument) ? "..." : "";

    return `${argument.name}: ${argument.type}${suffix}`;
}

export function resolveCompletionType(argument: FunctionArgumentMetadata | undefined) {
    if (!argument) {
        return undefined;
    }

    if (!isListArgument(argument)) {
        return argument.type;
    }

    return inferListElementType(argument);
}

export function normalizeArgumentType(typeName: string | null | undefined) {
    return (typeName ?? "").trim().toLowerCase();
}

function inferListElementType(argument: FunctionArgumentMetadata) {
    const hint = `${argument.name} ${argument.description ?? ""}`.toLowerCase();

    if (/\bnumber|integer|double|amount|value|values\b/.test(hint)) {
        return "Number";
    }

    if (/\bboolean|true|false\b/.test(hint)) {
        return "Boolean";
    }

    if (/\bstring|text|message|label|name\b/.test(hint)) {
        return "String";
    }

    if (/\bstyled\b/.test(hint)) {
        return "StyledText";
    }

    return undefined;
}
