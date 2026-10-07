// ==UserScript==
// @name         Background Playback
// @author       bakinazik
// @namespace    https://github.com/bakinazik/scripts
// @version      1.0.0
// @description  Keep media playing in background.
// @updateURL    https://raw.githubusercontent.com/bakinazik/scripts/main/scripts/bakinazik/background-playback/background-playback.user.js
// @downloadURL  https://raw.githubusercontent.com/bakinazik/scripts/main/scripts/bakinazik/background-playback/background-playback.user.js
// @match        *://*/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(() => {
    'use strict';

    const override = (obj, prop, value) => {
        try {
            Object.defineProperty(obj, prop, {
                configurable: true,
                get: () => value
            });
        } catch {}
    };

    override(Document.prototype, "hidden", false);
    override(Document.prototype, "visibilityState", "visible");
    override(Document.prototype, "webkitHidden", false);
    override(Document.prototype, "webkitVisibilityState", "visible");

    Document.prototype.hasFocus = () => true;

    const stop = e => e.stopImmediatePropagation();

    [
        "visibilitychange",
        "webkitvisibilitychange",
        "freeze",
        "resume"
    ].forEach(type => {
        document.addEventListener(type, stop, true);
        window.addEventListener(type, stop, true);
    });

    const patchMedia = media => {
        if (media.__bgFixed) return;
        media.__bgFixed = true;

        const nativePause = media.pause.bind(media);
        const nativePlay = media.play.bind(media);

        media.pause = function () {
            this.__userPaused = true;
            return nativePause();
        };

        media.play = function (...args) {
            this.__userPaused = false;
            return nativePlay(...args);
        };

        document.addEventListener("visibilitychange", () => {
            if (!media.__userPaused && media.paused) {
                nativePlay().catch(() => {});
            }
        });
    };

    const scan = () => {
        document.querySelectorAll("video,audio").forEach(patchMedia);
    };

    new MutationObserver(scan).observe(document, {
        childList: true,
        subtree: true
    });

    scan();
})();