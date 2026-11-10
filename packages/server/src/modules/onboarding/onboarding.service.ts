import { Injectable } from "@nestjs/common";
import { and, count, eq, sql } from "drizzle-orm";
import {
  getOrganizationId,
  getUserId,
  type AuthenticatedSession,
} from "../../common/session.js";
import { db } from "../../infrastructure/database/database.client.js";
import {
  documents,
  facts,
  firms,
  matters,
  onboardingProgress,
} from "../../infrastructure/database/schema.js";
import { FirmsService } from "../firms/firms.service.js";
import type { SetupFirmInput } from "./onboarding.dto.js";

export interface ChecklistStep {
  id: string;
  title: string;
  description: string;
  optional: boolean;
  completed: boolean;
}

@Injectable()
export class OnboardingService {
  constructor(private readonly firmsService: FirmsService) {}

  async getState(session: AuthenticatedSession) {
    const organizationId = getOrganizationId(session);
    const userId = getUserId(session);

    const [firm, progress] = await Promise.all([
      this.firmsService.get(organizationId),
      this.findProgress(userId, organizationId),
    ]);

    const [matterCount] = await db
      .select({ value: count() })
      .from(matters)
      .where(eq(matters.firmId, organizationId));
    const [documentCount] = await db
      .select({ value: count() })
      .from(documents)
      .innerJoin(matters, eq(documents.matterId, matters.id))
      .where(eq(matters.firmId, organizationId));
    const [factCount] = await db
      .select({ value: count() })
      .from(facts)
      .innerJoin(matters, eq(facts.matterId, matters.id))
      .where(eq(matters.firmId, organizationId));

    const memberCount = await this.memberCount(organizationId);
    const hasMatter = Number(matterCount?.value ?? 0) > 0;
    const hasDocument = Number(documentCount?.value ?? 0) > 0;
    const hasFact = Number(factCount?.value ?? 0) > 0;

    const steps: ChecklistStep[] = [
      {
        id: "create_matter",
        title: "Create a matter",
        description: "Open your first matter.",
        optional: false,
        completed: hasMatter,
      },
      {
        id: "upload_document",
        title: "Upload your first document",
        description: "Drop a PDF, Word file, email, or transcript.",
        optional: false,
        completed: hasDocument,
      },
      {
        id: "see_facts",
        title: "See extracted facts",
        description: "Facts appear with page and sentence citations.",
        optional: false,
        completed: hasFact,
      },
      {
        id: "invite_teammate",
        title: "Invite a teammate",
        description: "Optional: bring a colleague into the firm.",
        optional: true,
        completed: memberCount > 1,
      },
    ];

    const required = steps.filter((step) => !step.optional);
    const requiredCompleted = required.filter((step) => step.completed).length;
    const isComplete = requiredCompleted === required.length;
    const nextStep = steps.find((step) => !step.optional && !step.completed);

    return {
      organizationId,
      firm: firm
        ? {
            configured: true,
            name: firm.name,
            slug: firm.slug,
            primaryLanguage: firm.primaryLanguage,
            jurisdiction: firm.jurisdiction,
            plan: firm.plan,
          }
        : { configured: false },
      requiresFirmSetup: !firm,
      activationEvent: hasFact,
      steps,
      requiredCompleted,
      requiredTotal: required.length,
      isComplete,
      dismissed: progress?.dismissedAt != null || isComplete,
      nextStepId: nextStep?.id ?? null,
    };
  }

  async setupFirm(session: AuthenticatedSession, input: SetupFirmInput) {
    const firm = await this.firmsService.create(
      getOrganizationId(session),
      getUserId(session),
      input,
    );
    return { firm, onboarding: await this.getState(session) };
  }

  async dismiss(session: AuthenticatedSession) {
    const organizationId = getOrganizationId(session);
    const userId = getUserId(session);

    await db
      .insert(onboardingProgress)
      .values({ userId, organizationId, dismissedAt: new Date() })
      .onConflictDoUpdate({
        target: [onboardingProgress.userId, onboardingProgress.organizationId],
        set: { dismissedAt: new Date(), updatedAt: new Date() },
      });

    return this.getState(session);
  }

  private async findProgress(userId: string, organizationId: string) {
    const [progress] = await db
      .select()
      .from(onboardingProgress)
      .where(
        and(
          eq(onboardingProgress.userId, userId),
          eq(onboardingProgress.organizationId, organizationId),
        ),
      )
      .limit(1);
    return progress;
  }

  private async memberCount(organizationId: string): Promise<number> {
    try {
      const result = await db.execute(
        sql`select count(*)::int as count from "member" where "organizationId" = ${organizationId}`,
      );
      const row = result.rows[0] as { count?: number } | undefined;
      return Number(row?.count ?? 0);
    } catch {
      // Better Auth tables are not migrated yet; invitation step stays pending.
      return 0;
    }
  }
}
