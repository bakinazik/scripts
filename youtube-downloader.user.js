// ==UserScript==
// @name         YouTube, Video Dönüştürücü
// @description  Videoların açıklama kısmına indirme butonları ekler
// @author       bakinazik
// @homepageURL  https://github.com/bakinazik/scripts/
// @supportURL   https://github.com/bakinazik/scripts/issues
// @match        https://www.youtube.com/*
// @match        https://m.youtube.com/*
// @match        https://www.youtube.com/watch*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=youtube.com
// @grant        none
// @inject-into  page
// @license      GPL
// @run-at       document-end
// @version      2.0.0
// ==/UserScript==

const mp3ButtonText = " Müzik";
const mp4ButtonText = " Video";
function mp3() { window.open(`https://yt1s.com/en244/youtube-to-mp3?q=${ window.location.href }`); }
function mp4() { window.open(`https://yt1s.com/en246?q=${ window.location.href }`); }


const cssText = `
    .download-button {
        flex-direction: row;
        cursor: pointer;
        background-color: var(--yt-spec-badge-chip-background);
        color: var(--yt-spec-text-primary);
        border-radius: 20px;
        padding: var(--yt-button-padding);
        margin: 0;
        white-space: nowrap;
        font-size: var(--ytd-tab-system-font-size);
        font-weight: var(--ytd-tab-system-font-weight);
        letter-spacing: var(--ytd-tab-system-letter-spacing);
        text-transform: var(--yt-spec-text-primary);
        display: flex;
        align-items: center;
        justify-content: center;
        height: 16px;
        width: 100%;
    }

    html[dark] div.download-button:nth-of-type(1) .download-button-text::before{
      content: url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGNsYXNzPSJpY29uIGljb24tdGFibGVyIGljb24tdGFibGVyLW11c2ljIiB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgc3Ryb2tlLXdpZHRoPSIxIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgZmlsbD0ibm9uZSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBzdHJva2U9Im5vbmUiIGQ9Ik0wIDBoMjR2MjRIMHoiIGZpbGw9Im5vbmUiPjwvcGF0aD48cGF0aCBkPSJNNiAxN20tMyAwYTMgMyAwIDEgMCA2IDBhMyAzIDAgMSAwIC02IDAiPjwvcGF0aD48cGF0aCBkPSJNMTYgMTdtLTMgMGEzIDMgMCAxIDAgNiAwYTMgMyAwIDEgMCAtNiAwIj48L3BhdGg+PHBhdGggZD0iTTkgMTdsMCAtMTNsMTAgMGwwIDEzIj48L3BhdGg+PHBhdGggZD0iTTkgOGwxMCAwIj48L3BhdGg+PC9zdmc+);
      width:24px;
      height:24px;
      line-height:1;
      filter: invert(1);
      padding-right: 5px;
    }

    html[dark] div.download-button:nth-of-type(2) .download-button-text::before{
      content: url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGNsYXNzPSJpY29uIGljb24tdGFibGVyIGljb24tdGFibGVyLXZpZGVvIiB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgc3Ryb2tlLXdpZHRoPSIxIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgZmlsbD0ibm9uZSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBzdHJva2U9Im5vbmUiIGQ9Ik0wIDBoMjR2MjRIMHoiIGZpbGw9Im5vbmUiPjwvcGF0aD48cGF0aCBkPSJNMTUgMTBsNC41NTMgLTIuMjc2YTEgMSAwIDAgMSAxLjQ0NyAuODk0djYuNzY0YTEgMSAwIDAgMSAtMS40NDcgLjg5NGwtNC41NTMgLTIuMjc2di00eiI+PC9wYXRoPjxwYXRoIGQ9Ik0zIDZtMCAyYTIgMiAwIDAgMSAyIC0yaDhhMiAyIDAgMCAxIDIgMnY4YTIgMiAwIDAgMSAtMiAyaC04YTIgMiAwIDAgMSAtMiAtMnoiPjwvcGF0aD48L3N2Zz4=);
      width:24px;
      height:24px;
      line-height:1;
      filter: invert(1);
      padding-right: 5px;
    }

    div.download-button:nth-of-type(1) .download-button-text::before{
      content: url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGNsYXNzPSJpY29uIGljb24tdGFibGVyIGljb24tdGFibGVyLW11c2ljIiB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgc3Ryb2tlLXdpZHRoPSIxIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgZmlsbD0ibm9uZSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBzdHJva2U9Im5vbmUiIGQ9Ik0wIDBoMjR2MjRIMHoiIGZpbGw9Im5vbmUiPjwvcGF0aD48cGF0aCBkPSJNNiAxN20tMyAwYTMgMyAwIDEgMCA2IDBhMyAzIDAgMSAwIC02IDAiPjwvcGF0aD48cGF0aCBkPSJNMTYgMTdtLTMgMGEzIDMgMCAxIDAgNiAwYTMgMyAwIDEgMCAtNiAwIj48L3BhdGg+PHBhdGggZD0iTTkgMTdsMCAtMTNsMTAgMGwwIDEzIj48L3BhdGg+PHBhdGggZD0iTTkgOGwxMCAwIj48L3BhdGg+PC9zdmc+);
      width:24px;
      height:24px;
      line-height:1;
      padding-right: 5px;
    }

    div.download-button:nth-of-type(2) .download-button-text::before{
      content: url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGNsYXNzPSJpY29uIGljb24tdGFibGVyIGljb24tdGFibGVyLXZpZGVvIiB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgc3Ryb2tlLXdpZHRoPSIxIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgZmlsbD0ibm9uZSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBzdHJva2U9Im5vbmUiIGQ9Ik0wIDBoMjR2MjRIMHoiIGZpbGw9Im5vbmUiPjwvcGF0aD48cGF0aCBkPSJNMTUgMTBsNC41NTMgLTIuMjc2YTEgMSAwIDAgMSAxLjQ0NyAuODk0djYuNzY0YTEgMSAwIDAgMSAtMS40NDcgLjg5NGwtNC41NTMgLTIuMjc2di00eiI+PC9wYXRoPjxwYXRoIGQ9Ik0zIDZtMCAyYTIgMiAwIDAgMSAyIC0yaDhhMiAyIDAgMCAxIDIgMnY4YTIgMiAwIDAgMSAtMiAyaC04YTIgMiAwIDAgMSAtMiAtMnoiPjwvcGF0aD48L3N2Zz4=);
      width:24px;
      height:24px;
      line-height:1;
      padding-right: 5px;
    }

    .download-button:hover {
        background-color: var(--yt-spec-mono-tonal-hover);
    }

    .download-button-text {
        --yt-formatted-string-deemphasize_-_display: initial;
        --yt-formatted-string-deemphasize-color: var(--yt-spec-text-secondary);
        --yt-formatted-string-deemphasize_-_margin-left: 4px;
        text-align: center;
        align-items: center;
        justify-content: center;
        display: flex;
    }

  .download-button-container {
    display: flex;
    flex-direction: row;
    gap: 10px;
    padding-right: 10px;
    position: absolute;
    right: -10px;
    top: 0px;
  }

  #above-the-fold {
    margin-top: 20px;
  }

  ytd-watch-metadata[title-headline-xs] h1.ytd-watch-metadata {
    top: 0px;
    position: absolute;
  }

  #top-row.ytd-watch-metadata {
    padding-top: 30px;
  }

`;



(function() {
    'use strict';
    window.onload = () => {
        window.addEventListener("yt-navigate-finish", () => {
            setTimeout(() => {
                const style = document.createElement("style");
                style.type = "text/css";
                style.innerHTML = cssText;
                document.head.appendChild(style);
                document.querySelectorAll("#bottom-row:not(.download-panel)").forEach(panel => {
                    panel.classList.add("download-panel");
                    const buttonMP4 = document.createElement("div");
                    buttonMP4.classList.add("download-button");
                    buttonMP4.addEventListener("click", mp4);
                    const textMP4 = document.createElement("span");
                    textMP4.classList.add("download-button-text");
                    textMP4.innerHTML = mp4ButtonText;
                    buttonMP4.appendChild(textMP4);
                    const buttonMP3 = document.createElement("div");
                    buttonMP3.classList.add("download-button");
                    buttonMP3.addEventListener("click", mp3);
                    const textMP3 = document.createElement("span");
                    textMP3.classList.add("download-button-text");
                    textMP3.innerHTML = mp3ButtonText;
                    buttonMP3.appendChild(textMP3);
                    const container = document.createElement("div");
                    container.classList.add("download-button-container");
                    container.appendChild(buttonMP3);
                    container.appendChild(buttonMP4);
                    panel.insertBefore(container, panel.firstElementChild);
                });
            }, 200);
        });
    };
})();
