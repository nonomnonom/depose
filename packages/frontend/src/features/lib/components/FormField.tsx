import { Input } from '@depose/ui/components/input';
import { Label } from '@depose/ui/components/label';
import type { ComponentProps, ReactNode } from 'react';

interface FormFieldProps extends Omit<ComponentProps<'input'>, 'id'> {
  label: string;
  error?: string;
  hint?: ReactNode;
  inputId: string;
}

export function FormField({ label, error, hint, inputId, ...props }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={inputId}>{label}</Label>
      <Input id={inputId} aria-invalid={Boolean(error)} {...props} />
      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
