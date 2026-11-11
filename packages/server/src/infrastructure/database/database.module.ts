import { Global, Inject, Module, type OnApplicationShutdown } from '@nestjs/common';
import { db, pool, type Database } from './database.client.js';

export const DATABASE = Symbol('DATABASE');

@Global()
@Module({
  providers: [{ provide: DATABASE, useValue: db }],
  exports: [DATABASE],
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(@Inject(DATABASE) private readonly database: Database) {
    void this.database;
  }

  async onApplicationShutdown(): Promise<void> {
    await pool.end();
  }
}
