import { AlertTriangle, Check } from "lucide-react";
import type { Ref } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { CompileResult } from "@/lib/ide/types";

export type CompileStatus = { tone: "success" | "warning"; message: string };

export function CompiledOutputPanel({
    result,
    status,
    isCopying,
    containerRef,
    onCopy,
    onCreateFile,
}: {
    result: CompileResult;
    status: CompileStatus | null;
    isCopying: boolean;
    containerRef: Ref<HTMLDivElement>;
    onCopy(): void;
    onCreateFile(): void;
}) {
    return (
        <Card
            ref={containerRef}
            className={
                status?.tone === "success"
                    ? "border-emerald-500/50"
                    : status?.tone === "warning"
                      ? "border-amber-500/50"
                      : undefined
            }
        >
            <CardHeader className="gap-2">
                <CardTitle className="flex items-center gap-2 text-base">
                    {status?.tone === "success" ? (
                        <Check className="size-4" />
                    ) : status?.tone === "warning" ? (
                        <AlertTriangle className="size-4" />
                    ) : null}
                    Compiled output
                </CardTitle>
                {status ? (
                    <CardDescription className={status.tone === "success" ? "text-emerald-300" : "text-amber-200"}>
                        {status.message}
                    </CardDescription>
                ) : null}
            </CardHeader>
            <CardContent className="space-y-3">
                <textarea
                    value={result.code}
                    readOnly
                    spellCheck={false}
                    className="h-40 w-full resize-y rounded-md border border-input bg-background p-3 font-mono text-xs"
                />
                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={onCopy} disabled={isCopying}>
                        {isCopying ? "Copied" : "Copy output"}
                    </Button>
                    <Button variant="secondary" onClick={onCreateFile}>
                        Create file from output
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
