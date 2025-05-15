import { CardDescription } from './card/CardDescription.tsx'
import { CardBackground } from './card/CardBackground.tsx'
import { CardTitle } from './card/CardTitle.tsx'
import { CardHeader } from './card/CardHeader.tsx'
import { CardContent } from './card/CardContent.tsx'
import type { wynntilsfunction, wynntilsargument } from '@prisma/client'

export default function Card(func: wynntilsfunction, filteredArgs: wynntilsargument[], argSuffix: string) {
    return (
        <CardBackground key={func.id} className="bg-gray-800">
            <CardTitle>
                <code className="ml-2 text-lg">
                    {func.name}
                    {argSuffix}
                </code>
                <code className="float-right mr-2 text-lg">{func.returntype}</code>
            </CardTitle>
            <CardDescription>
                <p>{func.description}</p>
            </CardDescription>
            <CardHeader>
                <p>{filteredArgs.length === 0 ? 'No arguments' : 'Arguments:'}</p>
            </CardHeader>
            <CardContent>
                {filteredArgs.map((arg: any) => (
                    <div key={arg.name}>
                        - <code>{arg.name}</code> (<code>{arg.type}</code>
                        {', '}
                        {arg.required ? 'required' : 'optional, default: ' + arg.defaultvalue})
                        {arg.description ? ` -- ${arg.description}` : ''}
                    </div>
                ))}
            </CardContent>
            <CardHeader>
                <p>{func.aliases.length === 0 ? 'No aliases' : 'Aliases:'}</p>
            </CardHeader>
            <CardContent>
                {func.aliases.map((alias: string) => (
                    <div key={alias}>
                        - <code>{alias}</code>
                    </div>
                ))}
            </CardContent>
        </CardBackground>
    )
}
