import * as React from 'react';
import { isRouteErrorResponse, useNavigate, useRouteError } from 'react-router-dom';
import { CircleWarning, Dashboard, Reload, ShieldWarning } from '@coolicons/react';
import { Alert, AlertDescription, AlertTitle } from '@depose/ui/components/alert';
import { Button } from '@depose/ui/components/button';
import { Card } from '@depose/ui/components/card';
import { ApiError } from '~/lib/api/errors';

interface ErrorStateProps {
  title?: string;
  message?: string;
  requestId?: string;
  onRetry?: () => void;
  secondaryHref?: string;
  secondaryLabel?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  message = 'The request could not be completed.',
  requestId,
  onRetry,
  secondaryHref = '/matters',
  secondaryLabel = 'Back to matters',
}: ErrorStateProps) {
  return (
    <div className="flex flex-1 items-center justify-center py-10">
      <Card className="w-full max-w-md p-5">
        <div className="flex flex-col gap-3">
          <Alert variant="destructive">
            <CircleWarning size={16} />
            <AlertTitle>{title}</AlertTitle>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
          {requestId ? (
            <p className="text-xs text-muted-foreground">
              Request ID: <span className="font-mono">{requestId}</span>
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            {onRetry ? (
              <Button onClick={onRetry}>
                <Reload size={16} />
                Try again
              </Button>
            ) : null}
            <Button variant="outline" render={<a href={secondaryHref} />}>
              {secondaryLabel}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

export function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-1 items-center justify-center py-10">
      <Card className="w-full max-w-md p-5">
        <div className="flex flex-col gap-3">
          <Alert>
            <CircleWarning size={16} />
            <AlertTitle>Page not found</AlertTitle>
            <AlertDescription>
              This address does not exist or the page has moved.
            </AlertDescription>
          </Alert>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => navigate('/matters')}>
              <Dashboard size={16} />
              Go to matters
            </Button>
            <Button variant="outline" onClick={() => navigate(-1)}>
              Back
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

export function ForbiddenPage() {
  return (
    <div className="flex flex-1 items-center justify-center py-10">
      <Card className="w-full max-w-md p-5">
        <div className="flex flex-col gap-3">
          <Alert variant="destructive">
            <ShieldWarning size={16} />
            <AlertTitle>Access denied</AlertTitle>
            <AlertDescription>
              Your role does not have permission for this page.
            </AlertDescription>
          </Alert>
          <Button variant="outline" render={<a href="/matters" />}>
            Back to matters
          </Button>
        </div>
      </Card>
    </div>
  );
}

export function TenantNotFoundPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md p-5">
        <div className="flex flex-col gap-3">
          <Alert variant="destructive">
            <CircleWarning size={16} />
            <AlertTitle>Instance not found</AlertTitle>
            <AlertDescription>
              This hostname is not mapped to a firm on this instance. Contact your instance admin.
            </AlertDescription>
          </Alert>
        </div>
      </Card>
    </div>
  );
}

export function MaintenancePage() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md p-5">
        <div className="flex flex-col gap-3">
          <Alert>
            <CircleWarning size={16} />
            <AlertTitle>Under maintenance</AlertTitle>
            <AlertDescription>
              Depose is temporarily unavailable while the instance is being upgraded. Try again
              shortly.
            </AlertDescription>
          </Alert>
        </div>
      </Card>
    </div>
  );
}

export function RouteErrorPage() {
  const error = useRouteError();
  const navigate = useNavigate();

  if (isRouteErrorResponse(error)) {
    if (error.status === 404) return <NotFoundPage />;
    if (error.status === 403) return <ForbiddenPage />;
    return (
      <ErrorState
        title={`Error ${error.status}`}
        message={error.statusText || 'Request failed.'}
        onRetry={() => navigate(0)}
      />
    );
  }

  if (error instanceof ApiError) {
    if (error.isNotFound) return <NotFoundPage />;
    if (error.isForbidden) return <ForbiddenPage />;
    return (
      <ErrorState
        title="Request failed"
        message={error.message}
        requestId={error.requestId}
        onRetry={() => navigate(0)}
      />
    );
  }

  const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
  return (
    <ErrorState
      title="Something went wrong"
      message={message}
      onRetry={() => navigate(0)}
    />
  );
}


export class RootErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: unknown) {
    // eslint-disable-next-line no-console
    console.error(error);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-dvh items-center justify-center bg-background px-4">
          <Card className="w-full max-w-md p-5">
            <p className="text-sm font-medium">The app hit an error</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Reload the page. If it keeps happening, contact your instance admin.
            </p>
            <Button className="mt-3" onClick={() => window.location.reload()}>
              Reload
            </Button>
          </Card>
        </div>
      );
    }
    return this.props.children;
  }
}
