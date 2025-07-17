import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { CaslAbilityFactory } from "./ability.factory";
import { CHECK_POLICIES_KEY, PolicyHandler } from "./check-policies.decorator";
import type { AuthenticatedUser } from "../auth/supabase-auth.guard";

/**
 * Runs each `@CheckPolicies()` handler on the route against a freshly built
 * ability for the current user. Must run after `SupabaseAuthGuard` (relies
 * on `request.user` being set).
 */
@Injectable()
export class PoliciesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly caslFactory: CaslAbilityFactory,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const handlers =
      this.reflector.get<PolicyHandler[]>(CHECK_POLICIES_KEY, context.getHandler()) ?? [];
    if (handlers.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const user: AuthenticatedUser = request.user;
    const ability = await this.caslFactory.createForUser(user.id);

    const allowed = handlers.every((handler) => handler.handle(ability, request));
    if (!allowed) throw new ForbiddenException("Not allowed to perform this action");
    return true;
  }
}
