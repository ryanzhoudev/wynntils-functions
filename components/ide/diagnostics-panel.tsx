import { AlertTriangle } from "lucide-react";
import type { editor as MonacoEditor } from "monaco-editor";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function markerSeverityLabel(severity: number) {
    switch (severity) {
        case 8:
            return "Error";
        case 4:
            return "Warning";
        case 2:
            return "Info";
        case 1:
            return "Hint";
        default:
            return "Info";
    }
}

function markerSeverityVariant(severity: number) {
    switch (severity) {
        case 8:
            return "default" as const;
        case 4:
            return "secondary" as const;
        default:
            return "outline" as const;
    }
}

export function DiagnosticsPanel({
    markers,
    onSelect,
}: {
    markers: MonacoEditor.IMarkerData[];
    onSelect(marker: MonacoEditor.IMarkerData): void;
}) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                    <AlertTriangle className="size-4" />
                    Diagnostics
                </CardTitle>
                <CardDescription>
                    Showing {Math.min(markers.length, 12)} of {markers.length} diagnostics.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
                {markers.slice(0, 12).map((marker, index) => (
                    <button
                        key={`${marker.startLineNumber}-${marker.startColumn}-${index}`}
                        type="button"
                        onClick={() => onSelect(marker)}
                        className="flex w-full items-start gap-3 rounded-md border border-border bg-card p-2 text-left hover:bg-accent"
                    >
                        <Badge variant={markerSeverityVariant(marker.severity)}>
                            {markerSeverityLabel(marker.severity)}
                        </Badge>
                        <div className="min-w-0 flex-1">
                            <p className="text-xs text-muted-foreground">
                                Line {marker.startLineNumber}, Col {marker.startColumn}
                            </p>
                            <p className="line-clamp-2 text-sm">{marker.message}</p>
                        </div>
                    </button>
                ))}
            </CardContent>
        </Card>
    );
}
