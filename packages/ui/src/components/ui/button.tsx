import { Button as ButtonPrimitive } from '@base-ui/react/button';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from 'cn';

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-md border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-[color,background-color,border-color,box-shadow,transform] outline-none select-none cursor-pointer focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/30 dark:aria-invalid:border-destructive/60 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          'border-primary bg-primary text-primary-foreground shadow-[0_2px_0_0_var(--color-primary-frame)] hover:bg-[color-mix(in_oklch,var(--color-primary),black_7%)] active:not-aria-[haspopup]:translate-y-[2px] active:not-aria-[haspopup]:shadow-none',
        outline:
          'border-border bg-background text-foreground shadow-[0_2px_0_0_var(--color-button-frame)] hover:bg-muted hover:border-border-bold hover:text-foreground active:not-aria-[haspopup]:translate-y-[2px] active:not-aria-[haspopup]:shadow-none aria-expanded:bg-muted dark:border-input dark:bg-card dark:hover:bg-accent/40',
        secondary:
          'border-border/80 bg-secondary text-secondary-foreground shadow-[0_2px_0_0_var(--color-button-frame)] hover:bg-[color-mix(in_oklch,var(--color-secondary),var(--color-foreground)_5%)] hover:border-border-bold active:not-aria-[haspopup]:translate-y-[2px] active:not-aria-[haspopup]:shadow-none aria-expanded:bg-secondary',
        ghost:
          'border-transparent bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground active:bg-accent/80 active:not-aria-[haspopup]:translate-y-px aria-expanded:bg-accent',
        destructive:
          'border-destructive bg-destructive text-destructive-foreground shadow-[0_2px_0_0_var(--color-destructive-frame)] hover:bg-[color-mix(in_oklch,var(--color-destructive),black_8%)] active:not-aria-[haspopup]:translate-y-[2px] active:not-aria-[haspopup]:shadow-none focus-visible:border-destructive/60 focus-visible:ring-destructive/30',
        link: 'border-transparent text-primary underline-offset-4 hover:underline hover:text-[color-mix(in_oklch,var(--color-primary),white_15%)] active:not-aria-[haspopup]:translate-none',
      },
      size: {
        default:
          'h-8 gap-1.5 px-3 rounded-md text-sm has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5',
        xs: "h-6 gap-1 rounded-sm px-2 text-xs in-data-[slot=button-group]:rounded-md has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-md px-2.5 text-xs in-data-[slot=button-group]:rounded-md has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3.5",
        lg: 'h-9 gap-2 px-3.5 rounded-md text-sm has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3',
        icon: 'size-8 rounded-md',
        'icon-xs':
          "size-6 rounded-sm in-data-[slot=button-group]:rounded-md [&_svg:not([class*='size-'])]:size-3",
        'icon-sm':
          "size-7 rounded-md in-data-[slot=button-group]:rounded-md [&_svg:not([class*='size-'])]:size-3.5",
        'icon-lg': 'size-9 rounded-md',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

function Button({
  className,
  variant = 'default',
  size = 'default',
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
