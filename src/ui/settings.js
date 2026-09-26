import { getSetting, setSetting } from "../store.js";
import { applyBadgeVisibility } from "./badge.js";
import { closePanel } from "./panel.js";

export const WAND_BUTTON_ID = "wii-menu-button";

export function loadSettingsUi() {
    $("#wii-enabled").prop("checked", getSetting("enabled"));
    $("#wii-show-badge").prop("checked", getSetting("showBadge"));
}

export function syncWandButtonVisibility() {
    $(`#${WAND_BUTTON_ID}`).toggle(Boolean(getSetting("enabled")));
    applyBadgeVisibility();
}

export function bindSettingsHandlers() {
    $(document).on("input", "#wii-enabled", function () {
        const enabled = Boolean($(this).prop("checked"));
        setSetting("enabled", enabled);
        if (!enabled) closePanel();
        syncWandButtonVisibility();
    });
    $(document).on("input", "#wii-show-badge", function () {
        setSetting("showBadge", Boolean($(this).prop("checked")));
        applyBadgeVisibility();
    });
}
