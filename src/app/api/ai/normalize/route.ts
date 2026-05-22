import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const body = await request.json();
  const { locationName } = body;

  try {
    if (!locationName) {
      return NextResponse.json({ error: "locationName is required" }, { status: 400 });
    }

    const aiPrompt = `Convert '${locationName}' into a formal address format: '[Name], [District], [City], Vietnam'. Only return the address string, no extra text.`;

    // ── Call Hybrid AI Engine (Direct Gemini -> OpenRouter -> Mock/Safe Fallback) ──────────────────
    console.log("DEBUG: Using Hybrid AI Engine for Address Normalization");
    
    const geminiKeys = (process.env.GEMINI_KEYS || "").split(',').map(k => k.trim()).filter(Boolean);
    const openrouterKeys = (process.env.OPENROUTER_KEYS || "").split(',').map(k => k.trim()).filter(Boolean);
    if (openrouterKeys.length === 0 && process.env.OPENROUTER_API_KEY) {
      openrouterKeys.push(process.env.OPENROUTER_API_KEY);
    }

    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    // Engine A: Direct Gemini API (Fastest & direct)
    async function callGemini(promptText: string, keyIndex = 0): Promise<{ ok: boolean; text?: string; status?: number }> {
      try {
        const apiKey = geminiKeys[keyIndex];
        if (!apiKey) return { ok: false, status: 401 };
        console.log(`DEBUG: Trying direct Gemini key index ${keyIndex} / ${geminiKeys.length}...`);
        
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: promptText }] }]
          }),
          signal: AbortSignal.timeout(3000) // Lowered to 3s for even faster response
        });

        if (!response.ok) {
          if (response.status === 429 && keyIndex < geminiKeys.length - 1) {
            console.warn(`Gemini key index ${keyIndex} got 429, trying next key...`);
            await delay(1000);
            return callGemini(promptText, keyIndex + 1);
          }
          return { ok: false, status: response.status };
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (!text) return { ok: false, status: 500 };
        return { ok: true, text };
      } catch (error: any) {
        console.warn(`Gemini key index ${keyIndex} failed/timed out:`, error);
        
        // If it is a network error or timeout (meaning direct API is blocked by ISP), 
        // skip other keys immediately to save 15-30s of demo time!
        const errorName = error?.name || "";
        const errorMsg = error?.message || "";
        const isTimeoutOrBlock = errorName === "TimeoutError" || errorMsg.includes("aborted") || errorMsg.includes("fetch failed");
        
        if (isTimeoutOrBlock) {
          console.warn("[Hybrid AI Engine] Network block/timeout detected. Skipping remaining Gemini keys to prevent UI lag.");
          return { ok: false, status: 500 };
        }

        if (keyIndex < geminiKeys.length - 1) {
          await delay(1000);
          return callGemini(promptText, keyIndex + 1);
        }
        return { ok: false, status: 500 };
      }
    }

    // Engine B: OpenRouter API as a robust fallback
    async function callOpenRouter(promptText: string, keyIndex = 0): Promise<{ ok: boolean; text?: string; status?: number }> {
      try {
        const apiKey = openrouterKeys[keyIndex];
        if (!apiKey) return { ok: false, status: 401 };
        console.log(`DEBUG: Trying OpenRouter key index ${keyIndex} / ${openrouterKeys.length}...`);

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "HTTP-Referer": "https://vku-market.id.vn",
            "X-Title": "VKU Market",
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "google/gemma-4-31b-it:free",
            messages: [{ role: "user", content: promptText }]
          }),
          signal: AbortSignal.timeout(6000)
        });

        if (!response.ok) {
          if (response.status === 429 && keyIndex < openrouterKeys.length - 1) {
            console.warn(`OpenRouter key index ${keyIndex} got 429, trying next key...`);
            await delay(1000);
            return callOpenRouter(promptText, keyIndex + 1);
          }
          return { ok: false, status: response.status };
        }

        const data = await response.json();
        const text = data.choices?.[0]?.message?.content?.trim();
        if (!text) return { ok: false, status: 500 };
        return { ok: true, text };
      } catch (error) {
        console.warn(`OpenRouter key index ${keyIndex} failed:`, error);
        if (keyIndex < openrouterKeys.length - 1) {
          await delay(1000);
          return callOpenRouter(promptText, keyIndex + 1);
        }
        return { ok: false, status: 500 };
      }
    }

    let result = await callGemini(aiPrompt);
    if (!result.ok) {
      console.warn("[Address Normalization] Direct Gemini API failed or timed out. Falling back to OpenRouter...");
      result = await callOpenRouter(aiPrompt);
    }

    if (!result.ok) {
      console.warn("[Address Normalization] All hybrid keys and fallback engines exhausted — serving original locationName.");
      return NextResponse.json({ normalized: locationName });
    }

    return NextResponse.json({ normalized: result.text || locationName });
  } catch (error: any) {
    console.error("Normalization error:", error);
    return NextResponse.json({ normalized: locationName || "" });
  }
}
