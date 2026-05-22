import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { locationName } = body;

    if (!locationName) {
      return NextResponse.json({ error: "locationName is required" }, { status: 400 });
    }

    const aiPrompt = `Convert '${locationName}' into a formal address format: '[Name], [District], [City], Vietnam'. Only return the address string, no extra text.`;

    const apiKey = process.env.OPENROUTER_API_KEY || "";
    const headers = {
      "Authorization": `Bearer ${apiKey}`,
      "HTTP-Referer": "https://vku-market.id.vn",
      "X-Title": "VKU Market",
      "Content-Type": "application/json"
    };

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: "deepseek/deepseek-v4-flash:free",
        messages: [{ role: "user", content: aiPrompt }]
      })
    });

    if (!res.ok) {
      throw new Error(`OpenRouter error: ${res.status}`);
    }

    const data = await res.json();
    const normalized = data.choices?.[0]?.message?.content?.trim() || locationName;

    return NextResponse.json({ normalized });
  } catch (error: any) {
    console.error("Normalization error:", error);
    return NextResponse.json({ error: "Failed to normalize location" }, { status: 500 });
  }
}
