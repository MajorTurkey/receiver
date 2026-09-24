import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "motion inline-flex items-center justify-center gap-2 font-medium transition-[transform,background-color,opacity,color] duration-150 ease-soft disabled:pointer-events-none disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-[0.98]",
  {
    variants: {
      variant: {
        primary: "bg-fg text-bg hover:opacity-90",
        ghost: "bg-transparent text-fg hover:bg-surface-2",
        quiet: "bg-surface-2 text-fg hover:bg-line",
      },
      size: {
        md: "h-11 px-4 rounded-sm text-sm",
        icon: "size-12 rounded-full",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean };

export function Button({ className, variant, size, asChild, type = "button", ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size }), className)} type={type} {...props} />;
}
