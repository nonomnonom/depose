import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { eq } from "drizzle-orm";
import { db } from "../../infrastructure/database/database.client.js";
import { firms } from "../../infrastructure/database/schema.js";
import type { CreateFirmInput, UpdateFirmInput } from "./firms.dto.js";

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "firm"
  );
}

@Injectable()
export class FirmsService {
  async get(organizationId: string) {
    const [firm] = await db
      .select()
      .from(firms)
      .where(eq(firms.organizationId, organizationId))
      .limit(1);
    return firm;
  }

  async create(
    organizationId: string,
    userId: string,
    input: CreateFirmInput,
  ) {
    if (await this.get(organizationId)) {
      throw new ConflictException("Firm is already configured");
    }

    const slug = await this.uniqueSlug(input.slug ?? slugify(input.name));
    const [firm] = await db
      .insert(firms)
      .values({
        organizationId,
        ownerId: userId,
        name: input.name,
        slug,
        primaryLanguage: input.primaryLanguage,
        jurisdiction: input.jurisdiction,
        plan: input.plan,
      })
      .returning();
    return firm;
  }

  async update(organizationId: string, input: UpdateFirmInput) {
    const firm = await this.get(organizationId);
    if (!firm) throw new NotFoundException("Firm is not configured");

    const slug = input.slug
      ? await this.uniqueSlug(input.slug, firm.id)
      : undefined;

    const [updated] = await db
      .update(firms)
      .set({
        ...(input.name !== undefined && { name: input.name }),
        ...(slug !== undefined && { slug }),
        ...(input.primaryLanguage !== undefined && {
          primaryLanguage: input.primaryLanguage,
        }),
        ...(input.jurisdiction !== undefined && {
          jurisdiction: input.jurisdiction,
        }),
        ...(input.plan !== undefined && { plan: input.plan }),
        updatedAt: new Date(),
      })
      .where(eq(firms.organizationId, organizationId))
      .returning();
    return updated;
  }

  private async uniqueSlug(base: string, currentFirmId?: string) {
    let slug = base;
    for (let suffix = 2; suffix < 100; suffix++) {
      const [existing] = await db
        .select({ id: firms.id })
        .from(firms)
        .where(eq(firms.slug, slug))
        .limit(1);
      if (!existing || existing.id === currentFirmId) return slug;
      slug = `${base}-${suffix}`;
    }
    throw new ConflictException("Could not allocate a unique firm slug");
  }
}
