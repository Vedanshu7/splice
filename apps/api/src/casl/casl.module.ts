import { Module } from "@nestjs/common";
import { ProfilesModule } from "../profiles/profiles.module";
import { CaslAbilityFactory } from "./ability.factory";
import { PoliciesGuard } from "./policies.guard";

/** Provides CaslAbilityFactory and PoliciesGuard for injection into feature modules. */
@Module({
  imports: [ProfilesModule],
  providers: [CaslAbilityFactory, PoliciesGuard],
  exports: [CaslAbilityFactory, PoliciesGuard],
})
export class CaslModule {}
