import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { verify } from "jsonwebtoken";

/** The decoded identity attached to `request.user` once a request passes `SupabaseAuthGuard`. */
export interface AuthenticatedUser {
  id: string;
  email: string | null;
}

/**
 * Verifies a Supabase session JWT (HS256, signed with the project's JWT
 * secret) and attaches the decoded user to the request. We verify it here
 * instead of re-implementing auth — Supabase remains the single source of
 * truth for who a user is.
 */
@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const header: string | undefined = request.headers["authorization"];

    if (!header?.startsWith("Bearer ")) {
      throw new UnauthorizedException("Missing bearer token");
    }

    const token = header.slice("Bearer ".length);
    const secret = this.config.get<string>("SUPABASE_JWT_SECRET");

    if (!secret) {
      throw new UnauthorizedException("Auth is not configured");
    }

    try {
      const payload = verify(token, secret) as { sub: string; email?: string };
      const user: AuthenticatedUser = { id: payload.sub, email: payload.email ?? null };
      request.user = user;
      return true;
    } catch {
      throw new UnauthorizedException("Invalid or expired token");
    }
  }
}
