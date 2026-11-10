import { createFirmSchema } from "../firms/firms.dto.js";

export const setupFirmSchema = createFirmSchema;

export type SetupFirmInput = typeof setupFirmSchema._output;
