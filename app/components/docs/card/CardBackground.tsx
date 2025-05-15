import React from 'react'

// uncertain
export const CardBackground = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => (
        <div ref={ref} className="bg-card text-card-foreground shadow-sm bg-gray-800" {...props} />
    ),
)
CardBackground.displayName = 'Card'
