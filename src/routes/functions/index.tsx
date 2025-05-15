import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/functions/')({
    component: RouteComponent,
})

function RouteComponent() {
    return <div>Hello "/functions/"!</div>
}
