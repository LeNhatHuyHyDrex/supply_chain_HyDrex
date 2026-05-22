import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req: Request) {
  try {
    const { locationName } = await req.json();
    if (!locationName) return NextResponse.json({ error: 'Missing location name' }, { status: 400 });

    // Initialize Gemini Client (Use your existing rotation logic if applicable)
    const apiKey = process.env.GEMINI_KEY_1 || process.env.GEMINI_KEY_2;
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing Gemini API Key' }, { status: 500 });
    }
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

    const prompt = `You are a strict Geocoding API. The user will give you a location name in Vietnam or globally. 
    You must find the approximate latitude and longitude for this location.
    Respond ONLY with a valid, raw JSON object containing "lat" and "lng" as stringified numbers. Do not use markdown blocks like \`\`\`json. Do not add any extra text.
    Location: "${locationName}"
    Expected format example: {"lat": "16.0748", "lng": "108.1512"}`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    // Parse the AI's string response into an actual JSON object
    const rawText = responseText.trim().replace(/```json/g, '').replace(/```/g, '');
    const geoData = JSON.parse(rawText);

    return NextResponse.json(geoData);
  } catch (error) {
    console.error('AI Geocode Error:', error);
    return NextResponse.json({ error: 'Failed to geocode location' }, { status: 500 });
  }
}
