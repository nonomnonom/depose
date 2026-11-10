import {
  boolean,
  index,
  integer,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export type FirmPlan = "solo" | "team" | "enterprise";
export type MatterType =
  | "litigation"
  | "corporate"
  | "arbitration"
  | "regulatory"
  | "advisory"
  | "other";
export type MatterStatus = "active" | "closed" | "archived";
export type DocumentType = "pdf" | "docx" | "email" | "txt" | "transcript";
export type DocumentSource = "upload" | "email_import" | "integration";
export type DocumentProcessingStatus = "queued" | "processing" | "done" | "failed";

// Firm is the Depose-level profile of a Better Auth organization. Membership,
// invitations, and identity stay in Better Auth; this table owns firm settings.
export const firms = pgTable("firms", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: text("organization_id").notNull().unique(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  primaryLanguage: text("primary_language").notNull().default("id"),
  jurisdiction: text("jurisdiction").notNull().default("ID"),
  plan: text("plan").$type<FirmPlan>().notNull().default("solo"),
  ownerId: text("owner_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const matters = pgTable(
  "matters",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    firmId: text("firm_id")
      .notNull()
      .references(() => firms.organizationId, { onDelete: "cascade" }),
    name: text("name").notNull(),
    matterNumber: text("matter_number"),
    type: text("type").$type<MatterType>().notNull().default("other"),
    status: text("status").$type<MatterStatus>().notNull().default("active"),
    openedDate: timestamp("opened_date", { withTimezone: true })
      .notNull()
      .defaultNow(),
    closedDate: timestamp("closed_date", { withTimezone: true }),
    description: text("description"),
    leadLawyerId: text("lead_lawyer_id"),
    createdBy: text("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("matters_firm_id_idx").on(table.firmId)],
);

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    matterId: uuid("matter_id")
      .notNull()
      .references(() => matters.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: text("type").$type<DocumentType>().notNull(),
    source: text("source").$type<DocumentSource>().notNull().default("upload"),
    uploadedBy: text("uploaded_by").notNull(),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    mimeType: text("mime_type").notNull(),
    content: text("content").notNull(),
    pageCount: integer("page_count").notNull().default(1),
    processingStatus: text("processing_status")
      .$type<DocumentProcessingStatus>()
      .notNull()
      .default("queued"),
    language: text("language"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("documents_matter_id_idx").on(table.matterId)],
);

export const documentChunks = pgTable(
  "document_chunks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    matterId: uuid("matter_id")
      .notNull()
      .references(() => matters.id, { onDelete: "cascade" }),
    chunkIndex: integer("chunk_index").notNull(),
    pageNumber: integer("page_number").notNull().default(1),
    sentenceStart: integer("sentence_start").notNull(),
    sentenceEnd: integer("sentence_end").notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("document_chunks_matter_id_idx").on(table.matterId)],
);

export const facts = pgTable(
  "facts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    matterId: uuid("matter_id")
      .notNull()
      .references(() => matters.id, { onDelete: "cascade" }),
    documentId: uuid("document_id").references(() => documents.id, {
      onDelete: "set null",
    }),
    text: text("text").notNull(),
    entity: text("entity"),
    action: text("action"),
    date: timestamp("date", { withTimezone: true }),
    page: integer("page"),
    sentenceIndex: integer("sentence_index"),
    confidence: real("confidence").notNull().default(1),
    flagged: boolean("flagged").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("facts_matter_id_idx").on(table.matterId),
    index("facts_date_idx").on(table.date),
  ],
);

export const onboardingProgress = pgTable(
  "onboarding_progress",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    organizationId: text("organization_id").notNull(),
    dismissedAt: timestamp("dismissed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("onboarding_progress_user_org_idx").on(
      table.userId,
      table.organizationId,
    ),
  ],
);
