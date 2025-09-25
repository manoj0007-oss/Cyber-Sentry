import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "cyber-button inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        
        // Cyberpunk variants using design system
        cyber: "bg-cyber-primary text-cyber-dark hover:bg-cyber-primary/80 glow-primary border border-cyber-primary/30",
        "cyber-secondary": "bg-cyber-secondary text-cyber-dark hover:bg-cyber-secondary/80 glow-secondary border border-cyber-secondary/30", 
        "cyber-danger": "bg-cyber-danger text-foreground hover:bg-cyber-danger/80 glow-danger border border-cyber-danger/30",
        "cyber-accent": "bg-cyber-accent text-cyber-dark hover:bg-cyber-accent/80 glow-accent border border-cyber-accent/30",
        "cyber-outline": "border-2 border-cyber-accent/50 text-cyber-accent bg-transparent hover:bg-cyber-accent/10 hover:border-cyber-accent",
        "cyber-ghost": "text-cyber-accent hover:bg-cyber-accent/10 hover:text-cyber-accent-glow",
        "glass": "glass-panel border-cyber-accent/30 text-cyber-accent hover:bg-cyber-accent/5 backdrop-blur-md",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        xl: "h-14 rounded-lg px-10 text-lg",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
