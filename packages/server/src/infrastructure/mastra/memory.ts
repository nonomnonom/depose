import { Memory } from "@mastra/memory";
import { appConfig } from "../../config/app.config.js";

export const memory = appConfig.memory.enabled
  ? new Memory({
      options: { lastMessages: appConfig.memory.lastMessages },
    })
  : undefined;
