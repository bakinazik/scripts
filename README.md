<p align="center">
  <a href="https://bakinazik.github.io/scripts/"><img src="https://github.com/bakinazik/scripts/blob/main/generator/assets/android-chrome-192x192.png?raw=true" alt="Scripts Logo" width="128" /></a>
</p>

<h1 align="center">Scripts</h1>

<p align="center">
  <strong>A collection of userscripts for customizing and improving the web.</strong>
</p>

<p align="center">
  <a href="https://bakinazik.github.io/scripts/"><img src="https://img.shields.io/badge/home%20page-website-ffffff?style=flat-square" alt="website"></a>&nbsp;&nbsp;<a href="https://buymeacoffee.com/bakinazik"><img src="https://img.shields.io/badge/buy%20me%20a%20coffee-support-orange.svg" alt="buy me a coffee"></a>
</p>

<p align="center">
  <a href="https://bakinazik.github.io/scripts/"><img src="https://raw.githubusercontent.com/bakinazik/scripts/0778c0b521d771be511b6829769cc609316c02b0/generator/assets/screenshot.webp" alt="Scripts Screenshot"></a>
</p>

<details>
<summary>About Scripts</summary>

Scripts is an open wiki for userscripts built on top of Git.

* **Open & Transparent:** Every script is checked prior to inclusion and open for public review.
* **Community-Driven:** Anyone can contribute bug fixes, new features, website updates, or metadata improvements.
* **Collaborative Ownership:** The original author creates the initial implementation, but scripts are maintained and improved collectively over time.

</details>

<details>
<summary>Repository Structure</summary>

Scripts are organized by the username of the original publisher:

```text
scripts/<username>/<name>.user.js
scripts/<username>/<name>.user.css
```

This structure automatically creates dedicated pages:

* **Profile:** `/u/<username>`
* **Script Detail:** `/u/<username>/<name>`

Files placed directly inside `scripts/` root are ignored by the build system.

</details>

<details>
<summary>Installation</summary>

1. Install a userscript manager such as [Tampermonkey](https://www.tampermonkey.net/) or [Violentmonkey](https://violentmonkey.github.io/).
2. Browse the scripts on the website and click **Install**.
3. Review the source code in your userscript manager before accepting it.

</details>

<details>
<summary>Publishing a Script</summary>

Add your script under your username directory:

```text
scripts/<your-username>/<name>.user.js
```

Ensure the metadata header points to the raw file:

```javascript
// @updateURL    https://raw.githubusercontent.com/<repo>/main/scripts/<username>/<name>.user.js
// @downloadURL  https://raw.githubusercontent.com/<repo>/main/scripts/<username>/<name>.user.js
```

Metadata should accurately describe the script's behavior and requested permissions.

Userstyles use `scripts/<your-username>/<name>.user.css` with a `/* ==UserStyle== ... ==/UserStyle== */` header (`@name`, `@version`, `@description`, `@author`, `@updateURL`) and `@-moz-document domain(...)` rules, and are installed with [Stylus](https://add0n.com/stylus.html).

</details>

<details>
<summary>Improving Existing Scripts</summary>

You can propose changes to any existing script:

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

Every script contribution and update goes through a pull request review.

Users and maintainers can inspect source code, network requests, and requested permissions at any time.

If you find a bug, broken functionality, or unnecessary permission request, open an issue or submit a pull request with a fix.

</details>

### License

This project is licensed under the [GNU General Public License v3.0 (GPL-3.0)](LICENSE).
