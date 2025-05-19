import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/data")({
    component: RouteComponent
});

function RouteComponent() {
    return <div>Hello "/api/data"!</div>;
}
