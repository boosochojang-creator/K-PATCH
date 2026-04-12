# AGENTS.md

## Cursor Cloud specific instructions

### Project Overview
K-PATCH 2.0 is a static front-end-only web application (vanilla HTML/CSS/JS, no framework, no build system, no package manager). The actual application code lives on feature branches — `main` only contains `README.md`.

### Running the Application
Serve files with any static HTTP server. For example:
```
python3 -m http.server 8080
```
Then open `http://localhost:8080` in a browser. The app requires HTTP (not `file://`) for YouTube embeds and CDN resources.

### Key Caveats
- **No build step, no linting, no automated tests.** There is no `package.json`, no test framework, and no linter configured in this repository.
- **Feature branches contain the app code.** The `main` branch is effectively empty. Check out a feature branch (e.g. `origin/cursor/k-patch-2-final-d87d`) to access `index.html`, `app.js`, and `styles.css`.
- **External CDN dependencies** (YouTube IFrame API, html2canvas, Unsplash, Mixkit audio) are loaded at runtime. Internet access is required for full functionality, but the quiz still works without the media assets.
