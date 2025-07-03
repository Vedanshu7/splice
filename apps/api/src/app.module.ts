import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { validateEnv } from "./config/env.schema";
import { DatabaseModule } from "./database/database.module";
import { RedisModule } from "./redis/redis.module";
import { AuthModule } from "./auth/auth.module";
import { ProfilesModule } from "./profiles/profiles.module";
import { CaslModule } from "./casl/casl.module";
import { LlmModule } from "./llm/llm.module";
import { SnippetsModule } from "./snippets/snippets.module";
import { SearchModule } from "./search/search.module";
import { WorkspacesModule } from "./workspaces/workspaces.module";
import { StripeModule } from "./stripe/stripe.module";

/** Root module: wires config validation and every feature module together. */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    DatabaseModule,
    RedisModule,
    AuthModule,
    ProfilesModule,
    CaslModule,
    LlmModule,
    SnippetsModule,
    SearchModule,
    WorkspacesModule,
    StripeModule,
  ],
})
export class AppModule {}
