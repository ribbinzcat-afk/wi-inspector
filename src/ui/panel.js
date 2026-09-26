import { escapeHtml } from "../util.js";
import { getReport } from "../report.js";

const PANEL_ID = "wii-panel";
let mounted = false;

// ตรงกับ world_info_position ใน world-info.js
const POSITION_LABELS = {
    0: "ก่อนเนื้อเรื่อง",
    1: "หลังเนื้อเรื่อง",
    2: "Author's Note ↑",
    3: "Author's Note ↓",
    4: "ที่ความลึก",
    5: "ตัวอย่าง ↑",
    6: "ตัวอย่าง ↓",
    7: "Outlet",
};

function entryTitle(entry) {
    return entry.comment || entry.key.join(", ") || `#${entry.uid ?? "?"}`;
}

function entryMetaLine(entry) {
    const parts = [POSITION_LABELS[entry.position] ?? `position ${entry.position}`];
    if (entry.position === 4) parts.push(`ลึก ${entry.depth}`);
    parts.push(`order ${entry.order}`);
    parts.push(entry.constant ? "constant" : `probability ${entry.probability}%`);
    return parts.join(" · ");
}

// ใช้ div+JS toggle แทน <details>/<summary> โดยตั้งใจ — ธีมของผู้ใช้ ST มักมี custom CSS ที่ตั้งกฎ
// ให้ tag "summary"/"details" ตรงๆ (ทำ FAQ พับ/กางในธีม) ซึ่งชนกับของเราแล้วบีบให้ยุบเหลือเส้นบางๆ
// (เจอจริงตอนทดสอบบนธีมของผู้ใช้ — ดู panel state) การใช้ div ธรรมดา + คลาสของตัวเองเท่านั้นกันชนแบบนี้ได้เด็ดขาด
function entryHtml(entry) {
    const keys = entry.key.concat(entry.keysecondary.map((k) => `+${k}`));
    const keysHtml = keys.length ? `<div class="wii-entry-keys">คีย์: ${escapeHtml(keys.join(", "))}</div>` : "";
    return `
    <div class="wii-entry" data-expanded="false">
        <div class="wii-entry-summary interactable" tabindex="0" role="button" aria-expanded="false">
            <span class="wii-entry-caret fa-solid fa-chevron-right"></span>
            <span class="wii-entry-title">${escapeHtml(entryTitle(entry))}</span>
            <span class="wii-entry-world">${escapeHtml(entry.world || "(ไม่ทราบ world)")}</span>
            <span class="wii-entry-tokens">${entry.tokens} tok</span>
        </div>
        <div class="wii-entry-body">
            <div class="wii-entry-meta">${escapeHtml(entryMetaLine(entry))}</div>
            ${keysHtml}
            <pre class="wii-entry-content">${escapeHtml(entry.content) || "(เนื้อหาว่าง)"}</pre>
        </div>
    </div>`;
}

function toggleEntry($entry) {
    const expanded = $entry.attr("data-expanded") === "true";
    $entry.attr("data-expanded", String(!expanded));
    $entry.find("> .wii-entry-summary").attr("aria-expanded", String(!expanded));
}

function renderBody() {
    const $panel = $(`#${PANEL_ID}`);
    if (!$panel.length) return;
    const report = getReport();

    if (report.pending) {
        $panel.find(".wii-panel-stats").text("กำลังเจน...");
        $panel.find(".wii-panel-list").html('<p class="wii-hint">กำลังรอผลจากเจนรอบนี้...</p>');
        return;
    }

    const count = report.entries.length;
    const ts = report.ts ? new Date(report.ts).toLocaleTimeString() : "-";
    $panel.find(".wii-panel-stats").text(
        count ? `${count} entries · รวม ${report.totalTokens} tokens · เจนล่าสุด ${ts}` : "ยังไม่มีข้อมูลเจนล่าสุด",
    );

    if (!count) {
        $panel.find(".wii-panel-list").html(
            '<p class="wii-hint">ไม่มี entry ที่ถูกส่งในเจนล่าสุด<br><span class="wii-hint-sub">(ไม่มี key ไหนแมตช์ หรือยังไม่เคยเจนเลยตั้งแต่เปิดหน้านี้)</span></p>',
        );
        return;
    }

    $panel.find(".wii-panel-list").html(report.entries.map(entryHtml).join(""));
}

function panelHtml() {
    return `
    <div id="${PANEL_ID}" class="wii-panel" hidden>
        <div class="wii-panel-backdrop"></div>
        <div class="wii-panel-sheet">
            <div class="wii-panel-header">
                <div class="wii-panel-title"><i class="fa-solid fa-book-open"></i> WI Inspector</div>
                <div class="wii-panel-close interactable" tabindex="0" role="button" title="ปิด"><i class="fa-solid fa-xmark"></i></div>
            </div>
            <div class="wii-panel-stats"></div>
            <div class="wii-panel-list"></div>
        </div>
    </div>`;
}

function bindEvents() {
    const $panel = $(`#${PANEL_ID}`);
    $panel.find(".wii-panel-close").on("click", closePanel);
    $panel.find(".wii-panel-backdrop").on("click", closePanel);
    $panel.on("click", ".wii-entry-summary", function () {
        toggleEntry($(this).closest(".wii-entry"));
    });
    $panel.on("keydown", ".wii-entry-summary", function (e) {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggleEntry($(this).closest(".wii-entry"));
        }
    });
    $(document).on("keydown.wii-panel", (e) => {
        if (e.key === "Escape" && isPanelOpen()) closePanel();
    });
}

function mountPanel() {
    if (mounted) return;
    $("body").append(panelHtml());
    bindEvents();
    mounted = true;
}

export function isPanelOpen() {
    return mounted && !$(`#${PANEL_ID}`).prop("hidden");
}

export function openPanel() {
    mountPanel();
    renderBody();
    $(`#${PANEL_ID}`).prop("hidden", false);
}

export function closePanel() {
    $(`#${PANEL_ID}`).prop("hidden", true);
}

export function togglePanel() {
    if (isPanelOpen()) closePanel();
    else openPanel();
}

export function refreshPanelIfOpen() {
    if (isPanelOpen()) renderBody();
}

export function teardownPanel() {
    $(document).off("keydown.wii-panel");
    $(`#${PANEL_ID}`).remove();
    mounted = false;
}
