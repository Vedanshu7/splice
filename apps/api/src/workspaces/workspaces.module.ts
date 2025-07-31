import { Module } from "@nestjs/common";
import { CaslModule } from "../casl/casl.module";
import { WorkspacesService } from "./workspaces.service";
import { WorkspacesController } from "./workspaces.controller";

/** Wires the workspaces feature: controller, service, and CASL for the Pro-gating check. */
@Module({
  imports: [CaslModule],
  controllers: [WorkspacesController],
  providers: [WorkspacesService],
})
export class WorkspacesModule {}
