
// ==UserScript==
// @name         Hashrate.no - Block Sevio Ad Refresh
// @namespace    https://hashrate.no/
// @version      3.2
// @description  Suppress the Hashrate ad-warning alert and remove error-report modal iframes
// @match        https://hashrate.no/*
// @match        https://www.hashrate.no/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const PREFIX = '[Hashrate Ad Blocker]';

    function log(message, data) {
        console.warn(
            PREFIX,
            new Date().toLocaleTimeString(),
                     message,
                     data ?? ''
        );
    }

    // =========================================================
    // 1. Suppress the specific native ad-warning alert
    // =========================================================

    const originalAlert = window.alert;

    window.alert = function (message) {
        if (
            typeof message === 'string' &&
            /please allow ads on this site/i.test(message)
        ) {
            log('Suppressed ad-warning alert:', message);
            console.trace(PREFIX + ' Alert call stack');
            return;
        }

        return originalAlert.call(window, message);
    };

    // =========================================================
    // 2. Identify the Error Report modal iframe
    // =========================================================

    function isErrorReportURL(url) {
        if (!url) return false;

        try {
            const parsed = new URL(url, location.href);

            return (
                parsed.hostname === 'report.error-report.com' &&
                parsed.pathname === '/modal'
            );
        } catch {
            return false;
        }
    }

    function removeErrorReport(element) {
        if (
            !(element instanceof Element) ||
            !isErrorReportURL(element.getAttribute('src'))
        ) {
            return false;
        }

        log('Removing error-report iframe:', element.src);
        element.remove();

        return true;
    }

    function cleanup(root = document) {
        if (root instanceof Element) {
            removeErrorReport(root);
        }

        root.querySelectorAll?.('iframe[src]').forEach(
            removeErrorReport
        );
    }

    // =========================================================
    // 3. Watch for matching iframes being inserted
    // =========================================================

    const observer = new MutationObserver(mutations => {
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (node instanceof Element) {
                    cleanup(node);
                }
            }
        }
    });

    function startObserver() {
        if (!document.documentElement) {
            requestAnimationFrame(startObserver);
            return;
        }

        observer.observe(document.documentElement, {
            childList: true,
            subtree: true
        });

        cleanup();
    }

    startObserver();

    log('Version 3.2 active');
})();
