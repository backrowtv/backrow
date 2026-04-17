import { checkBotId } from "botid/server";

export type HumanCheckResult = { ok: true } | { ok: false; error: string };

export async function requireHuman(): Promise<HumanCheckResult> {
  try {
    const verification = await checkBotId();
    if (verification.isBot) {
      return { ok: false, error: "Automated traffic blocked." };
    }
    return { ok: true };
  } catch (err) {
    console.error("[botid] checkBotId threw; failing open", err);
    return { ok: true };
  }
}
