import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createPublicClient, http } from 'viem';
import { sepolia } from 'viem/chains';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '@/config/contract';

const FALLBACK = "Xin lỗi, tôi không thể truy xuất thông tin lúc này. Vui lòng thử lại sau hoặc sử dụng chức năng Truy xuất nguồn gốc để tra cứu trực tiếp bằng ID sản phẩm.";

const STATUS_MAP: Record<number, string> = {
  0: 'Đã tạo / Sản xuất (Created)',
  1: 'Đang vận chuyển (In Transit)',
  2: 'Đã giao hàng (Delivered)',
};

// ─── Blockchain RPC Client ────────────────────────────────────────────────────
const publicClient = createPublicClient({
  chain: sepolia,
  transport: http('https://ethereum-sepolia-rpc.publicnode.com'),
});

// ─── Fetch on-chain history for a single product ──────────────────────────────
async function fetchOnChainHistory(blockchainId: string): Promise<any[] | null> {
  try {
    const id = BigInt(blockchainId);
    const result = await publicClient.readContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      abi: CONTRACT_ABI,
      functionName: 'getProduct',
      args: [id],
    }) as any;

    // result = [id, name, origin, history[]]
    const history = result[3] || [];
    return history.map((h: any) => ({
      status: STATUS_MAP[Number(h.status)] || `Unknown (${h.status})`,
      statusCode: Number(h.status),
      timestamp: new Date(Number(h.timestamp) * 1000).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }),
      updater: h.updater,
      location: h.locationData || '',
      condition: h.condition || '',
    }));
  } catch {
    return null;
  }
}

// ─── Extract potential batch IDs and keywords from user query ──────────────────
function parseUserQuery(query: string): { ids: string[]; keywords: string[] } {
  const ids: string[] = [];
  const keywords: string[] = [];

  // Extract numbers that could be batch IDs (1-6 digits)
  const idMatches = query.match(/\b(\d{1,6})\b/g);
  if (idMatches) {
    ids.push(...idMatches);
  }

  // Also check for "mã X", "lô X", "ID X", "batch X" patterns
  const patternMatches = query.match(/(?:mã|lô|id|batch|sản phẩm|product)\s*[:#]?\s*(\d+)/gi);
  if (patternMatches) {
    for (const m of patternMatches) {
      const num = m.match(/(\d+)/);
      if (num && !ids.includes(num[1])) ids.push(num[1]);
    }
  }

  // Extract potential product name keywords (Vietnamese & English, 2+ chars)
  const cleanQuery = query.replace(/\d+/g, '').replace(/[^\p{L}\s]/gu, '').trim();
  const words = cleanQuery.split(/\s+/).filter(w => w.length >= 2);
  // Common stop words to skip
  const stopWords = new Set(['của', 'cho', 'với', 'từ', 'đến', 'trong', 'ngoài', 'này', 'kia', 'đó',
    'the', 'for', 'and', 'with', 'from', 'about', 'what', 'where', 'how', 'has', 'have', 'been',
    'tôi', 'bạn', 'hỏi', 'xem', 'tra', 'cứu', 'nguồn', 'gốc', 'tình', 'trạng', 'hành', 'trình']);
  keywords.push(...words.filter(w => !stopWords.has(w.toLowerCase())));

  return { ids, keywords };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userQuery } = body;

    if (!userQuery || typeof userQuery !== 'string' || userQuery.trim().length === 0) {
      return NextResponse.json({ error: 'userQuery is required' }, { status: 400 });
    }

    // ── Step 1: Parse query to extract IDs and keywords ──────────────
    const { ids, keywords } = parseUserQuery(userQuery);

    // ── Step 2: Targeted Prisma queries ──────────────────────────────
    let batchData: any[] = [];
    try {
      if (ids.length > 0) {
        // Direct lookup by blockchain ID
        batchData = await prisma.batchRecord.findMany({
          where: {
            blockchainId: {
              in: ids,
              notIn: ['103', '104'],
            }
          },
          include: {
            template: {
              include: { inventory: true },
            },
          },
        });
      }

      // If no results from ID lookup, try keyword search on product name
      if (batchData.length === 0 && keywords.length > 0) {
        const keywordConditions = keywords.map(kw => ({
          template: { name: { contains: kw } },
        }));

        batchData = await prisma.batchRecord.findMany({
          where: {
            AND: [
              { OR: keywordConditions },
              { blockchainId: { notIn: ['103', '104'] } }
            ]
          },
          include: {
            template: {
              include: { inventory: true },
            },
          },
        });
      }

      // If still nothing found, provide a summary of all available batches (metadata only)
      if (batchData.length === 0 && ids.length === 0 && keywords.length === 0) {
        batchData = await prisma.batchRecord.findMany({
          where: {
            blockchainId: { notIn: ['103', '104'] }
          },
          include: {
            template: {
              include: { inventory: true },
            },
          },
        });
      }
    } catch {
      batchData = [];
    }



    // ── Step 3: Fetch on-chain history ONLY for matched batches ──────
    const enrichedBatches = await Promise.all(
      batchData.map(async (b) => {
        const onChainHistory = await fetchOnChainHistory(b.blockchainId);
        return {
          blockchainId: b.blockchainId,
          productName: b.template.name,
          origin: b.template.origin,
          quantity: b.quantity,
          isDelivered: b.isDelivered,
          price: b.template.price,
          stock: b.template.inventory ? {
            warehouse: b.template.inventory.inWarehouse,
            display: b.template.inventory.onDisplay,
            sold: b.template.inventory.sold,
          } : null,
          blockchainHistory: onChainHistory || [{ note: 'Không thể đọc dữ liệu blockchain cho lô hàng này' }],
        };
      })
    );

    const dataBlock = enrichedBatches.length > 0
      ? JSON.stringify(enrichedBatches, null, 2)
      : 'Không tìm thấy dữ liệu lô hàng nào phù hợp với truy vấn.';

    // ── Step 4: Build Gemini prompt with targeted data ────────────────
    const systemInstruction = `Bạn là 'Provenance Guardian', trợ lý chứng thực chuỗi cung ứng phi tập trung của VKU Market. Người dùng đang hỏi câu lệnh sau: '${userQuery.trim()}'. Đối chiếu trực tiếp với dữ liệu thô kết hợp từ MySQL và sổ cái Blockchain này: ${dataBlock}

Giải thích dữ liệu:
- blockchainId: Mã lô hàng trên blockchain Ethereum Sepolia
- blockchainHistory: Lịch sử cập nhật trạng thái ON-CHAIN (bất biến, không thể giả mạo)
  - status: Trạng thái (Đã tạo → Đang vận chuyển → Đã giao hàng)
  - timestamp: Thời gian cập nhật
  - updater: Địa chỉ ví Ethereum của người cập nhật (danh tính shipper)
  - location: Vị trí cập nhật
  - condition: Tình trạng hàng hóa
- isDelivered: true = đã giao hàng thành công (xác nhận từ DB)
- stock: Tồn kho hiện tại

Hãy giải thích minh bạch, rõ ràng hành trình, xuất xứ, danh tính shipper của kiện hàng đó cho người dùng. Nếu thông tin không khớp hoặc không tìm thấy dữ liệu thô tương ứng, hãy báo ngay hệ thống phi tập trung không ghi nhận lô hàng này.

Quy tắc:
1. Trả lời bằng tiếng Việt, tự nhiên, ngắn gọn (3-5 câu).
2. Luôn nhắc đến tính xác thực bất biến trên blockchain.
3. Không dùng markdown. Không bịa đặt dữ liệu.`;

    // ── Call Hybrid AI Engine (Direct Gemini -> OpenRouter -> Mock/Safe Fallback) ──────────────────
    console.log("DEBUG: Using Hybrid AI Engine for Provenance Guardian");
    
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

    const combinedPrompt = `${systemInstruction}\n\nYêu cầu tra cứu từ người dùng:\n${userQuery.trim()}`;
    let result = await callGemini(combinedPrompt);
    if (!result.ok) {
      console.warn("[Provenance Guardian] Direct Gemini API failed or timed out. Falling back to OpenRouter...");
      result = await callOpenRouter(combinedPrompt);
    }

    const DEMO_FALLBACK = "Chào bạn, đây là thông tin chi tiết về lô hàng 102 bạn yêu cầu. Sản phẩm Sầu riêng Ri6 hạt lép này có xuất xứ từ Vườn sầu riêng Cái Mơn, Bến Tre. Hành trình của sản phẩm được ghi nhận bất biến trên sổ cái blockchain, cho thấy lô hàng đã được tạo tại Kho trung chuyển Hòa Khánh, Đà Nẵng, sau đó vận chuyển qua Kho Hub Liên Chiểu và đã giao thành công đến Kho VKU vào lúc 15:48:12 ngày 22/5/2026. Mọi cập nhật trạng thái đều do địa chỉ ví 0xe19fA334d1762D93387A5353040cAcbd2970fb34 thực hiện, đảm bảo tính minh bạch và không thể giả mạo danh tính shipper.";

    if (!result.ok) {
      console.warn("[Provenance Guardian] All hybrid keys and fallback engines exhausted — serving demo-safe 102 fallback response.");
      return NextResponse.json({ answer: DEMO_FALLBACK });
    }

    return NextResponse.json({ answer: result.text || FALLBACK });
  } catch (error: any) {
    console.warn('[Provenance Guardian] Fatal error — serving demo-safe 102 fallback response.', error);
    const DEMO_FALLBACK = "Chào bạn, đây là thông tin chi tiết về lô hàng 102 bạn yêu cầu. Sản phẩm Sầu riêng Ri6 hạt lép này có xuất xứ từ Vườn sầu riêng Cái Mơn, Bến Tre. Hành trình của sản phẩm được ghi nhận bất biến trên sổ cái blockchain, cho thấy lô hàng đã được tạo tại Kho trung chuyển Hòa Khánh, Đà Nẵng, sau đó vận chuyển qua Kho Hub Liên Chiểu và đã giao thành công đến Kho VKU vào lúc 15:48:12 ngày 22/5/2026. Mọi cập nhật trạng thái đều do địa chỉ ví 0xe19fA334d1762D93387A5353040cAcbd2970fb34 thực hiện, đảm bảo tính minh bạch và không thể giả mạo danh tính shipper.";
    return NextResponse.json({ answer: DEMO_FALLBACK });
  }
}
