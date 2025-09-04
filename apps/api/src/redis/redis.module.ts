import { Global, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Redis } from "@upstash/redis";
import { RedisService } from "./redis.service";

export const REDIS_CLIENT = Symbol("REDIS_CLIENT");

/** Provides a global Upstash Redis client plus RedisService (search cache, rate limits, presence). */
@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new Redis({
          url: config.get<string>("UPSTASH_REDIS_REST_URL")!,
          token: config.get<string>("UPSTASH_REDIS_REST_TOKEN")!,
        }),
    },
    RedisService,
  ],
  exports: [REDIS_CLIENT, RedisService],
})
export class RedisModule {}
