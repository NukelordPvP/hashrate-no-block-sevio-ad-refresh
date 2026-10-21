
// ==UserScript==
// @name         Hashrate.no - Hard Popup Blacklist
// @namespace    https://hashrate.no/
// @version      4.0
// @description  Block site-triggered dialogs, popups, and error-report modal
// @match        https://hashrate.no/*
// @match        https://www.hashrate.no/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const PREFIX = '[Hashrate Popup Blacklist]';

    function log(message, details = '') {
        console.warn(PREFIX, message, details);
    }

    // ---------------------------------------------------------
    // 1. Suppress JavaScript dialogs
    // ---------------------------------------------------------

    // Suppress alert() messages from the site.
    window.alert = function (message) {
        log('Blocked alert:', message);
    };

    // Automatically decline confirmation dialogs.
    window.confirm = function (message) {
        log('Blocked confirm:', message);
        return false;
    };

    // Cancel prompt dialogs.
    window.prompt = function (message) {
        log('Blocked prompt:', message);
        return null;
    };

    // ---------------------------------------------------------
    // 2. Block window.open() popup attempts
    // ---------------------------------------------------------

    window.open = function (url) {
        log('Blocked window.open():', url || '(no URL)');
        return null;
    };

    // ---------------------------------------------------------
    // 3. Remove the known error-report iframe
    // ---------------------------------------------------------

    function isBlockedURL(url) {
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

    function removeBlockedFrame(element) {
        if (!(element instanceof Element)) return;

        if (
            element.matches('iframe[src]') &&
            isBlockedURL(element.getAttribute('src'))
        ) {
            log('Removed error-report iframe:', element.src);
            element.remove();
        }

        element.querySelectorAll?.('iframe[src]').forEach(frame => {
            if (isBlockedURL(frame.getAttribute('src'))) {
                log('Removed error-report iframe:', frame.src);
                frame.remove();
            }
        });
    }

    function startObserver() {
        if (!document.documentElement) {
            requestAnimationFrame(startObserver);
            return;
        }

        const observer = new MutationObserver(mutations => {
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    removeBlockedFrame(node);
                }
            }
        });

        observer.observe(document.documentElement, {
            childList: true,
            subtree: true
        });

        removeBlockedFrame(document.documentElement);
    }

    startObserver();

    log('Popup blacklist active');
})();
