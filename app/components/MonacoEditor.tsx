import { useEffect, useRef } from 'react'
import * as monaco from 'monaco-editor'

const MonacoEditor = () => {
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!containerRef.current) return

        const editor = monaco.editor.create(containerRef.current, {
            value: '// Start scripting in Wynntils...\n',
            language: 'javascript', // placeholder for now
            theme: 'vs-dark',
            automaticLayout: true,
        })

        return () => editor.dispose()
    }, [])

    return <div ref={containerRef} className="w-full h-screen" />
}

export default MonacoEditor
