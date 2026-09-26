import { getSetting } from "../store.js";

const ANCHOR_ID = "wii-badge-anchor";
const BADGE_ID = "wii-badge";

// ห่อแบดจ์ด้วย wrapper เต็มจอ (top:0;left:0 เป๊ะๆ) แล้วจัดตำแหน่งด้วย flex แทนการใช้ right/bottom ตรงๆ —
// <html> ของ ST ตั้ง transform บนมือถือ (แม้เป็น identity matrix) ทำให้มันกลายเป็น containing block ของ
// position:fixed แทน viewport จริง และกล่องของมันกว้าง/สูง 0 — right/bottom (นับจากขอบขวา/ล่างของ
// containing block) เลยคำนวณผิดเพี้ยนไปไกลลอยหลุดจอ ส่วน top/left ที่ 0 ไม่พังเพราะไม่ต้องพึ่งขนาดกล่องเลย
export function mountBadge(onClick) {
    if ($(`#${ANCHOR_ID}`).length) return;
    const el = $(`
        <div id="${ANCHOR_ID}" class="wii-badge-anchor">
            <div id="${BADGE_ID}" class="wii-badge interactable" tabindex="0" role="button" title="WI Inspector">
                <i class="fa-solid fa-book-open"></i>
                <span class="wii-badge-count">0</span>
            </div>
        </div>`);
    el.find(`#${BADGE_ID}`).on("click", () => onClick());
    el.find(`#${BADGE_ID}`).on("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); }
    });
    $("body").append(el);
    applyBadgeVisibility();
}

export function applyBadgeVisibility() {
    const show = Boolean(getSetting("enabled")) && Boolean(getSetting("showBadge"));
    $(`#${ANCHOR_ID}`).toggle(show);
}

export function updateBadge(report) {
    const $badge = $(`#${BADGE_ID}`);
    if (!$badge.length) return;
    const count = report.entries.length;
    $badge.find(".wii-badge-count").text(report.pending ? "…" : String(count));
    $badge.toggleClass("wii-badge-empty", !report.pending && count === 0);
    $badge.toggleClass("wii-badge-pending", report.pending);
    const detail = report.pending ? "กำลังเจน..." : `${count} entries · ${report.totalTokens} tokens`;
    $badge.attr("title", `WI Inspector — ${detail}`);
}

export function teardownBadge() {
    $(`#${ANCHOR_ID}`).remove();
}
