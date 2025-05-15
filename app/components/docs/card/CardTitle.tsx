import React from 'react'

// A single use title component with the default, non-aliased function syntax
export const CardTitle = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => <div ref={ref} className="p-2 font-bold bg-zinc-700" {...props} />,
)
CardTitle.displayName = 'CardTitle'
