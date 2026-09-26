import { extensionName } from "./store.js";
import { countTokens } from "./tokens.js";
import { scannableMesIds } from "./wiMatch.js";

/**
 * รายงานของ "เจนล่าสุด" — เก็บแค่ในหน่วยความจำ ไม่ persist ลง settings เพราะคำว่า "ล่าสุด" ควร
 * รีเซ็ตเองตอนโหลดหน้าใหม่หรือเปลี่ยนแชท ไม่ใช่ค้างข้ามเซสชัน
 * @typedef {object} WiiEntry
 * @property {string} world
 * @property {string|number} uid
 * @property {string} comment
 * @property {string[]} key
 * @property {string[]} keysecondary
 * @property {string} content
 * @property {number} position
 * @property {number} depth
 * @property {number} order
 * @property {number} probability
 * @property {number} role
 * @property {boolean} constant
 * @property {number} tokens
 * @property {number[]} mesIds ชุดข้อความที่ถูกสแกนจริง ณ ตอนแอคทิเวต (เก็บแช่แข็งไว้ตอนนั้นเลย — ไม่คำนวณใหม่
 *   ตอนไฮไลต์ เพราะถ้าคำนวณใหม่จาก ctx.chat ตอนที่ข้อความบอทถูกเพิ่มเข้ามาแล้ว หน้าต่างที่ "ล่าสุด N ข้อความ"
 *   จะเลื่อนไปรวมข้อความบอทที่เพิ่งตอบด้วย ทั้งที่ตอนสแกนจริง (ก่อนบอทตอบ) ไม่เคยเห็นข้อความนั้นเลย
 */

function emptyReport() {
    return { ts: 0, entries: /** @type {WiiEntry[]} */ ([]), totalTokens: 0, pending: false };
}

let current = emptyReport();
const listeners = new Set();

export function getReport() {
    return current;
}

export function onReportChange(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
}

function notify() {
    for (const fn of listeners) {
        try { fn(current); } catch (e) { console.error(`[${extensionName}] listener ล้มเหลว:`, e); }
    }
}

/** เรียกตอน GENERATION_STARTED — ข้ามถ้าเป็น dry run (ไม่ใช่เจนจริงที่ผู้ใช้เห็นผล) */
export function beginGeneration(dryRun) {
    if (dryRun) return;
    current = { ts: Date.now(), entries: [], totalTokens: 0, pending: true };
    notify();
}

/** เรียกตอน event WORLD_INFO_ACTIVATED — arg คือ array ของ entry ที่ ST แอคทิเวตจริง (ผ่าน budget แล้ว) */
export async function recordActivation(ctx, rawEntries) {
    if (!current.pending) {
        // เผื่อ event มาโดยไม่มี GENERATION_STARTED นำหน้า (ไม่ควรเกิดในทางปฏิบัติ กันไว้เฉยๆ)
        current = { ts: Date.now(), entries: [], totalTokens: 0, pending: true };
    }

    const entries = [];
    let totalTokens = 0;
    for (const raw of rawEntries || []) {
        const content = String(raw?.content || "");
        const tokens = await countTokens(ctx, content);
        totalTokens += tokens;
        entries.push({
            world: String(raw?.world || ""),
            uid: raw?.uid,
            comment: String(raw?.comment || ""),
            key: Array.isArray(raw?.key) ? raw.key : [],
            keysecondary: Array.isArray(raw?.keysecondary) ? raw.keysecondary : [],
            content,
            position: raw?.position,
            depth: raw?.depth,
            order: raw?.order,
            probability: raw?.probability,
            role: raw?.role,
            constant: Boolean(raw?.constant),
            tokens,
            // ต้องคำนวณ ณ ตอนนี้เท่านั้น (ctx.chat ตอนนี้ = มีข้อความผู้ใช้ล่าสุดแล้ว แต่ยังไม่มีคำตอบบอท)
            mesIds: scannableMesIds(ctx, raw),
        });
    }
    entries.sort((a, b) => a.world.localeCompare(b.world) || (a.order ?? 0) - (b.order ?? 0));

    current = { ...current, entries, totalTokens, pending: false };
    notify();
}

/** เรียกตอน GENERATION_ENDED/GENERATION_STOPPED — ถ้ารอบนี้ไม่มี WORLD_INFO_ACTIVATED มาเลย ให้ปิดเป็น "ไม่มี entry" */
export function finalizeIfPending() {
    if (!current.pending) return;
    current = { ...current, pending: false };
    notify();
}

/** เรียกตอน CHAT_CHANGED — รายงานของแชทเดิมไม่มีความหมายกับแชทใหม่ */
export function resetReport() {
    current = emptyReport();
    notify();
}
