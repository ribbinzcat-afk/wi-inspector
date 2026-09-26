import { eventSource, event_types } from "../../../../script.js";
import { getContext } from "../../../extensions.js";
import { extensionName, extensionFolderPath, getSettings, getSetting } from "./src/store.js";
import { beginGeneration, recordActivation, finalizeIfPending, resetReport, onReportChange, getReport } from "./src/report.js";
import { mountBadge, updateBadge, applyBadgeVisibility } from "./src/ui/badge.js";
import { openPanel, togglePanel, refreshPanelIfOpen, revealEntry } from "./src/ui/panel.js";
import { loadSettingsUi, bindSettingsHandlers, syncWandButtonVisibility, WAND_BUTTON_ID } from "./src/ui/settings.js";
import { applyHighlights, bindHighlightClicks } from "./src/highlight.js";

/** เพิ่มปุ่มลัดในเมนูไม้กายสิทธิ์ (#extensionsMenu) — extension third-party ไม่มี container จองไว้ให้ */
function mountWandButton() {
    if ($(`#${WAND_BUTTON_ID}`).length) return;
    const btn = $(`
        <div id="${WAND_BUTTON_ID}" class="list-group-item flex-container flexGap5 interactable" tabindex="0">
            <div class="fa-solid fa-book-open extensionsMenuExtensionButton"></div>
            <span>WI Inspector</span>
        </div>`);
    btn.on("click", () => togglePanel());
    $("#extensionsMenu").append(btn);
    syncWandButtonVisibility();
}

jQuery(async () => {
    console.log(`[${extensionName}] กำลังโหลด...`);
    try {
        getSettings(); // เติมคีย์ที่ขาดหายก่อนวาด UI ใดๆ

        const settingsHtml = await $.get(`${extensionFolderPath}/settings.html`);
        $("#extensions_settings2").append(settingsHtml);
        bindSettingsHandlers();
        loadSettingsUi();

        mountWandButton();
        mountBadge(() => openPanel());
        applyBadgeVisibility();
        bindHighlightClicks((key) => revealEntry(key));

        // world-info.js: getWorldInfoPrompt() ยิง event นี้เฉพาะตอนไม่ dry-run และมีอย่างน้อย 1 entry
        // ที่ผ่าน budget/probability/recursion แล้วจริง — คือชุดที่ถูก "ส่งเข้าไปหาโมเดล" จริงในเจนนั้น
        const ctx = getContext();

        function onReportUpdate(report) {
            updateBadge(report);
            applyHighlights(report); // ก่อน refreshPanelIfOpen() เสมอ — แผงต้องรู้ว่า entry ไหนไฮไลต์ไม่เจอบ้าง
            refreshPanelIfOpen();
        }

        onReportChange(onReportUpdate);
        onReportUpdate(getReport());

        // ST เรนเดอร์ .mes_text ใหม่ทั้งก้อนตอนเหตุการณ์พวกนี้ (ทับ <mark> ของเราทิ้ง) — ต้องวาดไฮไลต์ซ้ำทุกครั้ง
        // (ใช้ entry.mesIds ที่แช่แข็งไว้แล้วเสมอ ไม่คำนวณ mesIds ใหม่จาก ctx.chat ที่อาจยาวขึ้นแล้ว)
        const reapplyHighlights = () => {
            applyHighlights(getReport());
            refreshPanelIfOpen(); // เผื่อ "entry ไหนไฮไลต์ไม่เจอ" เปลี่ยนไปหลังข้อความถูกเรนเดอร์ใหม่
        };
        eventSource.on(event_types.CHARACTER_MESSAGE_RENDERED, reapplyHighlights);
        eventSource.on(event_types.USER_MESSAGE_RENDERED, reapplyHighlights);
        eventSource.on(event_types.MESSAGE_SWIPED, reapplyHighlights);
        eventSource.on(event_types.MESSAGE_UPDATED, reapplyHighlights);
        eventSource.on(event_types.MORE_MESSAGES_LOADED, reapplyHighlights);
        $(document).on("wii:settings-changed", reapplyHighlights);

        eventSource.on(event_types.GENERATION_STARTED, (_type, _options, dryRun) => {
            if (!getSetting("enabled")) return;
            beginGeneration(dryRun);
        });
        eventSource.on(event_types.WORLD_INFO_ACTIVATED, (entries) => {
            if (!getSetting("enabled")) return;
            recordActivation(ctx, entries);
        });
        eventSource.on(event_types.GENERATION_ENDED, () => {
            if (!getSetting("enabled")) return;
            finalizeIfPending();
        });
        eventSource.on(event_types.GENERATION_STOPPED, () => {
            if (!getSetting("enabled")) return;
            finalizeIfPending();
        });
        eventSource.on(event_types.CHAT_CHANGED, () => {
            resetReport();
        });

        console.log(`[${extensionName}] ✅ โหลดสำเร็จ`);
    } catch (error) {
        console.error(`[${extensionName}] ❌ โหลดไม่สำเร็จ:`, error);
        toastr.error("โหลด WI Inspector ไม่สำเร็จ (ดู console)", extensionName);
    }
});
