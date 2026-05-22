import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';


const FALLBACK_VI = "🍉 Hãy bổ sung vitamin C với cam tươi và thanh long đỏ! Trái cây tươi ngon từ VKU Market luôn sẵn sàng cho bạn.";
const FALLBACK_EN = "🍉 Refresh yourself with fresh oranges and dragon fruit! VKU Market has the freshest produce waiting for you.";

// Default: Da Nang coordinates
const DEFAULT_LAT = 16.0747;
const DEFAULT_LON = 108.2062;

// ─── WMO Weather Code → Vietnamese description ───────────────────────────────
function translateWeatherCode(code: number, isNight: boolean): string {
  if (code <= 1) return isNight ? 'trời quang đãng, se lạnh về đêm' : 'trời nắng đẹp, quang đãng';
  if (code === 2) return 'trời có mây nhẹ';
  if (code === 3) return 'trời âm u, nhiều mây';
  if (code >= 45 && code <= 48) return 'sương mù dày đặc';
  if (code >= 51 && code <= 55) return 'mưa phùn nhẹ';
  if (code >= 56 && code <= 57) return 'mưa phùn lạnh';
  if (code >= 61 && code <= 63) return 'mưa vừa';
  if (code >= 65 && code <= 67) return 'mưa lạnh, nặng hạt';
  if (code >= 71 && code <= 77) return 'mưa tuyết (hiếm gặp)';
  if (code >= 80 && code <= 82) return 'mưa rào bất chợt';
  if (code >= 85 && code <= 86) return 'mưa tuyết rào';
  if (code >= 95) return 'giông bão, mưa to sấm sét';
  return 'thời tiết không xác định';
}

// ─── Time-of-day context builder ──────────────────────────────────────────────
function getTimeContext(lang: string): { period: string; context: string; isNight: boolean; currentMonth: string } {
  const now = new Date();
  const vnTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
  const hour = vnTime.getHours();
  const isNight = hour >= 18 || hour < 5;
  const monthNames = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
    'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];
  const currentMonth = monthNames[vnTime.getMonth()];

  if (hour >= 5 && hour < 11) {
    return {
      period: lang === 'vi' ? 'buổi sáng' : 'morning',
      context: lang === 'vi'
        ? `Bây giờ là buổi sáng. Khuyên người dùng ăn trái cây nhẹ nhàng, giàu năng lượng để bắt đầu ngày mới.`
        : `It is morning. Recommend light, energizing fruits for a fresh start.`,
      isNight,
      currentMonth,
    };
  } else if (hour >= 11 && hour < 14) {
    return {
      period: lang === 'vi' ? 'buổi trưa' : 'midday',
      context: lang === 'vi'
        ? `Bây giờ là buổi trưa. Khuyên trái cây mát, bổ sung nước và khoáng chất.`
        : `It is midday. Recommend refreshing, hydrating fruits.`,
      isNight,
      currentMonth,
    };
  } else if (hour >= 14 && hour < 18) {
    return {
      period: lang === 'vi' ? 'buổi chiều' : 'afternoon',
      context: lang === 'vi'
        ? `Bây giờ là buổi chiều. Khuyên trái cây giúp tái tạo năng lượng sau giờ làm việc.`
        : `It is afternoon. Recommend energizing fruits to recharge.`,
      isNight,
      currentMonth,
    };
  } else {
    return {
      period: lang === 'vi' ? 'buổi tối' : 'evening',
      context: lang === 'vi'
        ? `Bây giờ là buổi tối. ĐỪNG nói về nắng ấm. Khuyên người dùng ăn nhẹ trái cây để thư giãn, dễ ngủ ngon.`
        : `It is evening. Do NOT mention sunshine. Recommend light fruits for relaxation and sleep.`,
      isNight,
      currentMonth,
    };
  }
}

// ─── Fetch weather from Open-Meteo ────────────────────────────────────────────
async function fetchWeather(lat: number, lon: number): Promise<{ temperature: number; weatherStatus: string; isNight: boolean } | null> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const data = await res.json();
    const current = data?.current_weather;
    if (!current) return null;

    const now = new Date();
    const vnHour = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' })).getHours();
    const isNight = vnHour >= 18 || vnHour < 5;

    return {
      temperature: current.temperature,
      weatherStatus: translateWeatherCode(current.weathercode, isNight),
      isNight,
    };
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const lat = typeof body.lat === 'number' ? body.lat : DEFAULT_LAT;
    const lon = typeof body.lon === 'number' ? body.lon : DEFAULT_LON;
    const lang = body.lang || 'vi';

    // ── Fetch weather data ───────────────────────────────────────────
    const weather = await fetchWeather(lat, lon);
    const temperature = weather?.temperature ?? 28;
    const weatherStatus = weather?.weatherStatus ?? 'thời tiết bình thường';

    // ── Fetch active stock from DB ───────────────────────────────────
    let products: { name: string; origin: string; price: number | null; inventory: { inWarehouse: number } | null }[] = [];
    try {
      products = await prisma.productTemplate.findMany({
        select: {
          name: true,
          origin: true,
          price: true,
          inventory: { select: { inWarehouse: true } },
        },
        where: {
          inventory: {
            OR: [
              { inWarehouse: { gt: 0 } },
              { onDisplay: { gt: 0 } },
            ],
          },
        },
      });
    } catch {
      products = [];
    }



    // ── Build stock JSON for prompt ──────────────────────────────────
    const stockJson = products.length > 0
      ? products.map(p => ({
          tên: p.name,
          xuất_xứ: p.origin,
          giá: p.price ? `${p.price.toLocaleString()}đ` : 'Liên hệ',
          tồn_kho: p.inventory?.inWarehouse ?? 0,
        }))
      : [{ tên: 'Cam sành', xuất_xứ: 'Việt Nam', giá: '45,000đ', tồn_kho: 50 }];

    const { context: timeContext, currentMonth } = getTimeContext(lang);

    const locationName = 'Đà Nẵng / Miền Trung';
    const vnMonth = new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh', month: 'numeric' });

    const prompt = lang === 'vi'
      ? `Bạn là "Lão Nông Advisor", một chuyên gia nông nghiệp dày dặn kinh nghiệm, thấu hiểu khí hậu Việt Nam và rất quan tâm đến sức khỏe khách hàng của nền tảng VKU Market. 

DỮ LIỆU ĐẦU VÀO THỜI GIAN THỰC:
- Vị trí khách hàng: ${locationName}
- Thời gian hiện tại: Tháng ${vnMonth}
- Thời tiết hiện tại: ${weatherStatus}, nhiệt độ ${temperature}°C.
- Danh sách trái cây sẵn có trong kho (kèm giá): ${JSON.stringify(stockJson)}

NHIỆM VỤ CỦA BẠN:
Hãy viết một đoạn tư vấn ngắn gọn (khoảng 3-4 câu), thân thiện, có tâm và tự nhiên như một người nông dân đang tâm tình với khách. BẮT BUỘC tuân thủ cấu trúc sau:
1. Mở đầu: Nhắc đến thời tiết và vị trí hiện tại của khách để tạo sự đồng cảm (VD: "Chào bạn, thời tiết Đà Nẵng tháng 5 đang nắng gắt 36 độ...").
2. Gợi ý đúng mùa: Chọn 1-2 loại trái cây trong kho đang đúng mùa vụ phù hợp với thời tiết này.
3. Giải thích có tâm: Nêu rõ lợi ích (VD: giải nhiệt, cấp nước, tăng đề kháng mùa lạnh), và nhấn mạnh việc trái cây đang vào mùa nên "ngọt nước nhất", "giá cực tốt", "đảm bảo chuẩn on-chain".

LƯU Ý QUAN TRỌNG: 
- Không liệt kê khô khan. Viết thành một đoạn văn liền mạch, mượt mà.
- Chỉ gợi ý những trái cây có trong danh sách kho. Nếu kho trống, hãy khuyên khách uống nhiều nước và quay lại sau.`
      : `You are 'Lão Nông Advisor', a Vietnamese agricultural produce expert. Real-time context: Current weather at user's location: ${weatherStatus}, temperature: ${temperature}°C. System time: Month ${vnMonth}. 

Available produce in stock with prices: ${JSON.stringify(stockJson)}

Write a short, friendly, and empathetic consulting paragraph (3-4 sentences). Start by mentioning the weather and location to build rapport. Suggest 1-2 seasonal fruits from the stock that fit the weather. Explain the benefits passionately (e.g., cooling, hydration) and highlight they are perfectly in season, best priced, and verified on-chain. Do not use markdown. Do not just list items.`;

    // ── Call OpenRouter ─────────────────────────────────
    console.log("DEBUG: Using OpenRouter Model:", "openrouter/free");
    
    const apiKey = process.env.OPENROUTER_API_KEY || "";
    const headers = {
      "Authorization": `Bearer ${apiKey}`,
      "HTTP-Referer": "https://vku-market.id.vn",
      "X-Title": "VKU Market",
      "Content-Type": "application/json"
    };

    const result = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: "deepseek/deepseek-v4-flash:free",
        messages: [{ role: "user", content: prompt }]
      })
    });

    if (!result.ok) {
      if (result.status === 429) {
        return NextResponse.json({ error: "Rate limit reached." }, { status: 429 });
      }
      throw new Error(`OpenRouter error: ${result.status}`);
    }

    const data = await result.json();
    const text = data.choices?.[0]?.message?.content?.trim();

    return NextResponse.json({ text: text || (lang === 'vi' ? FALLBACK_VI : FALLBACK_EN) });
  } catch (error: any) {
    console.error('Lão Nông Advisor error:', error);
    return NextResponse.json({ error: "AI request failed." }, { status: 500 });
  }
}
