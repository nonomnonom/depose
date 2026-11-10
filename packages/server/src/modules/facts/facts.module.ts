import { Module } from "@nestjs/common";
import { MattersModule } from "../matters/matters.module.js";
import { FactsController } from "./facts.controller.js";
import { FactsService } from "./facts.service.js";

@Module({
  imports: [MattersModule],
  controllers: [FactsController],
  providers: [FactsService],
  exports: [FactsService],
})
export class FactsModule {}
