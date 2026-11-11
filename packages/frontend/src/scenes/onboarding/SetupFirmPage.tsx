import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { Button } from '@depose/ui/components/button';
import { FormField } from '~/lib/components/FormField';
import { NativeSelect, NativeSelectOption } from '@depose/ui/components/native-select';
import { Label } from '@depose/ui/components/label';
import { ApiError } from '~/lib/api/errors';
import { Alert, AlertDescription, AlertTitle } from '@depose/ui/components/alert';
import { CircleWarning } from '@coolicons/react';
import { queryClient } from '~/lib/query/client';
import { queryKeys } from '~/lib/query/keys';
import { meControllerMe } from '~/generated/endpoints';
import { unwrapData } from '~/lib/api/client';
import { firmsControllerSetup } from '~/generated/endpoints';
import { FirmsControllerSetupBodyPrimaryLanguage } from '~/generated/schemas';
import { z } from 'zod';

const setupSchema = z.object({
  name: z.string().trim().min(1, 'Firm name is required.').max(120),
  role: z.string().trim().max(80).optional(),
  primaryLanguage: z.enum(['en']),
  jurisdiction: z.string().trim().max(8).optional(),
  timezone: z.string().trim().max(64).optional(),
  slug: z.string().trim().max(40).optional(),
});

type SetupFormValues = z.infer<typeof setupSchema>;

function clean(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function SetupFirmPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const form = useForm<SetupFormValues>({
    resolver: zodResolver(setupSchema),
    defaultValues: {
      name: '',
      role: '',
      primaryLanguage: 'en',
      jurisdiction: '',
      timezone: 'UTC',
      slug: '',
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      await firmsControllerSetup({
        name: values.name.trim(),
        role: clean(values.role),
        primaryLanguage: values.primaryLanguage,
        jurisdiction: clean(values.jurisdiction),
        timezone: clean(values.timezone),
        slug: clean(values.slug),
      });
      const me = unwrapData(await meControllerMe());
      queryClient.setQueryData(queryKeys.me, me);
      navigate('/matters', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Firm creation failed. Please try again.');
    }
  });

  const primaryLanguage = form.watch('primaryLanguage');

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-6 flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-medium tracking-tight">Create your first firm</h1>
        <p className="text-sm text-muted-foreground">
          This instance does not have a firm yet. Complete the basics to get started.
        </p>
      </div>

      <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
        {error ? (
          <Alert variant="destructive">
            <CircleWarning size={16} />
            <AlertTitle>Firm creation failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

          <FormField
          inputId="setup-name"
          label="Firm name"
          type="text"
          placeholder="Test Firm"
          {...form.register('name')}
          error={form.formState.errors.name?.message}
        />
        <FormField
          inputId="setup-role"
          label="Your role"
          type="text"
          placeholder="Managing partner"
          hint="Optional. Your role in the firm."
          {...form.register('role')}
          error={form.formState.errors.role?.message}
        />
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="setup-language">Primary language</Label>
          <NativeSelect
            id="setup-language"
            value={primaryLanguage}
            onChange={(event) =>
              form.setValue('primaryLanguage', event.target.value as 'en')
            }
          >
            <NativeSelectOption value={FirmsControllerSetupBodyPrimaryLanguage.en}>
              English
            </NativeSelectOption>
          </NativeSelect>
        </div>
        <FormField
          inputId="setup-jurisdiction"
          label="Jurisdiction"
          type="text"
          placeholder="e.g. US"
          {...form.register('jurisdiction')}
          error={form.formState.errors.jurisdiction?.message}
        />
        <FormField
          inputId="setup-timezone"
          label="Timezone"
          type="text"
          placeholder="UTC"
          {...form.register('timezone')}
          error={form.formState.errors.timezone?.message}
        />
        <FormField
          inputId="setup-slug"
          label="Slug"
          type="text"
          placeholder="test-firm"
          hint="Optional. Lowercase letters, numbers, and hyphens."
          {...form.register('slug')}
          error={form.formState.errors.slug?.message}
        />

        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Creating firm...' : 'Create firm'}
        </Button>
      </form>
    </div>
  );
}
