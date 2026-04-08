# Spice 🌶️

**Spice** is a beautiful, minimalist desktop client for **YouTube Music** and **SoundCloud**, built with Electron. It enhances your listening experience with powerful features like successful ad-blocking, Discord Rich Presence, Last.fm scrobbling, and a dedicated Lyrics window.

![Spice App](https://github.com/Anti-Depressants-Dev-Team/spice/raw/main/resources/preview.png)
*(Note: Add a screenshot to a `resources` folder in your repo for this image to show)*

## ✨ Features

*   **🚫 Ad-Free Experience**: Built-in ad-blocking for uninterupted listening on YouTube Music and SoundCloud.
*   **🎵 Dual Service Support**: Seamlessly switch between YouTube Music and SoundCloud.
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
Grab the latest installer from the [Releases](https://github.com/Anti-Depressants-Dev-Team/spice/releases) page. Linux releases include AppImage, `.deb`, `.tar.gz`, and Flatpak bundles.

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

## 🛠️ Configuration

**Spice** works out of the box, but you can customize your experience in the **Settings** menu:
*   **Discord RPC**: Toggle on/off.
*   **Scrobbling**: Log in to Last.fm or paste your ListenBrainz token.
*   **Startup Service**: Choose whether to open YouTube Music or SoundCloud on launch.

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
