<p align="center">
  <a href="https://bakinazik.github.io/scripts/"><img src="https://github.com/bakinazik/scripts/blob/main/generator/assets/android-chrome-192x192.png?raw=true" alt="Scripts Logo" width="128" /></a>
</p>

<h1 align="center">Scripts</h1>

<p align="center">
  <strong>A collection of userscripts and userstyles for customizing and improving the web.</strong>
</p>

<p align="center">
  <a href="https://bakinazik.github.io/scripts/"><img src="https://img.shields.io/badge/home%20page-website-ffffff?style=flat-square" alt="website"></a>&nbsp;&nbsp;<a href="https://buymeacoffee.com/bakinazik"><img src="https://img.shields.io/badge/buy%20me%20a%20coffee-support-orange.svg" alt="buy me a coffee"></a>
</p>

<details>
<summary>About Scripts</summary>

Scripts is an open wiki for userscripts and userstyles built on top of Git.

* **Open & Transparent:** Every script and style is checked prior to inclusion and open for public review.
* **Community-Driven:** Anyone can contribute bug fixes, new features, website updates, or metadata improvements.
* **Collaborative Ownership:** The original author creates the initial implementation, but scripts and styles are maintained and improved collectively over time.

</details>

<details>
<summary>Repository Structure</summary>

Each script or style lives in its own folder under `scripts/`:

```text
scripts/<name>/<name>.user.js
scripts/<name>/<name>.user.css
scripts/<name>/*.png | *.jpg | *.jpeg | *.webp | *.gif | *.avif
```

The file must be named after the folder. Any images in the same folder are detected automatically and shown as screenshots (the first one on the card, all of them on the detail page).

Every script or style gets a detail page at `/<name>`. Names that collide with site routes (`about`, `saved`, `search`, `scripts`) are rejected by the build.

Files placed directly inside the `scripts/` root are ignored by the build system.

</details>

<details>
<summary>Installation</summary>

1. Install a userscript manager such as [Tampermonkey](https://www.tampermonkey.net/) or [Violentmonkey](https://violentmonkey.github.io/) for scripts, and [Stylus](https://add0n.com/stylus.html) for styles.
2. Browse the website and click **Install** on the script or style you want.
3. Review the source code in your extension before accepting it.

</details>

<details>
<summary>Publishing a Script or Style</summary>

Add your file in its own folder:

```text
scripts/<name>/<name>.user.js
scripts/<name>/<name>.user.css
```

**Userscripts** must point the metadata header to the raw file:

```javascript
// @updateURL    https://raw.githubusercontent.com/<repo>/main/scripts/<name>/<name>.user.js
// @downloadURL  https://raw.githubusercontent.com/<repo>/main/scripts/<name>/<name>.user.js
```

**Userstyles** use a `/* ==UserStyle== ... ==/UserStyle== */` header and `@-moz-document` rules, and are installed with [Stylus](https://add0n.com/stylus.html):

```css
/* ==UserStyle==
@name         Example Style
@author       Scripts
@namespace    https://github.com/<repo>
@version      1.0.0
@description  What the style changes.
@updateURL    https://raw.githubusercontent.com/<repo>/main/scripts/<name>/<name>.user.css
@downloadURL  https://raw.githubusercontent.com/<repo>/main/scripts/<name>/<name>.user.css
==/UserStyle== */
```

Metadata should accurately describe the behavior of the script or style and, for scripts, the requested permissions.

</details>

<details>
<summary>Improving Existing Scripts & Styles</summary>

You can propose changes to any existing script or style:

1. Fork the repository.
2. Make your changes.
3. Open a Pull Request explaining your changes.

Bug fixes, compatibility updates, refactoring, and metadata improvements are all welcome.

</details>

<details>
<summary>Localization & Pages</summary>

Translations and page content are structured by language code:

```text
language/
  en/
    general.json
    about.html
    404.html
  tr/
    general.json
    about.html
    404.html
```

`en` serves as the primary source language and fallback.

Custom pages can be added under `language/en/<name>.html`. They are automatically rendered at `/<name>` and added to the sitemap.

Supported dynamic placeholders:

* `{repo_url}`
* `{owner}`
* `{owner_url}`

Custom page HTML rejects:

* `<script>` elements
* `<iframe>` elements
* Inline event attributes
* `javascript:` URIs

</details>

<details>
<summary>Code Quality & Safety</summary>

Every script and style contribution and update goes through a pull request review.

Users and maintainers can inspect source code and, for scripts, network requests and requested permissions at any time.

If you find a bug, broken functionality, or an unnecessary permission request, open an issue or submit a pull request with a fix.

</details>

### License

This project is licensed under the [GNU General Public License v3.0 (GPL-3.0)](LICENSE).
