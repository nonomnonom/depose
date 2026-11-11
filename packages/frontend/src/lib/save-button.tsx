import type { ComponentProps } from 'react';
import { Button } from '@depose/ui/components/button';

interface SaveButtonProps extends Omit<ComponentProps<typeof Button>, 'disabled' | 'type'> {
  save?: () => void | Promise<void>;
  disabled?: boolean;
  loading?: boolean;
}

export function SaveButton({ save, disabled, loading, children, ...props }: SaveButtonProps) {
  void save;
  return (
    <Button type="submit" disabled={disabled || loading} {...props}>
      {loading ? 'Saving...' : children}
    </Button>
  );
}
