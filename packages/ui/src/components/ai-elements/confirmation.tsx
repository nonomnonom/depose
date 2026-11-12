'use client';

import * as React from 'react';
import { cn } from 'cn';
import { CircleCheckIcon, CircleXIcon, ShieldQuestionIcon } from 'lucide-react';

import { Button } from '../ui/button';
import { Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle } from '../ui/item';

export type ConfirmationState = 'request' | 'accepted' | 'rejected' | 'denied';

type ConfirmationValue = {
  state: ConfirmationState;
  approval?: { approved?: boolean };
};

const ConfirmationContext = React.createContext<ConfirmationValue>({ state: 'request' });

export function useConfirmation() {
  return React.useContext(ConfirmationContext);
}

/** A prompt to approve or deny a tool before it runs. */
function Confirmation({
  className,
  state = 'request',
  approval,
  children,
  ...props
}: Omit<React.ComponentProps<typeof Item>, 'variant' | 'size' | 'children'> & {
  state?: ConfirmationState;
  approval?: { approved?: boolean };
  children?: React.ReactNode;
}) {
  return (
    <ConfirmationContext.Provider value={{ state, approval }}>
      <Item variant="outline" size="sm" className={className} {...props}>
        {children}
      </Item>
    </ConfirmationContext.Provider>
  );
}

function ConfirmationTitle({
  className,
  description,
  children,
  ...props
}: Omit<React.ComponentProps<typeof ItemContent>, 'children'> & {
  description?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const { state } = useConfirmation();
  const icon =
    state === 'accepted' ? (
      <CircleCheckIcon className="text-primary" />
    ) : state === 'rejected' || state === 'denied' ? (
      <CircleXIcon className="text-destructive" />
    ) : (
      <ShieldQuestionIcon />
    );
  return (
    <>
      <ItemMedia variant="icon">{icon}</ItemMedia>
      <ItemContent className={className} {...props}>
        <ItemTitle>{children}</ItemTitle>
        {description ? <ItemDescription>{description}</ItemDescription> : null}
      </ItemContent>
    </>
  );
}

function ConfirmationActions({ className, ...props }: React.ComponentProps<typeof ItemActions>) {
  return <ItemActions className={cn('ml-auto', className)} {...props} />;
}

function ConfirmationAction({
  className,
  ...props
}: React.ComponentProps<typeof Button>) {
  return (
    <Button
      data-slot="confirmation-action"
      size="sm"
      className={className}
      {...props}
    />
  );
}

function ConditionalState({
  when,
  fallback,
  children,
}: {
  when: ConfirmationState[];
  fallback?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const { state } = useConfirmation();
  if (!when.includes(state)) return null;
  return <>{children ?? fallback}</>;
}

type StatePartProps = { children?: React.ReactNode; fallback?: React.ReactNode };

function ConfirmationRequest({ children, fallback }: StatePartProps) {
  return (
    <ConditionalState when={['request']} fallback={fallback ?? 'Approve this action?'}>
      {children}
    </ConditionalState>
  );
}

function ConfirmationAccepted({ children, fallback }: StatePartProps) {
  return (
    <ConditionalState when={['accepted']} fallback={fallback ?? 'Approved'}>
      {children}
    </ConditionalState>
  );
}

function ConfirmationRejected({ children, fallback }: StatePartProps) {
  return (
    <ConditionalState when={['rejected', 'denied']} fallback={fallback ?? 'Denied'}>
      {children}
    </ConditionalState>
  );
}

export {
  Confirmation,
  ConfirmationTitle,
  ConfirmationActions,
  ConfirmationAction,
  ConfirmationRequest,
  ConfirmationAccepted,
  ConfirmationRejected,
};
