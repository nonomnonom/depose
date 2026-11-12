import { randomUUID } from 'node:crypto';
import 'dotenv/config';

const { db } = await import('../dist/infrastructure/database/database.client.js');
const schema = await import('../dist/infrastructure/database/schema/index.js');

const firm = (await db.select().from(schema.firms).limit(1))[0];
if (!firm) throw new Error('No firm found');
console.log('FIRM', firm.id, firm.name, firm.organizationId);

const email = 'depose-verify@depose.test';
const user = (await db.select().from(schema.user).where((await import('drizzle-orm')).eq(schema.user.email, email)).limit(1))[0];
if (!user) throw new Error('Verification user missing; sign it up first');
console.log('USER', user.id, user.email);

const existing = (await db.select().from(schema.member).where((await import('drizzle-orm')).eq(schema.member.userId, user.id)).limit(1))[0];
if (!existing) {
  await db.insert(schema.member).values({
    id: randomUUID(),
    organizationId: firm.organizationId,
    userId: user.id,
    role: 'admin',
  });
  console.log('MEMBER CREATED');
} else {
  console.log('MEMBER EXISTS', existing.role);
}

const matterRows = await db.select().from(schema.matters).limit(1);
if (matterRows.length === 0) {
  const [matter] = await db
    .insert(schema.matters)
    .values({ firmId: firm.id, name: 'Verification Matter', createdBy: user.id })
    .returning();
  console.log('MATTER CREATED', matter.id);
} else {
  console.log('MATTER EXISTS', matterRows[0].id, matterRows[0].name);
}
process.exit(0);
