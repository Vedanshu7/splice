import { Module } from "@nestjs/common";
import { StripeService } from "./stripe.service";
import { StripeController } from "./stripe.controller";

/** Wires Stripe Checkout session creation and webhook handling. */
@Module({
  controllers: [StripeController],
  providers: [StripeService],
})
export class StripeModule {}
