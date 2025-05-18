import React from "react";

// ?
export const CardHeader = React.forwardRef<
    HTMLParagraphElement,
    React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
    <p ref={ref} className="ml-4 text-lg font-bold" {...props} />
));
CardHeader.displayName = "CardHeader";
