import { getSetting } from "./store.js";
import { entryMatchers, scannableMesIds } from "./wiMatch.js";

const HL_CLASS = "wii-hl";
const PALETTE_SIZE = 6;

function entryKey(entry) {
    return `${entry.world}::${entry.uid}`;
}

/** ถอด <mark class="wii-hl"> ทั้งหมดกลับเป็นข้อความธรรมดา — เรียกก่อนวาดใหม่ทุกครั้งให้ idempotent */
export function clearHighlights(root) {
    const scope = root || document.getElementById("chat") || document;
    scope.querySelectorAll(`.${HL_CLASS}`).forEach((mark) => {
        const parent = mark.parentNode;
        if (!parent) return;
        parent.replaceChild(document.createTextNode(mark.textContent), mark);
        parent.normalize();
    });
}

function collectTextNodes(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode(n) {
            if (!n.data || !n.data.trim()) return NodeFilter.FILTER_REJECT;
            if (n.parentElement?.closest("script, style")) return NodeFilter.FILTER_REJECT;
            return NodeFilter.FILTER_ACCEPT;
        },
    });
    const nodes = [];
    let n;
    while ((n = walker.nextNode())) nodes.push(n);
    return nodes;
}

/** หาทุกช่วงที่แมตช์ในข้อความ node เดียว จากตัวจับคู่ของหลาย entry รวมกัน แล้วห่อด้วย <mark> (ช่วงที่ทับกันตัวแรกชนะ) */
function wrapMatchesInTextNode(node, matchersWithMeta) {
    const text = node.data;
    const ranges = [];

    for (const { regex, meta } of matchersWithMeta) {
        regex.lastIndex = 0;
        let m;
        let guard = 0;
        while ((m = regex.exec(text)) && guard++ < 1000) {
            if (m[0].length === 0) { regex.lastIndex++; continue; }
            ranges.push({ start: m.index, end: m.index + m[0].length, meta });
            if (regex.lastIndex <= m.index) regex.lastIndex = m.index + 1;
        }
    }
    if (!ranges.length) return;

    ranges.sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start));
    const kept = [];
    let lastEnd = -1;
    for (const r of ranges) {
        if (r.start >= lastEnd) { kept.push(r); lastEnd = r.end; }
    }

    const frag = document.createDocumentFragment();
    let cursor = 0;
    for (const r of kept) {
        if (r.start > cursor) frag.appendChild(document.createTextNode(text.slice(cursor, r.start)));
        const mark = document.createElement("mark");
        mark.className = `${HL_CLASS} wii-hl-${r.meta.colorIndex}`;
        mark.dataset.wiiKey = r.meta.key;
        mark.title = r.meta.title;
        mark.textContent = text.slice(r.start, r.end);
        frag.appendChild(mark);
        cursor = r.end;
    }
    if (cursor < text.length) frag.appendChild(document.createTextNode(text.slice(cursor)));

    node.parentNode.replaceChild(frag, node);
}

/** วาดไฮไลต์ใหม่ทั้งหมดตามรายงานปัจจุบัน — เรียกได้ซ้ำๆ อย่างปลอดภัย (เคลียร์ของเก่าก่อนเสมอ) */
export function applyHighlights(ctx, report) {
    clearHighlights();

    if (!getSetting("enabled") || !getSetting("highlightMessages")) return;
    if (!report || report.pending || !report.entries.length) return;

    const colorSeen = new Map();
    /** @type {Map<number, Array<{regex: RegExp, meta: object}>>} */
    const perMessage = new Map();

    for (const entry of report.entries) {
        if (entry.constant) continue; // แทรกเสมออยู่แล้ว ไม่มี "ข้อความที่ trigger" จริงให้ชี้
        const matchers = entryMatchers(entry);
        if (!matchers.length) continue;
        const mesIds = scannableMesIds(ctx, entry);
        if (!mesIds.length) continue;

        const key = entryKey(entry);
        if (!colorSeen.has(key)) colorSeen.set(key, colorSeen.size % PALETTE_SIZE);
        const colorIndex = colorSeen.get(key);
        const title = `WI: ${entry.comment || entry.key.join(", ") || key} (${entry.world || "?"})`;
        const meta = { key, colorIndex, title };

        for (const mesId of mesIds) {
            const list = perMessage.get(mesId) || [];
            for (const regex of matchers) list.push({ regex, meta });
            perMessage.set(mesId, list);
        }
    }

    for (const [mesId, matchersWithMeta] of perMessage) {
        const mesText = document.querySelector(`#chat .mes[mesid="${mesId}"] .mes_text`);
        if (!mesText) continue;
        for (const node of collectTextNodes(mesText)) {
            wrapMatchesInTextNode(node, matchersWithMeta);
        }
    }
}

/** ผูก click ที่ mark ไฮไลต์ (delegated ที่ document เลยรอดจากการเรนเดอร์ข้อความใหม่ทุกครั้ง) */
export function bindHighlightClicks(onReveal) {
    $(document).on("click.wii-hl", `.${HL_CLASS}`, function () {
        const key = $(this).data("wiiKey");
        if (key) onReveal(String(key));
    });
}
