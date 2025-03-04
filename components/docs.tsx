"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/card";
import { arguments, functions } from "@prisma/client";
import React, { useState } from "react";

export default function Docs(props: any) {
    const functions: functions[] = props.functions;
    const args: arguments[] = props.args;

    const [filteredFunctions, setFilteredFunctions] = useState<functions[]>(functions);
    const [fnNamesChecked, setFnNamesChecked] = useState<boolean>(true);
    const [fnDescsChecked, setFnDescsChecked] = useState<boolean>(true);

    const checkBoxes = (
        <div className="flex flex-col px-4 pt-2">
            <p className="flex items-start justify-start font-bold">Search includes:</p>

            {/*apparently default-checked boxes need useStates but default-unchecked boxes don't*/}
            {/*web dev is getting worse the more i do it*/}
            <label className="flex items-center">
                <input
                    type="checkbox"
                    className="form-checkbox h-4 w-4"
                    id={"cb_function_names"}
                    checked={fnNamesChecked}
                    onChange={() => {
                        setFnNamesChecked(!fnNamesChecked);
                        setFilteredFunctions(filterFunctions(functions, args));
                    }}
                />
                <span className="ml-2">Function names & aliases</span>
            </label>

            <label className="flex items-center">
                <input
                    type="checkbox"
                    className="form-checkbox h-4 w-4"
                    id={"cb_function_descriptions"}
                    checked={fnDescsChecked}
                    onChange={() => {
                        setFnDescsChecked(!fnDescsChecked);
                        setFilteredFunctions(filterFunctions(functions, args));
                    }}
                />
                <span className="ml-2">Function descriptions</span>
            </label>

            <label className="flex items-center">
                <input
                    type="checkbox"
                    className="form-checkbox h-4 w-4"
                    id={"cb_function_returntypes"}
                    onChange={() => setFilteredFunctions(filterFunctions(functions, args))}
                />
                <span className="ml-2">Function return types</span>
            </label>

            <label className="flex items-center">
                <input
                    type="checkbox"
                    className="form-checkbox h-4 w-4"
                    id={"cb_argument_names"}
                    onChange={() => setFilteredFunctions(filterFunctions(functions, args))}
                />
                <span className="ml-2">Argument names</span>
            </label>

            <label className="flex items-center">
                <input
                    type="checkbox"
                    className="form-checkbox h-4 w-4"
                    id={"cb_argument_descriptions"}
                    onChange={() => setFilteredFunctions(filterFunctions(functions, args))}
                />
                <span className="ml-2">Argument descriptions</span>
            </label>
        </div>
    );

    const searchArea = (
        <div className="w-full px-4 pt-2">
            <p className="flex items-start justify-start font-bold">Search:</p>
            <code
                id="search"
                contentEditable={true}
                suppressContentEditableWarning={true} // why do they care that's the entire point of contentEditable
                spellCheck={false}
                onSelect={() => setFilteredFunctions(filterFunctions(functions, args))}
                className="block bg-zinc-900 w-full text-white p-1 min-h-24 caret-white outline-none m-0 border-r-0"
            >
                {/*firefox doesn't like empty contentEditable elements, the <br> tags fix it*/}
                <br></br>
            </code>
        </div>
    );

    return (
        <div>
            <div className="flex flex-col fixed h-screen w-96 bg-blue-1000 text-lg text-white">
                {searchArea}
                <div className={"py-2"}></div>
                {checkBoxes}
            </div>
            <div className={"ml-96"}>{makeContentCards(filteredFunctions, args)}</div>
        </div>
    );
}

function filterFunctions(functions: functions[], args: arguments[]) {
    let query = document.getElementById("search")?.textContent ?? "";
    const filterFunctionNames = document.querySelector("#cb_function_names:checked") != null;
    const filterFunctionDescriptions = document.querySelector("#cb_function_descriptions:checked") != null;
    const filterFunctionReturnTypes = document.querySelector("#cb_function_returntypes:checked") != null;
    const filterArgumentNames = document.querySelector("#cb_argument_names:checked") != null;
    const filterArgumentDescriptions = document.querySelector("#cb_argument_descriptions:checked") != null;

    let returnable: functions[] = [];

    // no idea why this is necessary but it does not work without it
    // jesus christ i hate javascript and web dev
    query = query.replace(/\u00A0/g, "\u0020");

    for (const func of functions) {
        let toSearch = "";
        if (filterFunctionNames) {
            toSearch += func.name + " " + func.aliases.join(" ");
        }
        if (filterFunctionDescriptions) {
            toSearch += func.description + " ";
        }
        if (filterFunctionReturnTypes) {
            toSearch += func.returntype + " ";
        }
        if (filterArgumentNames) {
            toSearch +=
                args
                    .filter((arg) => arg.functionid == func.id)
                    .map((arg) => arg.name)
                    .join(" ") + " ";
        }
        if (filterArgumentDescriptions) {
            toSearch += args
                .filter((arg) => arg.functionid == func.id)
                .map((arg) => arg.description)
                .join(" ");
        }
        if (toSearch.toLowerCase().includes(query.toLowerCase())) {
            returnable.push(func);
        }
    }

    return returnable;
}

function makeContentCards(functions: functions[], args: arguments[]) {
    if (functions == undefined) {
        console.log("functions undefined in makeContentCards");
        return <div>Failed to load functions.</div>;
    }
    if (args == undefined) {
        console.log("args undefined in makeContentCards");
        return <div>Failed to load arguments.</div>;
    }

    // sort functions by id, which is alphabetical from when the mod exported them
    functions.sort((a, b) => a.id - b.id);

    const entries = [];

    // iterate through functions and create a div for each one
    for (const func of functions) {
        const filteredArgs = args.filter((arg) => arg.functionid == func.id);

        // returns "" if no filteredArgs exist, otherwise returns (arg1, arg2, arg3)
        const argumentSuffix =
            filteredArgs.length == 0
                ? ""
                : "(" +
                  filteredArgs
                      .map((arg) => {
                          return arg.required ? arg.name : arg.name + "?";
                      })
                      .join("; ") +
                  ")";

        const entry = (
            <Card className="bg-gray-800">
                <CardTitle>
                    <code className="ml-2 text-lg">
                        {func.name}
                        {argumentSuffix}
                    </code>
                    <code className="float-right mr-2 text-lg">{func.returntype}</code>
                </CardTitle>
                <CardDescription>
                    <p>{func.description}</p>
                </CardDescription>

                <CardHeader>
                    <p>{filteredArgs.length == 0 ? "No arguments" : "Arguments:"}</p>
                </CardHeader>
                <CardContent>
                    {filteredArgs.map((arg) => (
                        <div key={arg.name}>
                            - <code>{arg.name} </code> (<code>{arg.type}</code>
                            {", "}
                            {arg.required ? "required" : "optional, default: " + arg.defaultvalue})
                            {arg.description == null ? "" : " -- " + arg.description}
                        </div>
                    ))}
                </CardContent>

                <CardHeader>
                    <p>{func.aliases.length == 0 ? "No aliases" : "Aliases:"}</p>
                </CardHeader>
                <CardContent>
                    {func.aliases.map((alias: string) => (
                        <div key={alias}>
                            - <code>{alias}</code>
                        </div>
                    ))}
                </CardContent>
            </Card>
        );

        entries.push(entry);
    }

    return <div className="grid grid-cols-1 text-white bg-card text-card-foreground">{entries}</div>;
}
