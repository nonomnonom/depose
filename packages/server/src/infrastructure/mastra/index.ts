import { Mastra } from "@mastra/core";
import { appConfig } from "../../config/app.config.js";
import { caseAnalystAgent } from "./agents/case-analyst.js";
import { deposeAgent } from "./agents/depose-agent.js";
import { factExtractorAgent } from "./agents/fact-extractor.js";
import { createMastraStorage } from "./vector-store.js";

export const mastra = new Mastra({
  agents: { deposeAgent, factExtractorAgent, caseAnalystAgent },
  ...(appConfig.memory.enabled
    ? { storage: createMastraStorage() }
    : {}),
});
