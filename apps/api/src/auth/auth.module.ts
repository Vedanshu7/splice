import { Module } from "@nestjs/common";
import { SupabaseAuthGuard } from "./supabase-auth.guard";

/** Wires the Supabase JWT auth guard for injection into other modules. */
@Module({
  providers: [SupabaseAuthGuard],
  exports: [SupabaseAuthGuard],
})
export class AuthModule {}
