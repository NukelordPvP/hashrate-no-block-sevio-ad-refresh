// ==UserScript==
// @name         Hashrate.no - Hard Popup Blacklist
// @namespace    https://hashrate.no/
// @version      4.1
// @description  Block popups, dialogs, error-report modals, and the idc0_350 class
// @match        https://hashrate.no/*
// @match        https://www.hashrate.no/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const PREFIX = '[Hashrate Popup Blacklist]';
    const BLOCKED_CLASS = 'idc0_350';

    function log(message, details = '') {
        console.warn(PREFIX, message, details);
    }

    // 1. Suppress JavaScript dialogs
    window.alert = function (message) {
        log('Blocked alert:', message);
    };

    window.confirm = function (message) {
        log('Blocked confirm:', message);
        return false;
    };

    window.prompt = function (message) {
        log('Blocked prompt:', message);
        return null;
    };

    // 2. Block window.open()
    window.open = function (url) {
        log('Blocked window.open():', url || '(no URL)');
        return null;
    };

    // 3. Remove the unwanted class without hiding the whole page
    function removeBlockedClass(element) {
        if (!(element instanceof Element)) return;

        if (element.classList.contains(BLOCKED_CLASS)) {
            element.classList.remove(BLOCKED_CLASS);
            log('Removed class:', BLOCKED_CLASS);
        }

        element.querySelectorAll?.('.' + BLOCKED_CLASS).forEach(child => {
            child.classList.remove(BLOCKED_CLASS);
            log('Removed class:', BLOCKED_CLASS);
        });
    }

    // 4. Remove the known error-report iframe
    function isBlockedURL(url) {
        if (!url) return false;

        try {
            const parsed = new URL(url, location.href);

            return parsed.hostname === 'report.error-report.com' &&
            parsed.pathname === '/modal';
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
            return;
        }

        element.querySelectorAll?.('iframe[src]').forEach(frame => {
            if (isBlockedURL(frame.getAttribute('src'))) {
                log('Removed error-report iframe:', frame.src);
                frame.remove();
            }
        });
    }

    function cleanElement(element) {
        removeBlockedClass(element);
        removeBlockedFrame(element);
    }

    function startObserver() {
        if (!document.documentElement) {
            requestAnimationFrame(startObserver);
            return;
        }

        // Clean existing elements
        cleanElement(document.documentElement);

        document.querySelectorAll('*').forEach(cleanElement);

        // Watch for new elements and the class being added again
        const observer = new MutationObserver(mutations => {
            for (const mutation of mutations) {
                if (mutation.type === 'attributes') {
                    cleanElement(mutation.target);
                    continue;
                }

                for (const node of mutation.addedNodes) {
                    if (node instanceof Element) {
                        cleanElement(node);
                    }
                }
            }
        });

        observer.observe(document.documentElement, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class']
        });

        log('Popup blacklist active');
    }

    startObserver();
})();
