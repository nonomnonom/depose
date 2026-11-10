import { Module } from "@nestjs/common";
import { MattersModule } from "../matters/matters.module.js";
import { IntelligenceController } from "./intelligence.controller.js";
import { IntelligenceService } from "./intelligence.service.js";

@Module({
  imports: [MattersModule],
  controllers: [IntelligenceController],
  providers: [IntelligenceService],
})
export class IntelligenceModule {}
