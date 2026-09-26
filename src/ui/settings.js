import { getSetting, setSetting } from "../store.js";
import { applyBadgeVisibility } from "./badge.js";
import { closePanel } from "./panel.js";

export const WAND_BUTTON_ID = "wii-menu-button";

export function loadSettingsUi() {
    $("#wii-enabled").prop("checked", getSetting("enabled"));
    $("#wii-show-badge").prop("checked", getSetting("showBadge"));
    $("#wii-highlight-messages").prop("checked", getSetting("highlightMessages"));
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
        $(document).trigger("wii:settings-changed");
    });
    $(document).on("input", "#wii-show-badge", function () {
        setSetting("showBadge", Boolean($(this).prop("checked")));
        applyBadgeVisibility();
    });
    $(document).on("input", "#wii-highlight-messages", function () {
        setSetting("highlightMessages", Boolean($(this).prop("checked")));
        $(document).trigger("wii:settings-changed");
    });
}
