import { Agent } from "@mastra/core/agent";
import { MASTRA_MODEL } from "../model.js";
import { currentTimeTool } from "../tools/current-time-tool.js";

export const deposeAgent = new Agent({
  id: "depose-agent",
  name: "Depose Assistant",
  instructions: `
You are the Depose assistant, a helpful back-office assistant for a legal case management platform.
Be concise and factual. If you are unsure about a matter, document, or deadline, say so instead of guessing.
Use the currentTimeTool when the user asks about the current date or time.
`,
  model: MASTRA_MODEL,
  tools: { currentTimeTool },
});
