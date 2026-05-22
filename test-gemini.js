// Read GEMINI_KEY from native environment (via --env-file)
const GEMINI_KEY = process.env.GEMINI_KEY_1 || process.env.GEMINI_API_KEY;

if (!GEMINI_KEY) {
  console.error("❌ No GEMINI_KEY_1 found in .env");
  process.exit(1);
}

const GEMINI_MODEL = 'gemini-2.5-flash'; // Or gemini-1.5-flash

async function testGemini() {
  console.log(`🤖 Starting Gemini API Isolation Test...`);
  console.log(`🔑 Using Key: ...${GEMINI_KEY.slice(-6)}`);
  console.log(`🚀 Model: ${GEMINI_MODEL}`);

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`;
  
  const testPrompt = "Hôm nay thời tiết Đà Nẵng nắng nóng 35 độ C, Lão Nông hãy gợi ý một loại trái cây giải nhiệt.";
  
  console.log(`\n🗣️  Prompt: "${testPrompt}"\n`);
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: testPrompt }] }],
        generationConfig: {
          temperature: 0.7,
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ HTTP Error: ${response.status} ${response.statusText}`);
      console.error(`Error Details: ${errorText}`);
      return;
    }

    const data = await response.json();
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    console.log("✅ Response Received:");
    console.log("--------------------------------------------------");
    console.log(generatedText || "(Empty response)");
    console.log("--------------------------------------------------");
    
  } catch (error) {
    console.error("❌ Execution Error:", error);
  }
}

testGemini();
