import { Global, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Pool } from "pg";

export const PG_POOL = Symbol("PG_POOL");

/** Provides a global `pg` connection pool (PG_POOL) for injection into any module. */
@Global()
@Module({
  providers: [
    {
      provide: PG_POOL,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new Pool({ connectionString: config.get<string>("DATABASE_URL") }),
    },
  ],
  exports: [PG_POOL],
})
export class DatabaseModule {}
