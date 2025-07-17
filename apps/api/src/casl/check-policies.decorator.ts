import { SetMetadata } from "@nestjs/common";
import type { AppAbility } from "./ability.factory";

/** A single policy check: given the built ability and the raw request, return whether it's allowed. */
export interface PolicyHandler {
  handle(ability: AppAbility, request: unknown): boolean;
}

export const CHECK_POLICIES_KEY = "check_policies";

/** Attaches one or more policy handlers to a route, enforced by `PoliciesGuard`. */
export const CheckPolicies = (...handlers: PolicyHandler[]) =>
  SetMetadata(CHECK_POLICIES_KEY, handlers);
