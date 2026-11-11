import { Inject, Injectable } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { domainToASCII } from 'node:url';
import type { TenantContext } from '../../common/request-context.service.js';
import { appConfig } from '../../config/app.config.js';
import type { Database } from '../../infrastructure/database/database.client.js';
import { DATABASE } from '../../infrastructure/database/database.module.js';
import { firmDomains, firms } from '../../infrastructure/database/schema/index.js';

@Injectable()
export class TenantService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  normalizeHost(raw: string | undefined): string {
    if (!raw) return '';
    const first = raw.split(',')[0]?.trim() ?? '';
    const withoutPort = first.replace(/:\d+$/, '');
    const withoutDot = withoutPort.replace(/\.$/, '');
    return domainToASCII(withoutDot.toLowerCase());
  }

  get baseDomain(): string {
    return appConfig.tenancy.baseDomain;
  }

  isBootstrapHost(hostname: string): boolean {
    if (!hostname) return false;
    if (hostname === this.baseDomain) return true;
    // Local development with BASE_DOMAIN=localhost.
    return !appConfig.isProduction && (hostname === 'localhost' || hostname === '127.0.0.1');
  }

  async resolve(hostname: string): Promise<TenantContext> {
    const bootstrap = this.isBootstrapHost(hostname);

    if (hostname) {
      const [row] = await this.db
        .select({
          firmId: firms.id,
          firmSlug: firms.slug,
          domainType: firmDomains.domainType,
          isPrimary: firmDomains.isPrimary,
          status: firmDomains.status,
        })
        .from(firmDomains)
        .innerJoin(firms, eq(firms.id, firmDomains.firmId))
        .where(
          and(
            sql`lower(${firmDomains.hostname}) = ${hostname}`,
            eq(firmDomains.status, 'active'),
          ),
        )
        .limit(1);

      if (row) {
        return {
          hostname,
          firmId: row.firmId,
          firmSlug: row.firmSlug,
          domainType: row.domainType,
          isPrimary: row.isPrimary,
          isBootstrapHost: bootstrap,
        };
      }
    }

    return {
      hostname,
      firmId: null,
      firmSlug: null,
      domainType: null,
      isPrimary: false,
      isBootstrapHost: bootstrap,
      unresolved: !bootstrap,
    };
  }
}
