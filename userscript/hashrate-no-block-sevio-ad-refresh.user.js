
// ==UserScript==
// @name         Hashrate.no - Sevio Popup Fix
// @namespace    https://hashrate.no/
// @version      3.1
// @description  Safely remove the Error Report popup without hooking site JavaScript
// @match        https://hashrate.no/*
// @match        https://www.hashrate.no/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const TARGET_HOST = 'report.error-report.com';
    const TARGET_PATH = '/modal';

    function isTarget(element) {
        if (!(element instanceof Element)) return false;

        const url = element.getAttribute('src');
        if (!url) return false;

        try {
            const parsed = new URL(url, location.href);
            return parsed.hostname === TARGET_HOST &&
            parsed.pathname === TARGET_PATH;
        } catch {
            return false;
        }
    }

    function removePopup() {
        document.querySelectorAll('iframe[src]').forEach(frame => {
            if (!isTarget(frame)) return;

            console.warn('[Hashrate Popup Fix] Removing error-report iframe');

            // Remove only the iframe. Do not remove arbitrary site containers.
            frame.remove();
        });
    }

    const observer = new MutationObserver(() => removePopup());

    function start() {
        if (!document.documentElement) {
            requestAnimationFrame(start);
            return;
        }

        observer.observe(document.documentElement, {
            childList: true,
            subtree: true
        });

        removePopup();
    }

    start();
})();
