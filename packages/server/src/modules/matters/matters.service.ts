import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../../infrastructure/database/database.client.js";
import { matters } from "../../infrastructure/database/schema.js";
import { FirmsService } from "../firms/firms.service.js";
import type { CreateMatterInput, UpdateMatterInput } from "./matters.dto.js";

@Injectable()
export class MattersService {
  constructor(private readonly firmsService: FirmsService) {}

  list(firmId: string) {
    return db
      .select()
      .from(matters)
      .where(eq(matters.firmId, firmId))
      .orderBy(desc(matters.updatedAt));
  }

  async create(firmId: string, userId: string, input: CreateMatterInput) {
    if (!(await this.firmsService.get(firmId))) {
      throw new BadRequestException(
        "Complete firm setup before creating a matter.",
      );
    }

    const [matter] = await db
      .insert(matters)
      .values({
        firmId,
        createdBy: userId,
        name: input.name,
        matterNumber: input.matterNumber,
        type: input.type,
        openedDate: input.openedDate,
        description: input.description,
        leadLawyerId: input.leadLawyerId,
      })
      .returning();
    return matter;
  }

  async findOne(firmId: string, matterId: string) {
    const [matter] = await db
      .select()
      .from(matters)
      .where(and(eq(matters.id, matterId), eq(matters.firmId, firmId)))
      .limit(1);
    if (!matter) throw new NotFoundException("Matter not found");
    return matter;
  }

  async update(
    firmId: string,
    matterId: string,
    input: UpdateMatterInput,
  ) {
    await this.findOne(firmId, matterId);
    const [matter] = await db
      .update(matters)
      .set({ ...input, updatedAt: new Date() })
      .where(and(eq(matters.id, matterId), eq(matters.firmId, firmId)))
      .returning();
    return matter;
  }
}
