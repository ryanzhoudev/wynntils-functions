import React from 'react'

// A single use description component explaining what any given function does
export const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
    ({ className, ...props }, ref) => <p ref={ref} className="ml-4 p-4 text-muted-foreground" {...props} />,
)
CardDescription.displayName = 'CardDescription'
