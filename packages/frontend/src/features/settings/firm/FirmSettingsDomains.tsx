import { useQuery } from '@tanstack/react-query';
import { Badge } from '@depose/ui/components/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@depose/ui/components/card';
import { queryKeys } from '~/features/lib/query/keys';
import { unwrapData } from '~/features/lib/api/client';
import { firmsControllerDomains } from '~/generated/endpoints';
import {
  FirmDomainDtoDomainType,
  FirmDomainDtoSslStatus,
  FirmDomainDtoStatus,
} from '~/generated/schemas';

export function FirmDomainsList() {
  const { data } = useQuery({
    queryKey: queryKeys.firmDomains,
    queryFn: async () => unwrapData(await firmsControllerDomains()),
  });

  const list = data?.domains ?? [];

  return (
    <div className="mt-4 space-y-3">
      {list.length === 0 ? (
        <p className="text-sm text-muted-foreground">No domains registered yet.</p>
      ) : (
        list.map((domain) => (
          <Card key={domain.id} className="w-full">
            <CardHeader className="flex flex-row items-start justify-between border-b pb-3 space-y-0">
              <div className="space-y-1">
                <CardTitle className="text-base">{domain.hostname}</CardTitle>
              </div>
              <div className="flex items-center space-x-2">
                <StatusBadge
                  status={domain.status}
                  ssl={domain.sslStatus}
                  type={domain.domainType}
                />
                {domain.isPrimary ? (
                  <Badge variant="secondary">Utama</Badge>
                ) : null}
              </div>
            </CardHeader>
            <CardContent className="pt-3 text-sm text-muted-foreground">
              {domain.status === FirmDomainDtoStatus.active ? (
                <span className="text-foreground">Active domain</span>
              ) : (
                <span className="text-muted-foreground">{domain.status === FirmDomainDtoStatus.failed ? 'Verification failed' : domain.status === FirmDomainDtoStatus.verifying ? 'Verifying...' : domain.status}</span>
              )}
              {domain.lastError ? (
                <details className="mt-2">
                  <summary className="cursor-pointer text-muted-foreground">Lihat error</summary>
                  <pre className="mt-1 rounded-md bg-muted p-2 text-xs">{domain.lastError}</pre>
                </details>
              ) : null}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

const STATUS_LABELS: Record<FirmDomainDtoStatus, string> = {
  pending: 'Pending',
  verifying: 'Verifying...',
  active: 'Active',
  failed: 'Failed',
  disabled: 'Disabled',
};

const SSL_LABELS: Record<FirmDomainDtoSslStatus, string> = {
  pending: 'Pending',
  issued: 'Issued',
  expired: 'Expired',
  failed: 'Failed',
  external: 'External',
};

function StatusBadge({ status, ssl, type }: { status: FirmDomainDtoStatus; ssl: FirmDomainDtoSslStatus; type: FirmDomainDtoDomainType }) {
  return (
    <div className="flex items-center space-x-2">
      <div className="flex items-center">
        {status === FirmDomainDtoStatus.active ? (
          <svg className="size-2.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : status === FirmDomainDtoStatus.failed ? (
          <svg className="size-2.5 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="size-2.5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        )}
        <span className="text-sm text-foreground">{STATUS_LABELS[status]}</span>
      </div>
      {ssl !== FirmDomainDtoSslStatus.pending ? (
        <span className="text-xs text-muted-foreground">SSL: {SSL_LABELS[ssl]}</span>
      ) : null}
      {type === FirmDomainDtoDomainType.custom ? (
        <span className="text-xs text-muted-foreground">Custom domain</span>
      ) : null}
    </div>
  );
}
