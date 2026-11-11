import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@depose/ui/components/button';
import { Alert, AlertDescription, AlertTitle } from '@depose/ui/components/alert';
import { CheckCircle2Icon, CircleIcon, ListChecksIcon } from 'lucide-react';
import { ErrorState } from '~/layout/ErrorPage';
import { queryKeys } from '~/lib/query/keys';
import { onboardingControllerDismiss, onboardingControllerStatus } from '~/generated/endpoints';

export function OnboardingPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const statusQuery = useQuery({
    queryKey: queryKeys.onboarding,
    queryFn: async () => (await onboardingControllerStatus()).data,
  });

  const dismiss = useMutation({
    mutationFn: async () => onboardingControllerDismiss(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.onboarding });
      navigate('/matters', { replace: true });
    },
  });

  if (statusQuery.isPending) {
    return <p className="text-sm text-muted-foreground">Memuat onboarding...</p>;
  }

  if (statusQuery.isError) {
    return (
      <ErrorState
        title="Onboarding tidak dapat dimuat"
        message={statusQuery.error instanceof Error ? statusQuery.error.message : 'Permintaan gagal.'}
        onRetry={() => void statusQuery.refetch()}
      />
    );
  }

  const status = statusQuery.data;
  const steps = [
    { label: 'Firm dikonfigurasi', done: status.steps.firmConfigured },
    { label: 'Buat matter pertama', done: status.steps.firstMatter },
  ];

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-medium tracking-tight">Onboarding</h1>
        <p className="text-sm text-muted-foreground">
          Lengkapi langkah awal agar tim Anda siap bekerja.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {steps.map((step) => (
          <div
            key={step.label}
            className="flex items-center gap-3 rounded-md border border-border bg-card px-4 py-3"
          >
            {step.done ? (
              <CheckCircle2Icon className="size-5 text-primary" aria-hidden="true" />
            ) : (
              <CircleIcon className="size-5 text-muted-foreground" aria-hidden="true" />
            )}
            <span className={step.done ? 'text-foreground' : 'text-muted-foreground'}>{step.label}</span>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Button asChild variant="outline">
          <Link to="/matters">
            <ListChecksIcon className="size-4" />
            Buka Matter
          </Link>
        </Button>
        <Button
          variant="ghost"
          disabled={dismiss.isPending || status.dismissed}
          onClick={() => dismiss.mutate()}
        >
          {status.dismissed ? 'Sudah ditutup' : 'Tutup onboarding'}
        </Button>
      </div>

      {dismiss.isError ? (
        <Alert variant="destructive" className="mt-4">
          <AlertTitle>Gagal menutup onboarding</AlertTitle>
          <AlertDescription>
            {dismiss.error instanceof Error ? dismiss.error.message : 'Permintaan gagal.'}
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
