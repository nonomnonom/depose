import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';
import type { FirmRole } from '../infrastructure/database/schema/enums.js';
import { DomainError } from './domain-error.js';

export interface TenantContext {
  hostname: string;
  firmId: string | null;
  firmSlug: string | null;
  domainType: 'subdomain' | 'custom' | null;
  isPrimary: boolean;
  isBootstrapHost: boolean;
  unresolved?: boolean;
}

export interface ActorContext {
  userId: string;
  email: string;
  name: string;
  sessionId: string;
  firmId: string | null;
  role: FirmRole | null;
  memberId: string | null;
}

export interface FirmActor extends ActorContext {
  firmId: string;
  role: FirmRole;
  memberId: string;
}

export interface RequestStore {
  requestId: string;
  tenant?: TenantContext;
  actor?: ActorContext;
}

@Injectable()
export class RequestContextService {
  private readonly storage = new AsyncLocalStorage<RequestStore>();

  run<T>(store: RequestStore, callback: () => T): T {
    return this.storage.run(store, callback);
  }

  get(): RequestStore | undefined {
    return this.storage.getStore();
  }

  setTenant(tenant: TenantContext): void {
    const store = this.storage.getStore();
    if (store) store.tenant = tenant;
  }

  setActor(actor: ActorContext): void {
    const store = this.storage.getStore();
    if (store) store.actor = actor;
  }

  getTenant(): TenantContext | undefined {
    return this.storage.getStore()?.tenant;
  }

  getActor(): ActorContext | undefined {
    return this.storage.getStore()?.actor;
  }

  requireActor(): ActorContext {
    const actor = this.getActor();
    if (!actor) {
      throw new DomainError('UNAUTHORIZED', 401, 'Authentication required');
    }
    return actor;
  }

  requireFirmActor(): FirmActor {
    const actor = this.requireActor();
    if (!actor.firmId || !actor.role || !actor.memberId) {
      throw new DomainError('FORBIDDEN', 403, 'Firm setup is required');
    }
    return actor as FirmActor;
  }
}
