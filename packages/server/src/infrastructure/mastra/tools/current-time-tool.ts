import { createTool } from "@mastra/core/tools";
import { z } from "zod";

export const currentTimeTool = createTool({
  id: "current-time",
  description: "Get the current date and time on the server, optionally in an IANA time zone.",
  inputSchema: z.object({
    timeZone: z
      .string()
      .optional()
      .describe("IANA time zone, for example Asia/Jakarta. Defaults to the server time zone."),
  }),
  outputSchema: z.object({
    iso: z.string(),
    formatted: z.string(),
    timeZone: z.string(),
  }),
  execute: async ({ timeZone }) => {
    const zone = timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
    const now = new Date();
    return {
      iso: now.toISOString(),
      formatted: new Intl.DateTimeFormat("en-US", {
        dateStyle: "full",
        timeStyle: "long",
        timeZone: zone,
      }).format(now),
      timeZone: zone,
    };
  },
});
