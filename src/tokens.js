import { extensionName } from "./store.js";

// นับโทเคนด้วย tokenizer ตัวเดียวกับ ST — fallback chars/4 ถ้าเวอร์ชันไม่มีเมธอดนี้
export async function countTokens(ctx, text) {
    text = String(text || "");
    if (!text) return 0;
    try {
        if (typeof ctx.getTokenCountAsync === "function") {
            const n = await ctx.getTokenCountAsync(text);
            if (typeof n === "number" && n >= 0) return n;
        } else if (typeof ctx.getTokenCount === "function") {
            const n = ctx.getTokenCount(text);
            if (typeof n === "number" && n >= 0) return n;
        }
    } catch (e) {
        console.warn(`[${extensionName}] countTokens ล้มเหลว:`, e);
    }
    return Math.ceil(text.length / 4);
}
