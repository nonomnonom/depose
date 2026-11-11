import * as React from 'react';
import { isRouteErrorResponse, useNavigate, useRouteError } from 'react-router-dom';
import { AlertCircleIcon, HomeIcon, RefreshCwIcon, ShieldAlertIcon } from 'lucide-react';
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
  title = 'Terjadi kesalahan',
  message = 'Permintaan tidak dapat diproses.',
  requestId,
  onRetry,
  secondaryHref = '/matters',
  secondaryLabel = 'Kembali ke Matter',
}: ErrorStateProps) {
  return (
    <div className="flex flex-1 items-center justify-center py-10">
      <Card className="w-full max-w-md p-5">
        <div className="flex flex-col gap-3">
          <Alert variant="destructive">
            <AlertCircleIcon className="size-4" />
            <AlertTitle>{title}</AlertTitle>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
          {requestId ? (
            <p className="text-xs text-muted-foreground">
              ID permintaan: <span className="font-mono">{requestId}</span>
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            {onRetry ? (
              <Button onClick={onRetry}>
                <RefreshCwIcon className="size-4" />
                Coba lagi
              </Button>
            ) : null}
            <Button variant="outline" asChild>
              <a href={secondaryHref}>{secondaryLabel}</a>
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
            <AlertCircleIcon className="size-4" />
            <AlertTitle>Halaman tidak ditemukan</AlertTitle>
            <AlertDescription>
              Alamat yang Anda buka tidak tersedia atau sudah dipindahkan.
            </AlertDescription>
          </Alert>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => navigate('/matters')}>
              <HomeIcon className="size-4" />
              Ke Matter
            </Button>
            <Button variant="outline" onClick={() => navigate(-1)}>
              Kembali
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
            <ShieldAlertIcon className="size-4" />
            <AlertTitle>Akses ditolak</AlertTitle>
            <AlertDescription>
              Peran Anda tidak memiliki izin untuk halaman ini.
            </AlertDescription>
          </Alert>
          <Button variant="outline" asChild>
            <a href="/matters">Kembali ke Matter</a>
          </Button>
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
        message={error.statusText || 'Permintaan gagal.'}
        onRetry={() => navigate(0)}
      />
    );
  }

  if (error instanceof ApiError) {
    if (error.isNotFound) return <NotFoundPage />;
    if (error.isForbidden) return <ForbiddenPage />;
    return (
      <ErrorState
        title="Permintaan gagal"
        message={error.message}
        requestId={error.requestId}
        onRetry={() => navigate(0)}
      />
    );
  }

  const message = error instanceof Error ? error.message : 'Terjadi kesalahan tak terduga.';
  return (
    <ErrorState
      title="Terjadi kesalahan tak terduga"
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
            <p className="text-sm font-medium">Aplikasi mengalami kesalahan</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Muat ulang halaman. Jika terus terjadi, hubungi admin instance.
            </p>
            <Button className="mt-3" onClick={() => window.location.reload()}>
              Muat ulang
            </Button>
          </Card>
        </div>
      );
    }
    return this.props.children;
  }
}
