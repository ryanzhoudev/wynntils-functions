import { createFileRoute } from '@tanstack/react-router'
import { Docs } from '../../components/docs/page.tsx'
import type { wynntilsfunction, wynntilsargument } from '@prisma/client'
import Card from '../../components/docs/card.tsx'
import { useEffect, useState } from 'react'

export const Route = createFileRoute('/functions/')({
    component: RouteComponent,
})

function getFilters() {
    return [
        {
            id: 'fn_name',
            label: 'Function names & aliases',
            apply: (fn: wynntilsfunction, _args: wynntilsargument[], query: string) =>
                (fn.name + ' ' + fn.aliases.join(' ')).toLowerCase().includes(query.toLowerCase()),
            defaultChecked: true,
        },
        {
            id: 'fn_desc',
            label: 'Function descriptions',
            apply: (fn: wynntilsfunction, _args: wynntilsargument[], query: string) =>
                fn.description.toLowerCase().includes(query.toLowerCase()),
            defaultChecked: true,
        },
        {
            id: 'fn_return',
            label: 'Function return types',
            apply: (fn: wynntilsfunction, _args: wynntilsargument[], query: string) =>
                fn.returntype.toLowerCase().includes(query.toLowerCase()),
            defaultChecked: false,
        },
        {
            id: 'arg_names',
            label: 'Argument names',
            apply: (fn: wynntilsfunction, args: wynntilsargument[], query: string) =>
                args
                    .filter((arg: wynntilsargument) => arg.functionid === fn.id)
                    .some((arg: wynntilsargument) => arg.name.toLowerCase().includes(query.toLowerCase())),
            defaultChecked: false,
        },
        {
            id: 'arg_descs',
            label: 'Argument descriptions',
            apply: (fn: wynntilsfunction, args: wynntilsargument[], query: string) =>
                args
                    .filter((arg: wynntilsargument) => arg.functionid === fn.id)
                    .some((arg: wynntilsargument) =>
                        (arg.description ?? '').toLowerCase().includes(query.toLowerCase()),
                    ),
            defaultChecked: false,
        },
    ]
}

function RouteComponent() {
    const [data, setData] = useState<{ functions: wynntilsfunction[]; arguments: wynntilsargument[] } | null>(null)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        fetch('/api/data')
            .then((res) => {
                if (!res.ok) throw new Error('Failed to fetch')
                return res.json()
            })
            .then(setData)
            .catch((err) => setError(err.message))
    }, [])

    if (error) return <div className="text-red-500">Error: {error}</div>
    if (!data) return <div className="text-white">Loading...</div>

    const renderCard = (func: any) => {
        const filteredArgs: wynntilsargument[] = data.arguments.filter((arg: any) => arg.functionid === func.id)
        const argSuffix =
            filteredArgs.length === 0
                ? ''
                : '(' + filteredArgs.map((arg: any) => (arg.required ? arg.name : arg.name + '?')).join('; ') + ')'

        return Card(func, filteredArgs, argSuffix)
    }

    return <Docs data={data} filters={getFilters()} renderAction={renderCard} />
}
