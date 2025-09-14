import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Stripe from "stripe";
import { Pool } from "pg";
import { PG_POOL } from "../database/database.module";

/** Stripe Checkout session creation and webhook event handling for the Pro subscription. */
@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private readonly stripe: Stripe;

  constructor(
    private readonly config: ConfigService,
    @Inject(PG_POOL) private readonly pool: Pool,
  ) {
    this.stripe = new Stripe(this.config.get<string>("STRIPE_SECRET_KEY")!, {
      apiVersion: "2024-06-20",
    });
  }

  /** Creates a subscription Checkout session for the Pro price, tagged with the user's id. */
  async createCheckoutSession(userId: string, userEmail: string | null) {
    const priceId = this.config.get<string>("STRIPE_PRO_PRICE_ID")!;
    const session = await this.stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: userEmail ?? undefined,
      client_reference_id: userId,
      success_url: `${this.config.get<string>("NEXT_PUBLIC_APP_URL", "http://localhost:3000")}/billing/success`,
      cancel_url: `${this.config.get<string>("NEXT_PUBLIC_APP_URL", "http://localhost:3000")}/billing`,
      metadata: { userId },
    });

    return { url: session.url };
  }

  /** Verifies a webhook payload actually came from Stripe before we act on it. */
  verifyWebhookSignature(rawBody: Buffer, signature: string): Stripe.Event {
    const secret = this.config.get<string>("STRIPE_WEBHOOK_SECRET")!;
    return this.stripe.webhooks.constructEvent(rawBody, signature, secret);
  }

  /** Flips `profiles.is_pro` on checkout completion / subscription cancellation. */
  async handleEvent(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId ?? session.client_reference_id;
        if (userId) {
          await this.pool.query(`update public.profiles set is_pro = true where id = $1`, [userId]);
          this.logger.log(`Marked user ${userId} as Pro after checkout completion`);
        }
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;
        if (userId) {
          await this.pool.query(`update public.profiles set is_pro = false where id = $1`, [userId]);
          this.logger.log(`Revoked Pro for user ${userId} after subscription cancellation`);
        }
        break;
      }
      default:
        this.logger.debug(`Unhandled Stripe event type: ${event.type}`);
    }
  }
}
