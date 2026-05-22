import * as React from "react";
import { cn } from "@/lib/utils";

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
    <div ref={ref} className={cn("bg-card text-card-foreground shadow-sm", className)} {...props} />
));
Card.displayName = "Card";

const CardTitle = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
    <div ref={ref} className={cn("bg-zinc-700 p-2 font-bold", className)} {...props} />
));
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
    ({ className, ...props }, ref) => <p ref={ref} className={cn("ml-4 p-4 text-muted-foreground", className)} {...props} />,
);
CardDescription.displayName = "CardDescription";

const CardHeader = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(({ className, ...props }, ref) => (
    <p ref={ref} className={cn("ml-4 text-lg font-bold", className)} {...props} />
));
CardHeader.displayName = "CardHeader";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
    <div ref={ref} className={cn("ml-4 p-6 pt-0", className)} {...props} />
));
CardContent.displayName = "CardContent";

export { Card, CardTitle, CardDescription, CardHeader, CardContent };
