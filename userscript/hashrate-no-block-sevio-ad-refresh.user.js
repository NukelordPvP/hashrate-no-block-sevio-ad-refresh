// ==UserScript==
// @name         Hashrate.no - Block Sevio Ad Refresh
// @namespace    https://hashrate.no/
// @version      3.0
// @description  Blocks Hashrate.no Sevio ad scheduling and error-report modals without interfering with normal site functions
// @match        https://hashrate.no/*
// @match        https://www.hashrate.no/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const PREFIX = '[Hashrate Ad Blocker]';

    function log(message, data = '') {
        console.warn(
            `${PREFIX} ${new Date().toLocaleTimeString()} ${message}`,
                     data
        );
    }


    // =========================================================
    // 1. BLOCK report.error-report.com/modal
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
            element instanceof Element &&
            element.src &&
            isErrorReportURL(element.src)
        ) {
            log(
                'BLOCKED error-report modal',
                element.src
            );

            element.remove();

            return true;
        }

        return false;
    }


    const observer =
    new MutationObserver(mutations => {

        for (const mutation of mutations) {

            for (const node of mutation.addedNodes) {

                if (!(node instanceof Element)) {
                    continue;
                }

                if (removeErrorReport(node)) {
                    continue;
                }

                for (
                    const element
                    of node.querySelectorAll?.('[src]') || []
                ) {
                    removeErrorReport(element);
                }
            }
        }
    });


    function startObserver() {

        if (!document.documentElement) {
            requestAnimationFrame(startObserver);
            return;
        }

        observer.observe(
            document.documentElement,
            {
                childList: true,
                subtree: true
            }
        );
    }


    startObserver();


    // =========================================================
    // 2. INTERCEPT window.sevioads
    //
    // Hashrate.no uses:
    //
    //     window.sevioads.push(...)
    //
    // to queue its banner ads.
    //
    // We allow the rest of the page to function normally and
    // only reject entries that are part of the Sevio ad queue.
    // =========================================================

    function isSevioAdEntry(entry) {

        if (!entry) {
            return false;
        }

        /*
         * The site's ad entries contain fields such as:
         *
         * zone
         * adType
         * inventoryId
         * accountId
         */

        if (
            typeof entry !== 'object'
        ) {
            return false;
        }

        const value =
        Array.isArray(entry)
        ? entry
        : [entry];

        return value.some(item => {

            if (
                !item ||
                typeof item !== 'object'
            ) {
                return false;
            }

            return (
                item.adType === 'banner' ||
                'inventoryId' in item ||
                'accountId' in item
            );
        });
    }


    function filterSevioQueue(args) {

        let blocked = false;

        const filtered = args.filter(arg => {

            if (isSevioAdEntry(arg)) {

                blocked = true;

                log(
                    'BLOCKED Sevio ad queue entry',
                    arg
                );

                return false;
            }

            return true;
        });

        return {
            filtered,
            blocked
        };
    }


    function hookSevioArray(array) {

        if (
            !Array.isArray(array) ||
            array.__hashrateSevioHook
        ) {
            return false;
        }

        const originalPush =
        array.push;

        const hookedPush =
        function (...args) {

            const result =
            filterSevioQueue(args);

            if (result.blocked) {

                /*
                 * If everything in this push was an ad,
                 * don't pass anything to Sevio.
                 */

                if (
                    result.filtered.length === 0
                ) {
                    return array.length;
                }
            }

            return originalPush.apply(
                this,
                result.filtered
            );
        };


        try {

            Object.defineProperty(
                array,
                'push',
                {
                    configurable: true,
                    writable: true,
                    value: hookedPush
                }
            );

            Object.defineProperty(
                array,
                '__hashrateSevioHook',
                {
                    configurable: false,
                    enumerable: false,
                    value: true
                }
            );

            log(
                'Sevio ad queue intercepted'
            );

            return true;

        } catch (error) {

            log(
                'Failed to hook Sevio queue',
                error
            );

            return false;
        }
    }


    // =========================================================
    // 3. Handle the queue if Hashrate creates it later
    // =========================================================

    let hookedQueue = false;


    function tryHookSevio() {

        if (
            window.sevioads &&
            Array.isArray(window.sevioads)
        ) {

            if (
                hookSevioArray(
                    window.sevioads
                )
            ) {
                hookedQueue = true;
            }
        }
    }


    tryHookSevio();


    /*
     * Hashrate's code may create window.sevioads after this
     * userscript starts.
     *
     * Watch for that property without touching timers,
     * DOM APIs, fetch, XHR, navigation, etc.
     */

    try {

        let currentValue =
        window.sevioads;

        Object.defineProperty(
            window,
            'sevioads',
            {
                configurable: true,
                enumerable: true,

                get() {
                    return currentValue;
                },

                set(value) {

                    currentValue = value;

                    log(
                        'Hashrate created window.sevioads'
                    );

                    if (
                        Array.isArray(value)
                    ) {
                        hookSevioArray(value);
                    }
                }
            }
        );

    } catch (error) {

        log(
            'Could not install sevioads property hook',
            error
        );
    }


    // =========================================================
    // 4. Periodic fallback
    //
    // Only checks whether the Sevio array appeared.
    // Does NOT modify setTimeout/setInterval.
    // =========================================================

    const checker =
    setInterval(() => {

        if (!hookedQueue) {
            tryHookSevio();
        }

        if (
            window.sevioads?.__hashrateSevioHook
        ) {
            hookedQueue = true;
        }

    }, 250);


    setTimeout(() => {
        clearInterval(checker);
    }, 30000);


    // =========================================================
    // 5. Remove error-report resources already on the page
    // =========================================================

    function cleanup() {

        document
        .querySelectorAll('[src]')
        .forEach(element => {
            removeErrorReport(element);
        });
    }


    if (
        document.readyState === 'loading'
    ) {

        document.addEventListener(
            'DOMContentLoaded',
            cleanup,
            { once: true }
        );

    } else {

        cleanup();
    }


    log(
        'Hashrate.no ad blocker active'
    );

})();
