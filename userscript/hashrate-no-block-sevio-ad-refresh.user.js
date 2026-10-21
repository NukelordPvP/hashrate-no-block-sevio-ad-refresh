// ==UserScript==
// @name         Hashrate.no - Ad & Popup Blocker
// @namespace    https://hashrate.no/
// @version      6.0
// @description  Blocks identified ad scripts, Sevio ads, and unwanted popups on Hashrate.no
// @match        https://hashrate.no/*
// @match        https://www.hashrate.no/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(() => {
    "use strict";

    const LOG = "[Hashrate blocker]";

    // Domains observed in the browser console.
    const BLOCKED_HOSTS = [
        "cdn.adx.ws",
        "html-load.com",
        "rule.evenyippee.com"
    ];

    function isBlockedUrl(url) {
        if (!url || typeof url !== "string") return false;

        try {
            const parsed = new URL(url, location.href);
            return BLOCKED_HOSTS.some(host =>
            parsed.hostname === host ||
            parsed.hostname.endsWith("." + host)
            );
        } catch {
            return false;
        }
    }

    function shouldBlockScript(node) {
        return node instanceof HTMLScriptElement &&
        isBlockedUrl(node.src || node.getAttribute("src") || "");
    }

    // Block known external scripts before insertion.
    const originalAppendChild = Node.prototype.appendChild;
    Node.prototype.appendChild = function (node) {
        if (shouldBlockScript(node)) {
            console.warn(LOG, "Blocked script:", node.src);
            return node;
        }
        return originalAppendChild.call(this, node);
    };

    const originalInsertBefore = Node.prototype.insertBefore;
    Node.prototype.insertBefore = function (node, referenceNode) {
        if (shouldBlockScript(node)) {
            console.warn(LOG, "Blocked script:", node.src);
            return node;
        }
        return originalInsertBefore.call(this, node, referenceNode);
    };

    // Block window.open popups.
    try {
        window.open = function (url) {
            console.warn(LOG, "Blocked window.open:", url || "(no URL)");
            return null;
        };
    } catch (error) {
        console.warn(LOG, "Could not override window.open:", error);
    }

    // Prevent basic browser dialogs from interrupting browsing.
    for (const method of ["alert", "confirm", "prompt"]) {
        try {
            window[method] = () => method === "confirm" ? false : null;
        } catch {}
    }

    // Remove Sevio ad wrappers without deleting the main page content.
    function removeAds(root = document) {
        if (!root || typeof root.querySelectorAll !== "function") return;

        if (
            root instanceof Element &&
            (root.matches(".sevioads, [id^='wrapper-sevio-']"))
        ) {
            root.remove();
            return;
        }

        root.querySelectorAll(
            ".sevioads, [id^='wrapper-sevio-']"
        ).forEach(element => element.remove());
    }

    // Watch for ad containers injected after initial page load.
    function startObserver() {
        if (!document.documentElement) {
            requestAnimationFrame(startObserver);
            return;
        }

        removeAds();

        const observer = new MutationObserver(records => {
            for (const record of records) {
                for (const node of record.addedNodes) {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        removeAds(node);
                    }
                }
            }
        });

        observer.observe(document.documentElement, {
            childList: true,
            subtree: true
        });
    }

    startObserver();

    console.info(LOG, "Active on", location.hostname);
})();
