import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DomainError } from '../../common/domain-error.js';
import type { Database } from '../../infrastructure/database/database.client.js';
import { DATABASE } from '../../infrastructure/database/database.module.js';
import { userPreferences } from '../../infrastructure/database/schema/index.js';
import { AuditService } from '../audit/audit.service.js';
import {
  DEFAULT_USER_PREFERENCES,
  userPreferencesSchema,
  type UserPreferences,
} from './settings.schema.js';

@Injectable()
export class UserPreferencesService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly audit: AuditService,
  ) {}

  async get(userId: string): Promise<UserPreferences> {
    const [pref] = await this.db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId))
      .limit(1);

    if (!pref) {
      // Return defaults without persisting; caller can create via update().
      return DEFAULT_USER_PREFERENCES;
    }

    const parsed = userPreferencesSchema.safeParse({
      locale: pref.locale,
      timezone: pref.timezone,
      theme: pref.theme,
      density: pref.density,
      notifications: pref.notifications,
    });

    if (!parsed.success) {
      throw DomainError.validation(
        'SETTINGS_SCHEMA_INVALID',
        parsed.error.issues.map((issue) => ({
          path: issue.path.join('.') || 'preferences',
          message: issue.message,
        })),
      );
    }

    return parsed.data;
  }

  async update(
    userId: string,
    patch: Record<string, unknown>,
  ): Promise<UserPreferences> {
    const current = await this.get(userId);
    const merged = this.deepMerge(current, patch);
    const parsed = userPreferencesSchema.safeParse(merged);

    if (!parsed.success) {
      throw DomainError.validation(
        'SETTINGS_SCHEMA_INVALID',
        parsed.error.issues.map((issue) => ({
          path: issue.path.join('.') || 'preferences',
          message: issue.message,
        })),
      );
    }

    const validated = parsed.data as UserPreferences;

    const existing = await this.db
      .select({ id: userPreferences.id })
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId))
      .limit(1);

    let result;
    if (existing.length > 0) {
      [result] = await this.db
        .update(userPreferences)
        .set({
          locale: validated.locale,
          timezone: validated.timezone,
          theme: validated.theme,
          density: validated.density,
          notifications: validated.notifications,
          updatedAt: new Date(),
        })
        .where(eq(userPreferences.userId, userId))
        .returning();
    } else {
      [result] = await this.db
        .insert(userPreferences)
        .values({
          userId,
          locale: validated.locale,
          timezone: validated.timezone,
          theme: validated.theme,
          density: validated.density,
          notifications: validated.notifications,
        })
        .returning();
    }

    if (!result) {
      throw DomainError.notFound('User preferences not found');
    }

    await this.audit.log({
      firmId: '00000000-0000-0000-0000-000000000000', // user-level, no firm context
      action: 'user.preferences.updated',
      resourceType: 'user',
      resourceId: userId,
      actor: { userId, role: null },
      metadata: { fields: Object.keys(patch) },
    });

    return validated;
  }

  private deepMerge(
    base: Record<string, unknown>,
    patch: Record<string, unknown>,
  ): Record<string, unknown> {
    const result = { ...base };
    for (const [key, value] of Object.entries(patch)) {
      if (
        value !== null &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        result[key] !== null &&
        typeof result[key] === 'object' &&
        !Array.isArray(result[key])
      ) {
        result[key] = { ...(result[key] as Record<string, unknown>), ...(value as Record<string, unknown>) };
      } else {
        result[key] = value;
      }
    }
    return result;
  }
}
