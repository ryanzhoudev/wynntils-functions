import React from "react";

// ?
export const CardContent = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div ref={ref} className="ml-4 p-6 pt-0" {...props} />
));
CardContent.displayName = "CardContent";
