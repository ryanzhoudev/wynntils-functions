import type { LspMarkupContent, LspSignatureHelp } from "@/lib/ide/types";

function toPlainDocumentation(documentation: string | LspMarkupContent | undefined) {
    if (!documentation) {
        return "";
    }

    const value = typeof documentation === "string" ? documentation : documentation.value;
    return value
        .replace(/`([^`]+)`/g, "$1")
        .replace(/\*\*([^*]+)\*\*/g, "$1")
        .trim();
}

function formatParameterLabel(label: string | [number, number]) {
    return Array.isArray(label) ? "" : label;
}

function formatSignatureName(label: string) {
    const parenthesisIndex = label.indexOf("(");
    return parenthesisIndex >= 0 ? label.slice(0, parenthesisIndex) : label;
}

export function ContextPanel({ signatureHelp }: { signatureHelp: LspSignatureHelp | null }) {
    const signatureStack = signatureHelp?.signatures ?? [];
    const activeSignature = signatureStack[signatureHelp?.activeSignature ?? 0] ?? null;
    const activeSignatureParameterIndex = activeSignature?.activeParameter ?? signatureHelp?.activeParameter ?? 0;
    const activeParameter = activeSignature?.parameters?.[activeSignatureParameterIndex] ?? null;
    const activeParameterDocumentation = toPlainDocumentation(activeParameter?.documentation);
    const signatureDocumentation = toPlainDocumentation(activeSignature?.documentation);

    return (
        <aside className="h-44 overflow-y-auto rounded-md border border-border bg-muted/30 px-3 py-2 text-xs xl:h-[calc(100vh-11.75rem)]">
            <div className="mb-2 text-[11px] font-semibold uppercase text-muted-foreground">Context</div>
            {activeSignature ? (
                <div>
                    {signatureStack.length > 1 ? (
                        <div className="mb-3 rounded-md border border-border bg-background/45 p-2">
                            <div className="mb-2 text-[11px] font-medium uppercase text-muted-foreground">
                                Function Stack
                            </div>
                            <div className="space-y-1.5">
                                {signatureStack.map((signature, index) => {
                                    const isActive = index === signatureHelp?.activeSignature;
                                    const activeParameterLabel =
                                        signature.parameters?.[signature.activeParameter ?? 0]?.label;

                                    return (
                                        <div
                                            key={`${signature.label}-${index}`}
                                            className={`rounded border px-2 py-1.5 ${
                                                isActive
                                                    ? "border-blue-400 bg-blue-500/15 text-blue-100"
                                                    : "border-border bg-card/70 text-muted-foreground"
                                            }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className="min-w-0 flex-1 truncate font-mono text-[12px]">
                                                    {formatSignatureName(signature.label)}
                                                </div>
                                                <span
                                                    className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] uppercase ${
                                                        isActive
                                                            ? "border-blue-300/70 bg-blue-300/15 text-blue-100"
                                                            : "border-border bg-background/50 text-muted-foreground"
                                                    }`}
                                                >
                                                    {isActive ? "cursor" : "parent"}
                                                </span>
                                            </div>
                                            {activeParameterLabel ? (
                                                <div className="mt-1 flex min-w-0 items-baseline gap-1.5 text-[11px]">
                                                    <span className="shrink-0 text-muted-foreground">argument</span>
                                                    <span className="truncate font-mono">
                                                        {formatParameterLabel(activeParameterLabel)}
                                                    </span>
                                                </div>
                                            ) : null}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : null}
                    <div className="wrap-break-word font-mono text-[13px] leading-relaxed text-foreground">
                        {activeSignature.label}
                    </div>
                    {signatureDocumentation ? (
                        <p className="mt-2 whitespace-pre-line leading-relaxed text-muted-foreground">
                            {signatureDocumentation}
                        </p>
                    ) : null}
                    {activeSignature.parameters && activeSignature.parameters.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                            {activeSignature.parameters.map((parameter, index) => (
                                <span
                                    key={`${formatParameterLabel(parameter.label)}-${index}`}
                                    className={`rounded border px-2 py-1 font-mono ${
                                        index === activeSignatureParameterIndex
                                            ? "border-blue-400 bg-blue-500/15 text-blue-100"
                                            : "border-border bg-background/60 text-muted-foreground"
                                    }`}
                                >
                                    {formatParameterLabel(parameter.label)}
                                </span>
                            ))}
                        </div>
                    ) : null}
                    {activeParameterDocumentation ? (
                        <div className="mt-3 border-t border-border pt-3">
                            <span className="font-medium text-foreground">Active argument</span>
                            <p className="mt-1 whitespace-pre-line leading-relaxed text-muted-foreground">
                                {activeParameterDocumentation}
                            </p>
                        </div>
                    ) : null}
                </div>
            ) : (
                <div className="font-mono text-muted-foreground">No active function</div>
            )}
        </aside>
    );
}
