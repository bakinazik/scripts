// ==UserScript==
// @name         Anti Video Pause
// @author       bakinazik
// @namespace    https://github.com/bakinazik/scripts
// @version      1.0.1
// @description  Prevent videos from pausing when switching tabs while preserving manual controls.
// @updateURL    https://raw.githubusercontent.com/bakinazik/scripts/main/scripts/bakinazik/anti-video-pause.user.js
// @downloadURL  https://raw.githubusercontent.com/bakinazik/scripts/main/scripts/bakinazik/anti-video-pause.user.js
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    try {
        Object.defineProperty(document, 'hidden', {
            get: () => false,
            configurable: true
        });

        Object.defineProperty(document, 'visibilityState', {
            get: () => 'visible',
            configurable: true
        });
    } catch {}

    const blocked = ['visibilitychange', 'webkitvisibilitychange', 'pagehide', 'blur', 'focusout'];
    const addEventListener = EventTarget.prototype.addEventListener;

    EventTarget.prototype.addEventListener = function(type, listener, options) {
        if (blocked.includes(type)) return;
        return addEventListener.call(this, type, listener, options);
    };
})();
