import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Button } from '@depose/ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@depose/ui/components/dialog';
import { Check, Circle } from '@coolicons/react';
import { queryKeys } from '~/lib/query/keys';
import { unwrapData } from '~/lib/api/client';
import { onboardingControllerDismiss, onboardingControllerStatus } from '~/generated/endpoints';
import { useSession } from '~/lib/auth/session';

/**
 * Onboarding is a one-time guided modal, not a permanent navigation item.
 * It appears once the user has a firm and disappears after dismissal.
 */
export function OnboardingDialog() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { me } = useSession();
  const [hidden, setHidden] = useState(false);

  const statusQuery = useQuery({
    queryKey: queryKeys.onboarding,
    queryFn: async () => unwrapData(await onboardingControllerStatus()),
    enabled: Boolean(me?.firm),
    retry: false,
  });

  const dismiss = useMutation({
    mutationFn: async () => onboardingControllerDismiss(),
    onSuccess: () => {
      setHidden(true);
      void queryClient.invalidateQueries({ queryKey: queryKeys.onboarding });
    },
  });

  const status = statusQuery.data;
  const open = Boolean(me?.firm) && Boolean(status) && !status?.dismissed && !hidden;

  if (!status) return null;

  const steps = [
    { label: 'Firm sudah dikonfigurasi', done: status.steps.firmConfigured },
    { label: 'Buat matter pertama', done: status.steps.firstMatter },
  ];
  const completed = steps.filter((step) => step.done).length;

  const finish = () => {
    if (status.dismissed) {
      setHidden(true);
      return;
    }
    dismiss.mutate();
  };

  const startFirstMatter = () => {
    setHidden(true);
    navigate('/matters', { state: { createMatter: true } });
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && setHidden(true)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Selamat datang di Depose</DialogTitle>
          <DialogDescription>
            Beberapa langkah singkat supaya tim kamu bisa langsung bekerja.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <p className="text-xs text-muted-foreground">
            {completed} dari {steps.length} selesai
          </p>
          <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-[width]"
              style={{ width: `${(completed / steps.length) * 100}%` }}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {steps.map((step) => (
            <div
              key={step.label}
              className="flex items-center gap-3 rounded-md border border-border bg-card px-3 py-2.5"
            >
              {step.done ? (
                <Check size={18} className="text-primary" aria-hidden="true" />
              ) : (
                <Circle size={18} className="text-muted-foreground" aria-hidden="true" />
              )}
              <span className={step.done ? 'text-foreground' : 'text-muted-foreground'}>
                {step.label}
              </span>
            </div>
          ))}
        </div>

        <DialogFooter className="justify-between sm:justify-between">
          <Button variant="ghost" onClick={finish} disabled={dismiss.isPending}>
            {status.steps.firstMatter ? 'Selesai' : 'Lewati untuk sekarang'}
          </Button>
          {!status.steps.firstMatter ? (
            <Button onClick={startFirstMatter}>Buat matter pertama</Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
