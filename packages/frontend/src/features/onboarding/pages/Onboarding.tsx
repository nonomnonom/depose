import { Badge } from '@depose/ui/components/badge';
import { Button } from '@depose/ui/components/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@depose/ui/components/card';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '~/lib/api/client';

interface OnboardingStatus {
  dismissed: boolean;
  steps: {
    firmConfigured: boolean;
    firstMatter: boolean;
  };
}

const onboardingQueryKey = ['onboarding'] as const;

export function Onboarding() {
  const queryClient = useQueryClient();

  const status = useQuery({
    queryKey: onboardingQueryKey,
    queryFn: () => api.get<OnboardingStatus>('/api/v1/onboarding'),
  });

  const dismiss = useMutation({
    mutationFn: () => api.post('/api/v1/onboarding/dismiss'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: onboardingQueryKey }),
  });

  const steps = [
    { key: 'firm', label: 'Setup Firm', done: status.data?.steps.firmConfigured },
    { key: 'matter', label: 'Buat Matter', done: status.data?.steps.firstMatter },
    { key: 'invite', label: 'Terima Undangan', done: false },
  ];

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-heading text-xl font-medium tracking-tight">Onboarding</h1>
        <p className="text-sm text-muted-foreground">Selamat datang di Depose</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Onboarding</CardTitle>
          <CardDescription>Ikuti langkah berikut untuk memulai</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <ul className="flex flex-col divide-y divide-border">
            {steps.map((step) => (
              <li key={step.key} className="flex items-center justify-between gap-3 py-2.5">
                <span className={step.done ? 'text-sm' : 'text-sm text-muted-foreground'}>
                  {step.label}
                </span>
                <Badge variant={step.done ? 'default' : 'outline'}>
                  {step.done ? 'Selesai' : 'Menunggu'}
                </Badge>
              </li>
            ))}
          </ul>
          <div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => dismiss.mutate()}
              disabled={dismiss.isPending || status.data?.dismissed}
            >
              Tutup
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}