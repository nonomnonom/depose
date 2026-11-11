import { useFormState } from 'react-hook-form';
import { Button, type ButtonProps } from '@depose/ui/components/button';

interface SaveButtonProps extends Omit<ButtonProps, 'disabled' | 'type' | 'loading'> {
  save: () => void | Promise<void>;
  disabled?: boolean;
  loading?: boolean;
}

export function SaveButton({ save, disabled, loading, children, ...props }: SaveButtonProps) {
  const remove = useFormState((state) => state.isDirty);
  const isDirty = !!remove;
  return (
    <Button
      type="submit"
      disabled={disabled || !isDirty}
      loading={loading}
      {...props}
    >
      {children}
    </Button>
  );
}
