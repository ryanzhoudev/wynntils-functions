import type { FunctionArgument, FunctionCatalogResponse, FunctionEntry } from "@/lib/types";

let nextFunctionId = 1;
let nextArgumentId = 1;

type TestArgument = Partial<Omit<FunctionArgument, "id">> & Pick<FunctionArgument, "name" | "type">;

export function testArgument(argument: TestArgument): FunctionArgument {
    return {
        id: nextArgumentId++,
        name: argument.name,
        description: argument.description ?? null,
        required: argument.required ?? true,
        type: argument.type,
        defaultValue: argument.defaultValue ?? null,
    };
}

export function testFunction(
    name: string,
    returnType: string,
    argumentsMetadata: TestArgument[] = [],
    options: Partial<Pick<FunctionEntry, "aliases" | "description">> = {},
): FunctionEntry {
    return {
        id: nextFunctionId++,
        name,
        description: options.description ?? `${name} test function`,
        aliases: options.aliases ?? [],
        returnType,
        arguments: argumentsMetadata.map(testArgument),
    };
}

export function testCatalog(functions: FunctionEntry[]): FunctionCatalogResponse {
    return {
        functions,
        count: functions.length,
        dataVersion: "test",
        harvestedAt: 0,
    };
}

export function createRepresentativeCatalog() {
    return testCatalog([
        testFunction("if", "Object", [
            { name: "condition", type: "Boolean" },
            { name: "ifTrue", type: "Object" },
            { name: "ifFalse", type: "Object" },
        ]),
        testFunction("from_hex", "CustomColor", [{ name: "hex", type: "String" }]),
        testFunction("parse_double", "Double", [{ name: "value", type: "String" }]),
        testFunction(
            "accessory_durability",
            "CappedValue",
            [
                {
                    name: "accessory",
                    type: "String",
                    description: "One of Ring_1, Ring_2, Bracelet, Necklace",
                },
            ],
        ),
        testFunction(
            "switch_case",
            "Object",
            [
                { name: "switch", type: "Object" },
                { name: "default", type: "Object" },
                { name: "cases", type: "List", description: "Even value/result pairs" },
            ],
            { aliases: ["switch"] },
        ),
    ]);
}
