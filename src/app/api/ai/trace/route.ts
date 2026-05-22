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

    // ── Step 5: Call OpenRouter ─────────────────────────
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
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: userQuery.trim() }
        ]
      })
    });

    if (!result.ok) {
      if (result.status === 429) {
        return NextResponse.json({ answer: FALLBACK, error: "Rate limit reached." }, { status: 429 });
      }
      throw new Error(`OpenRouter error: ${result.status}`);
    }

    const data = await result.json();
    const answer = data.choices?.[0]?.message?.content?.trim();

    return NextResponse.json({ answer: answer || FALLBACK });
  } catch (error: any) {
    console.error('Provenance Guardian error:', error);
    if (error.status === 429) {
      return NextResponse.json({ answer: FALLBACK, error: "Rate limit reached." }, { status: 429 });
    }
    return NextResponse.json({ answer: FALLBACK, error: "AI request failed." }, { status: 500 });
  }
}
