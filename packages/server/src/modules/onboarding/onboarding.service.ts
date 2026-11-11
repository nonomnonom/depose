import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull, sql } from 'drizzle-orm';
import type { FirmActor } from '../../common/request-context.service.js';
import type { Database } from '../../infrastructure/database/database.client.js';
import { DATABASE } from '../../infrastructure/database/database.module.js';
import {
  matters,
  onboardingProgress,
} from '../../infrastructure/database/schema/index.js';

@Injectable()
export class OnboardingService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async status(actor: FirmActor) {
    const [{ matterCount }] = await this.db
      .select({ matterCount: sql<number>`count(*)::int` })
      .from(matters)
      .where(and(eq(matters.firmId, actor.firmId), isNull(matters.deletedAt)));

    const [progress] = await this.db
      .select()
      .from(onboardingProgress)
      .where(
        and(
          eq(onboardingProgress.firmId, actor.firmId),
          eq(onboardingProgress.userId, actor.userId),
        ),
      )
      .limit(1);

    return {
      dismissed: Boolean(progress?.dismissedAt),
      steps: {
        firmConfigured: true,
        firstMatter: matterCount > 0,
      },
    };
  }

  async dismiss(actor: FirmActor) {
    const existing = await this.db
      .select({ id: onboardingProgress.id })
      .from(onboardingProgress)
      .where(
        and(
          eq(onboardingProgress.firmId, actor.firmId),
          eq(onboardingProgress.userId, actor.userId),
        ),
      )
      .limit(1);

    if (existing[0]) {
      await this.db
        .update(onboardingProgress)
        .set({ dismissedAt: new Date(), updatedAt: new Date() })
        .where(eq(onboardingProgress.id, existing[0].id));
    } else {
      await this.db.insert(onboardingProgress).values({
        firmId: actor.firmId,
        userId: actor.userId,
        dismissedAt: new Date(),
      });
    }

    return { dismissed: true };
  }
}
