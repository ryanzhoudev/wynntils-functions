import { createFileRoute } from '@tanstack/react-router'
import MonacoEditor from '../../components/MonacoEditor.tsx'

export const Route = createFileRoute('/functions/ide')({
    component: RouteComponent,
})

function RouteComponent() {
    return MonacoEditor()
}
