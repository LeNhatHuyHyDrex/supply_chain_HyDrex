// ─── Gemini API Key Rotation Engine ───────────────────────────────────────────
// Supports multi-key failover to eliminate 429 Quota Exhausted errors.
// Keys are loaded from GEMINI_KEY_1, GEMINI_KEY_2, GEMINI_KEY_3 env vars,
// with fallback to legacy GEMINI_API_KEY for backwards compatibility.

const GEMINI_MODEL = 'gemini-2.0-flash';

/**
 * Get all configured Gemini API keys, filtering out empty values.
 */
export function getGeminiKeys(): string[] {
  const keys = [
    process.env.GEMINI_KEY_1,
    process.env.GEMINI_KEY_2,
    process.env.GEMINI_KEY_3,
    // Legacy fallback
    process.env.GEMINI_API_KEY,
  ].filter((k): k is string => Boolean(k && k.trim().length > 0));

  // Deduplicate
  return [...new Set(keys)];
}

/**
 * Build the Gemini API URL for a given key.
 */
export function buildGeminiUrl(apiKey: string): string {
  return `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
}

/**
 * Determine if an error response is a quota/rate-limit error (429).
 */
function isQuotaError(status: number, body: string): boolean {
  if (status === 429) return true;
  const lower = body.toLowerCase();
  return lower.includes('quota exceeded') ||
         lower.includes('resource_exhausted') ||
         lower.includes('rate limit');
}

/**
 * Execute a Gemini API call with automatic key rotation on 429 errors.
 * Iterates through all available keys before giving up.
 *
 * @param payload - The JSON body to send to Gemini generateContent API
 * @param timeoutMs - AbortSignal timeout in milliseconds (default 10s)
 * @returns The parsed JSON response from Gemini, or null if all keys exhausted
 */
export async function callGeminiWithRotation(
  payload: object,
  timeoutMs: number = 10000,
): Promise<{ data: any; usedKey: number } | null> {
  const keys = getGeminiKeys();

  if (keys.length === 0) {
    console.error('[Gemini Rotation] No API keys configured.');
    return null;
  }

  for (let i = 0; i < keys.length; i++) {
    const url = buildGeminiUrl(keys[i]);
    const keyLabel = `Key #${i + 1} (…${keys[i].slice(-6)})`;

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (res.ok) {
        const data = await res.json();
        if (i > 0) {
          console.log(`[Gemini Rotation] ✅ Succeeded with ${keyLabel} after ${i} failover(s).`);
        }
        return { data, usedKey: i };
      }

      // Check if it's a quota error → try next key
      const bodyText = await res.text();
      if (isQuotaError(res.status, bodyText)) {
        console.warn(`[Gemini Rotation] ⚠️ ${keyLabel} hit 429 quota limit. Rotating to next key...`);
        continue; // Try next key
      }

      // Non-quota error → log and give up
      console.error(`[Gemini Rotation] ❌ ${keyLabel} returned HTTP ${res.status}: ${bodyText.slice(0, 200)}`);
      return null;

    } catch (error: any) {
      const msg = error?.message || String(error);
      // Timeout or network error on this key → try next
      if (msg.includes('abort') || msg.includes('timeout') || msg.includes('ECONNREFUSED')) {
        console.warn(`[Gemini Rotation] ⚠️ ${keyLabel} timed out / network error. Trying next key...`);
        continue;
      }
      console.error(`[Gemini Rotation] ❌ ${keyLabel} threw: ${msg}`);
      return null;
    }
  }

  // All keys exhausted
  console.error(`[Gemini Rotation] 🚫 ALL ${keys.length} keys exhausted. No successful response.`);
  return null;
}
