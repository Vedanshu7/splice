import { BadRequestException, Controller, Headers, Post, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { SupabaseAuthGuard } from "../auth/supabase-auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import type { AuthenticatedUser } from "../auth/supabase-auth.guard";
import { StripeService } from "./stripe.service";

interface RequestWithRawBody extends Request {
  rawBody: Buffer;
}

/** Stripe Checkout session creation (authenticated) and webhook intake (signature-verified). */
@Controller("stripe")
export class StripeController {
  constructor(private readonly stripe: StripeService) {}

  /** Starts a Checkout session for the Pro subscription. */
  @UseGuards(SupabaseAuthGuard)
  @Post("checkout")
  createCheckout(@CurrentUser() user: AuthenticatedUser) {
    return this.stripe.createCheckoutSession(user.id, user.email);
  }

  // Stripe posts here directly; verified by signature, not by our auth guard.
  @Post("webhook")
  async webhook(@Req() req: RequestWithRawBody, @Headers("stripe-signature") signature: string) {
    if (!signature) throw new BadRequestException("Missing stripe-signature header");

    const event = this.stripe.verifyWebhookSignature(req.rawBody, signature);
    await this.stripe.handleEvent(event);
    return { received: true };
  }
}
