import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Button } from '@depose/ui/components/button';
import { Check, Circle, Close } from '@coolicons/react';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
} from '@depose/ui/components/sidebar';
import { queryKeys } from '~/lib/query/keys';
import { unwrapData } from '~/lib/api/client';
import { onboardingControllerDismiss, onboardingControllerStatus } from '~/generated/endpoints';
import { useSession } from '~/lib/auth/session';

/**
 * Non-blocking activation checklist in the app sidebar (spec 09/40). It is not
 * a route, not a nav item, and never blocks work.
 */
export function OnboardingChecklist() {
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
  if (!me?.firm || !status || status.dismissed || hidden) return null;

  const steps = [
    { label: 'Firm configured', done: status.steps.firmConfigured },
    { label: 'Create a matter', done: status.steps.firstMatter },
  ];

  // The checklist disappears once every required step is complete.
  if (steps.every((step) => step.done)) return null;

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel className="flex items-center justify-between gap-2">
        <span>Getting started</span>
        <button
          type="button"
          className="rounded-sm text-sidebar-foreground/50 transition-colors hover:text-sidebar-foreground focus-visible:outline-1 focus-visible:outline-ring"
          onClick={() => dismiss.mutate()}
          disabled={dismiss.isPending}
        >
          <Close size={13} aria-hidden="true" />
          <span className="sr-only">Dismiss checklist</span>
        </button>
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <div className="flex flex-col gap-1.5 px-2 pb-2">
          {steps.map((step) => (
            <div key={step.label} className="flex items-center gap-2 text-xs">
              {step.done ? (
                <Check size={14} className="shrink-0 text-primary" aria-hidden="true" />
              ) : (
                <Circle size={14} className="shrink-0 text-sidebar-foreground/40" aria-hidden="true" />
              )}
              <span
                className={
                  step.done
                    ? 'truncate text-sidebar-foreground/60 line-through'
                    : 'truncate text-sidebar-foreground/80'
                }
              >
                {step.label}
              </span>
            </div>
          ))}
          {!status.steps.firstMatter ? (
            <Button
              size="sm"
              className="mt-1 w-full"
              onClick={() => navigate('/matters', { state: { createMatter: true } })}
            >
              Create matter
            </Button>
          ) : null}
        </div>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
