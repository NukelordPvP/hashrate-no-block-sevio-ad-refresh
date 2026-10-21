// ==UserScript==
// @name         Hashrate.no - Sevio Ad & Popup Blocker
// @namespace    https://hashrate.no/
// @version      5.0
// @description  Blocks the Sevio ad loader, dynamic Sevio ad containers, and common popup methods on Hashrate.no.
// @match        https://hashrate.no/*
// @match        https://www.hashrate.no/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(() => {
    'use strict';

    const BLOCKED_SCRIPT = /cdn\.adx\.ws\/scripts\/loader\.js/i;
    const SEVIO_SELECTOR = [
        '.sevioads',
        '[id^="wrapper-sevio-"]'
    ].join(',');

    // Block common script-driven popup methods.
    window.open = function () {
        console.warn('[Hashrate blocker] Blocked window.open()', ...arguments);
        return null;
    };

    window.alert = function () {
        console.warn('[Hashrate blocker] Blocked alert()');
    };

    window.confirm = function () {
        console.warn('[Hashrate blocker] Blocked confirm()');
        return false;
    };

    window.prompt = function () {
        console.warn('[Hashrate blocker] Blocked prompt()');
        return null;
    };

    // Stop the known external ad loader from being inserted.
    const originalAppendChild = Node.prototype.appendChild;
    Node.prototype.appendChild = function (node) {
        if (
            node instanceof HTMLScriptElement &&
            node.src &&
            BLOCKED_SCRIPT.test(node.src)
        ) {
            console.warn('[Hashrate blocker] Blocked Sevio loader:', node.src);
            return node;
        }

        return originalAppendChild.call(this, node);
    };

    const originalInsertBefore = Node.prototype.insertBefore;
    Node.prototype.insertBefore = function (node, referenceNode) {
        if (
            node instanceof HTMLScriptElement &&
            node.src &&
            BLOCKED_SCRIPT.test(node.src)
        ) {
            console.warn('[Hashrate blocker] Blocked Sevio loader:', node.src);
            return node;
        }

        return originalInsertBefore.call(this, node, referenceNode);
    };

    // Remove ad containers, including ones added after page load.
    function removeSevioAds(root = document) {
        if (root.nodeType !== Node.ELEMENT_NODE &&
            root.nodeType !== Node.DOCUMENT_NODE) {
            return;
            }

            if (root instanceof Element && root.matches(SEVIO_SELECTOR)) {
                root.remove();
                return;
            }

            root.querySelectorAll?.(SEVIO_SELECTOR).forEach(element => {
                element.remove();
            });
    }

    // Watch for dynamically generated Sevio containers.
    const observer = new MutationObserver(mutations => {
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                removeSevioAds(node);
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

        removeSevioAds(document);
    }

    startObserver();

    // Remove any already-present Sevio containers once the page is ready.
    document.addEventListener('DOMContentLoaded', () => {
        removeSevioAds(document);
    }, { once: true });

    console.info('[Hashrate blocker] Active on', location.hostname);
})();
