# Spice 🌶️

**Spice** is a beautiful, minimalist desktop client for **YouTube Music** and **SoundCloud**, built with Electron. It enhances your listening experience with powerful features like successful ad-blocking, Discord Rich Presence, Last.fm scrobbling, and a dedicated Lyrics window.

![Spice App](https://github.com/Anti-Depressants-Dev-Team/spice/raw/main/resources/preview.png)
*(Note: Add a screenshot to a `resources` folder in your repo for this image to show)*

## ✨ Features

*   **🚫 Ad-Free Experience**: Built-in ad-blocking for uninterupted listening on YouTube Music and SoundCloud.
*   **🎵 Service Support**: Seamlessly switch between YouTube Music, SoundCloud, and the local SPICE runtime.
*   **SPICE Launcher Mode**: The standard desktop app keeps the YouTube Music/SoundCloud wrapper and can launch or install the split SPICE local runtime when you choose Spice Music.
*   **SPICE Native Mode**: Separate Windows and Linux native builds bundle the platform-correct local runtime, check the hosted runtime manifest before startup, show a first-run account screen, and keep media work on the user's PC.
*   **🎮 Discord Rich Presence**: Show what you're listening to on your Discord profile with album art and track progress.
*   **📊 Scrobbling**: Automatic scrobbling to **Last.fm** and **ListenBrainz**.
*   **🎤 Synchronized Lyrics**:
    *   Dedicated floating lyrics window.
    *   **LRCLIB**: Time-synced, animated lyrics (Default).
    *   **Genius**: Fallback for text-based lyrics.
    *   **MusixMatch**: experimental support.
*   **🎨 Modern UI**:
    *   Frameless, dark-themed design that blends with the services.
    *   Custom title bar and window controls.
    *   "Mini-player" feel with a focus on content.

## 🚀 Installation

### Download
Grab the latest installer from the [Releases](https://github.com/Anti-Depressants-Dev-Team/spice/releases) page. Native Linux releases include AppImage, `.deb`, Fedora-compatible `.rpm`, and `.tar.gz` bundles.
AppImage builds use the in-app updater. Package-managed `.deb` and `.rpm` installs update by installing the matching package from a newer release.

### Build from Source

1.  **Clone the repository**
    ```bash
    git clone https://github.com/Anti-Depressants-Dev-Team/spice.git
    cd spice
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Run the app**
    ```bash
    npm start
    ```

4.  **Build Installer** (Windows)
    ```bash
    npm run dist
    ```

5.  **Build Native SPICE** (separate platform build)
    ```bash
    npm run dist:native:windows
    # or, on Linux
    npm run dist:native:linux
    ```
    This prepares `native-runtime/spice-local-windows` or `native-runtime/spice-local-linux` from a sibling backend checkout when available, or from the latest platform-specific SPICE runtime release, then bundles it into `Spice Native` under `dist-native`. Packaged native builds use Electron's bundled Node runtime, so users do not need to install Node or PowerShell. The normal `npm run dist` build remains the classic launcher/wrapper.

## 🛠️ Configuration

**Spice** works out of the box, but you can customize your experience in the **Settings** menu:
*   **Discord RPC**: Toggle on/off.
*   **Scrobbling**: Log in to Last.fm or paste your ListenBrainz token.
*   **Startup Service**: In the classic launcher, choose whether to open the home screen, YouTube Music, SoundCloud, or SPICE Music on launch. Native SPICE builds always open SPICE Music after setup and hide this legacy service setting.
*   **SPICE Local Runtime**: The Spice Music card checks `http://127.0.0.1:3939` and auto-starts the installed runtime on Windows and Linux. If the runtime is missing or fails to start, the app offers install/update and manual setup options.
*   **Native SPICE Mode**: Launch with `npm run start:native` for the SPICE-only shell during development. Packaged native releases are built separately through `npm run dist:native` or the `Release Spice Native` workflow.

## ⌨️ Shortcuts
*   `Ctrl + R`: Reload current page.
*   `Alt + Left`: Go Back.
*   `Alt + Right`: Go Forward.

## 🤝 Contributing

Contributions are welcome! Feel free to submit a Pull Request.

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

## 📜 License

Distributed under the ISC License.

---
*Built with ❤️ by the Anti-Depressants Dev Team*
