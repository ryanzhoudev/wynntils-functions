import React, { useEffect, useState } from "react";
import type { wynntilsfunction, wynntilsargument } from "@prisma/client";

type FilterCheckbox = {
    id: string;
    label: string;
    apply: (
        fn: wynntilsfunction,
        args: wynntilsargument[],
        query: string
    ) => boolean;
    defaultChecked?: boolean;
};

type DocsProps = {
    data: { functions: wynntilsfunction[]; arguments: wynntilsargument[] };
    filters: FilterCheckbox[];
    renderAction: (item: any) => React.ReactNode;
};

export function Docs({ data, filters, renderAction }: DocsProps) {
    const [query, setQuery] = useState("");
    const [checkboxes, setCheckboxes] = useState<Record<string, boolean>>(
        Object.fromEntries(filters.map((f) => [f.id, f.defaultChecked ?? true]))
    );
    const [filtered, setFiltered] = useState<wynntilsfunction[]>(
        data.functions
    );

    useEffect(() => {
        setFiltered(applyFilters(data, checkboxes, filters, query));
    }, [data, checkboxes, query, filters]);

    const handleCheckboxChange = (id: string) => {
        setCheckboxes((prev) => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    const applyFilters = (
        items: { functions: wynntilsfunction[]; arguments: wynntilsargument[] },
        active: Record<string, boolean>,
        filters: FilterCheckbox[],
        query: string
    ) => {
        const trimmedQuery = query.trim().toLowerCase();

        return items.functions.filter((fn) => {
            return filters.some((filter) => {
                if (!active[filter.id]) return false;
                return filter.apply(fn, items.arguments, trimmedQuery);
            });
        });
    };

    return (
        <div className="bg-gray-800 min-h-screen">
            <div className="flex flex-col fixed h-screen w-96 bg-blue-1000 text-lg text-white">
                <div className="w-full px-4 pt-2">
                    <p className="font-bold">Search:</p>
                    <code
                        contentEditable
                        suppressContentEditableWarning
                        spellCheck={false}
                        onInput={(e) =>
                            setQuery(
                                (e.target as HTMLElement).textContent ?? ""
                            )
                        }
                        className="block bg-zinc-900 w-full text-white p-1 min-h-24 caret-white outline-none m-0 border-r-0"
                    >
                        <br />
                    </code>
                </div>

                <div className="flex flex-col px-4 pt-2">
                    <p className="font-bold">Search includes:</p>
                    {filters.map((f) => (
                        <label key={f.id} className="flex items-center">
                            <input
                                type="checkbox"
                                className="form-checkbox h-4 w-4"
                                checked={checkboxes[f.id]}
                                onChange={() => handleCheckboxChange(f.id)}
                            />
                            <span className="ml-2">{f.label}</span>
                        </label>
                    ))}
                </div>
            </div>

            <div className="ml-96">
                <div className="grid grid-cols-1 text-white bg-card text-card-foreground">
                    {filtered.map(renderAction)}
                </div>
            </div>
        </div>
    );
}
