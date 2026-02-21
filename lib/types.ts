export type FunctionArgument = {
    id: number;
    name: string;
    description: string | null;
    required: boolean;
    type: string;
    defaultValue: string | null;
};

export type FunctionEntry = {
    id: number;
    name: string;
    description: string;
    aliases: string[];
    returnType: string;
    arguments: FunctionArgument[];
};

export type FunctionCatalogResponse = {
    functions: FunctionEntry[];
    count: number;
    generatedAt: string;
};
