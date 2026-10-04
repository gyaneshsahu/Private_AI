import { runSynthetic } from "./local-client";

// Loaded only by the isolated local runner, never by the production page.
Object.assign(window, { privateAiSyntheticRun: runSynthetic });
