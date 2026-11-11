import { Injectable } from '@nestjs/common';
import type { FirmActor } from '../../../common/request-context.service.js';
import { ModelGatewayService } from '../platform/model-gateway.service.js';
import type { DecisionQuestion } from '../platform/model-gateway.service.js';

/**
 * DecisionService — typed decision queries against the configured decision
 * endpoint (System One / operator decision route).
 *
 * This is a thin wrapper around ModelGatewayService.decide(). It exists as
 * its own service so the extraction pipeline and other modules can depend on
 * "decision" as a named capability without reaching into the model gateway.
 *
 * Ownership: system-one/ owns the decision capability API. The actual HTTP
 * call to the decision endpoint lives in ModelGatewayService (platform/),
 * because it's a model-provisioning concern.
 */
@Injectable()
export class DecisionService {
  constructor(private readonly gateway: ModelGatewayService) {}

  async decide(
    actor: FirmActor,
    state: { text: string; context?: Record<string, unknown> },
    questions: Record<string, DecisionQuestion>,
  ) {
    return this.gateway.decide({
      firmId: actor.firmId,
      state,
      questions,
    });
  }
}
