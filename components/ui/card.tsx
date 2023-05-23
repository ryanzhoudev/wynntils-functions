import * as React from "react";

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
    <div ref={ref} className="bg-card border text-card-foreground shadow-sm" {...props} />
));
Card.displayName = "Card";

// A single use title component with the default, non-aliased function syntax
const CardTitle = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => <div ref={ref} className="p-2 font-bold bg-zinc-700" {...props} />,
);
CardTitle.displayName = "CardHeader";

// A single use description component explaining what any given function does
const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
    ({ className, ...props }, ref) => <p ref={ref} className="ml-4 text-muted-foreground" {...props} />,
);
CardDescription.displayName = "CardDescription";

const CardHeader = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
    ({ className, ...props }, ref) => <p ref={ref} className="ml-4 text-lg font-bold" {...props} />,
);
CardHeader.displayName = "CardHeader";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => <div ref={ref} className="ml-4 p-6 pt-0" {...props} />,
);
CardContent.displayName = "CardContent";

export { Card, CardTitle, CardDescription, CardHeader, CardContent };
