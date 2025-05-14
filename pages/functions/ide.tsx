import Editor from "@monaco-editor/react";

export default function FunctionIDE() {
    return (
        <div className="h-[66.6667vh] w-full">
            <Editor
                height="100%"
                defaultLanguage="javascript"
                defaultValue="// Write your Wynntils functions here"
                theme="vs-dark"
            />
        </div>
    );
}
