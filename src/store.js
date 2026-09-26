import { extension_settings } from "../../../../extensions.js";
import { saveSettingsDebounced } from "../../../../../script.js";

export const extensionName = "wi-inspector";
export const extensionFolderPath = `scripts/extensions/third-party/${extensionName}`;

export const defaultSettings = {
    enabled: true,             // สวิตช์หลัก — ปิดแล้วเงียบสนิท (ไม่ฟัง event, ไม่มีแบดจ์/ปุ่มไม้กายสิทธิ์)
    showBadge: true,           // แบดจ์ลอยมุมจอ — ปิดได้แยกจากสวิตช์หลัก ถ้าอยากเปิดจากปุ่มไม้กายสิทธิ์เท่านั้น
    highlightMessages: true,   // ไฮไลต์คำที่ trigger world info ตรงในบับเบิลข้อความจริง
};

export function getSettings() {
    extension_settings[extensionName] = extension_settings[extensionName] || {};
    const s = extension_settings[extensionName];
    for (const k of Object.keys(defaultSettings)) {
        if (s[k] === undefined) s[k] = structuredClone(defaultSettings[k]);
    }
    return s;
}

export const getSetting = (k) => getSettings()[k];

export function setSetting(k, v) {
    getSettings()[k] = v;
    saveSettingsDebounced();
}
