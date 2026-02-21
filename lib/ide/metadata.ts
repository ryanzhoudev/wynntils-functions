import { FunctionEntry } from "@/lib/types";
import { FunctionMetadata } from "@/lib/ide/types";

export function toFunctionMetadata(functions: FunctionEntry[]): FunctionMetadata[] {
    return functions.map((entry) => ({
        canonicalName: entry.name,
        description: entry.description,
        returnType: entry.returnType,
        aliases: entry.aliases,
        arguments: entry.arguments.map((argument) => ({
            name: argument.name,
            required: argument.required,
            type: argument.type,
            defaultValue: argument.defaultValue,
        })),
    }));
}
