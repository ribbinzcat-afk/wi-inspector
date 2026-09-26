import { escapeRegex } from "../../../../utils.js";
import { parseRegexFromString, world_info_case_sensitive, world_info_match_whole_words, world_info_depth } from "../../../../world-info.js";

/**
 * จำลอง logic การจับคู่คีย์ของ world-info.js (WorldInfoBuffer#matchKeys เป็น private method เข้าจากนอกไม่ได้)
 * ใช้ค่าตั้งต้นจริงของผู้ใช้ (case sensitivity/whole word ต่อ entry หรือ global, regex key) ให้ใกล้เคียงที่สุด
 * — เป้าหมายคือ "ชี้ให้เห็นว่าคำไหนน่าจะ trigger" ไม่ใช่ทำ engine ของ WI ซ้ำ 100% (recursion/sticky/cooldown/
 * delay ไม่ได้ลอกมาด้วย เพราะไม่กระทบตัวข้อความที่ควรไฮไลต์)
 * @returns {RegExp|null}
 */
export function buildMatcher(needle, entry) {
    if (!needle) return null;

    const parsedRegex = parseRegexFromString(needle);
    if (parsedRegex) {
        const flags = parsedRegex.flags.includes("g") ? parsedRegex.flags : `${parsedRegex.flags}g`;
        try {
            return new RegExp(parsedRegex.source, flags);
        } catch {
            return null;
        }
    }

    const caseSensitive = entry.caseSensitive ?? world_info_case_sensitive;
    const matchWholeWords = entry.matchWholeWords ?? world_info_match_whole_words;
    const flags = caseSensitive ? "g" : "gi";
    const escaped = escapeRegex(needle);

    // whole word เฉพาะคีย์คำเดียว (ตาม logic จริงใน world-info.js — วลีหลายคำใช้ substring ตรงๆ เสมอ)
    // ตั้งใจใช้ \w/\W แบบ ASCII ล้วนของ JS เอง (ไม่ใช้ \p{L} แบบ unicode-aware) เพื่อให้ตรงกับพฤติกรรมจริงของ
    // ST เป๊ะๆ แม้จะดูเหมือนไม่สมบูรณ์: ภาษาไทย/CJK ไม่มีช่องว่างคั่นคำ ตัวอักษรเหล่านี้เลยไม่ถูกนับเป็น \w
    // (นับเป็น \W ไปเลย) ผลคือขอบเขต "คำ" แทบจะเจออยู่ตลอดเวลารอบๆ คีย์ภาษาไทย — เหมือน "whole word" ถูกปิดใช้
    // งานจริงๆ สำหรับสคริปต์ที่ไม่ใช่ละติน ถ้าเปลี่ยนไปใช้ \p{L} (ตัดคำตามภาษาศาสตร์จริง) คีย์ภาษาไทยที่แปะอยู่
    // กลางประโยคยาวๆ (ไม่มีช่องว่างขั้น) จะไม่ถูกจับว่าแมตช์เลย ทั้งที่ ST เองจับได้จริง (เจอบั๊กนี้ตอนทดสอบ)
    if (matchWholeWords && !/\s/.test(needle.trim())) {
        try {
            return new RegExp(`(?<!\\w)${escaped}(?!\\w)`, flags);
        } catch {
            return new RegExp(escaped, flags);
        }
    }
    return new RegExp(escaped, flags);
}

export function entryMatchers(entry) {
    const keys = [...(entry.key || []), ...(entry.keysecondary || [])].filter(Boolean);
    return keys.map((k) => buildMatcher(k, entry)).filter(Boolean);
}

/**
 * mesid ที่อยู่ในช่วงที่ entry นี้ถูกสแกนจริง (ล่าสุด -> เก่า ตาม scanDepth ของ entry หรือ global depth)
 * ประมาณเดียวกับ coreChat ที่ ST ใช้จริงตอนสแกน WI (กรอง is_system ออก, เรียงจากข้อความล่าสุดย้อนกลับไป)
 */
export function scannableMesIds(ctx, entry) {
    const chat = ctx.chat || [];
    const ordered = [];
    for (let i = chat.length - 1; i >= 0; i--) {
        if (!chat[i]?.is_system) ordered.push(i);
    }
    const depth = Number(entry.scanDepth ?? world_info_depth);
    if (!Number.isFinite(depth) || depth <= 0) return [];
    return ordered.slice(0, depth);
}
