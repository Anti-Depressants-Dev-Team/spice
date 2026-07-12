import { SPICE_MEDIA_CORE_VERSION } from '@/lib/release-notifications';

import InstallCommandCard from './install-command-card';
import styles from './install-guide.module.css';

const INSTALL_ORIGIN = process.env.SPICE_INSTALL_ORIGIN?.trim() || 'https://install.spice-app.xyz';
const CLOUD_ORIGIN = process.env.SPICE_CLOUD_API_ORIGIN?.trim()
  || process.env.NEXT_PUBLIC_SPICE_CLOUD_API_ORIGIN?.trim()
  || 'https://music.spice-app.xyz';
const LOCAL_ORIGIN = process.env.NEXT_PUBLIC_SPICE_LOCAL_API_ORIGIN?.trim()
  || process.env.SPICE_LOCAL_API_ORIGIN?.trim()
  || 'http://127.0.0.1:3939';
const MANIFEST_URL = `${trimTrailingSlash(CLOUD_ORIGIN)}/api/updates/local-windows`;
const INSTALL_URL = trimTrailingSlash(INSTALL_ORIGIN);
const ZIP_URL = '/api/downloads/local-windows';
const DESKTOP_APP_URL = 'https://github.com/Anti-Depressants-Dev-Team/spice/releases/latest';
const MANAGER_SCRIPT_URL = `${INSTALL_URL}/spice-local-manager.ps1`;
const INSTALL_SCRIPT_URL = `${INSTALL_URL}/install-spice-local.ps1`;
const PORTABLE_SCRIPT_URL = `${INSTALL_URL}/spice-local-portable.ps1`;
const MANAGER_COMMAND = `powershell -NoProfile -ExecutionPolicy Bypass -Command "irm ${MANAGER_SCRIPT_URL} | iex"`;
const INSTALL_COMMAND = `powershell -NoProfile -ExecutionPolicy Bypass -Command "irm ${INSTALL_SCRIPT_URL} | iex"`;
const PORTABLE_COMMAND = `powershell -NoProfile -ExecutionPolicy Bypass -File .\\spice-local-portable.ps1`;

export default function InstallGuide() {
  return (
    <main className={styles.shell}>
      <section className={styles.hero}>
        <div className={styles.brandRow}>
          <span className={styles.logoMark}>S</span>
          <div>
            <p className={styles.eyebrow}>SPICE LOCAL INSTALLER</p>
            <h1>Install the local SPICE runtime.</h1>
          </div>
        </div>
        <p className={styles.lede}>
          Install SPICE as a local Windows runtime or keep it portable in any folder. The hosted page only
          publishes account, setup, and update metadata; media search, stream extraction, lyrics, proxying,
          and playback run on the user PC at <code>{LOCAL_ORIGIN}</code>.
        </p>
        <div className={styles.actionRow}>
          <a className={styles.primaryButton} href={MANAGER_SCRIPT_URL}>
            Download local manager
          </a>
          <a className={styles.secondaryButton} href={INSTALL_SCRIPT_URL}>
            Installer script
          </a>
          <a className={styles.secondaryButton} href={ZIP_URL}>
            Runtime ZIP
          </a>
          <a className={styles.secondaryButton} href={PORTABLE_SCRIPT_URL}>
            Portable script
          </a>
          <a className={styles.secondaryButton} href={DESKTOP_APP_URL}>
            Desktop app
          </a>
          <a className={styles.secondaryButton} href={CLOUD_ORIGIN}>
            Account portal
          </a>
        </div>
      </section>

      <section className={styles.statusGrid} aria-label="Install status">
        <div>
          <span>Runtime version</span>
          <strong>{SPICE_MEDIA_CORE_VERSION}</strong>
        </div>
        <div>
          <span>Install page</span>
          <strong>{INSTALL_URL}</strong>
        </div>
        <div>
          <span>Update source</span>
          <strong>{MANIFEST_URL}</strong>
        </div>
        <div>
          <span>Recommended setup</span>
          <strong>Local manager</strong>
        </div>
      </section>

      <section className={styles.grid}>
        <article className={styles.panel}>
          <p className={styles.kicker}>1. Recommended</p>
          <h2>Use the local manager</h2>
          <ol className={styles.steps}>
            <li>Download <code>spice-local-manager.ps1</code> from this page.</li>
            <li>Run it in PowerShell to open the small SPICE Local Manager window.</li>
            <li>Use <code>Install / Update</code>, then <code>Start</code>.</li>
            <li>Open <code>{LOCAL_ORIGIN}</code> from the manager.</li>
          </ol>
        </article>

        <article className={styles.panel}>
          <p className={styles.kicker}>2. Automated install</p>
          <h2>User-space install with one script</h2>
          <ol className={styles.steps}>
            <li>Download <code>install-spice-local.ps1</code> from this page.</li>
            <li>Run it in PowerShell to install SPICE into <code>%LOCALAPPDATA%\SPICE</code>.</li>
            <li>Open the Start Menu shortcut or run <code>start-spice-local.ps1</code>.</li>
            <li>Open <code>{LOCAL_ORIGIN}</code> in your browser.</li>
          </ol>
        </article>

        <article className={styles.panel}>
          <p className={styles.kicker}>3. Portable mode</p>
          <h2>Keep SPICE inside one folder</h2>
          <ol className={styles.steps}>
            <li>Download <code>spice-local-portable.ps1</code> into the folder you want to use.</li>
            <li>Run the script from that folder.</li>
            <li>The runtime is extracted into <code>SPICE-Local-Portable</code>.</li>
            <li>Move that folder anywhere and run <code>start-spice-local.ps1</code>.</li>
          </ol>
        </article>

        <article className={styles.panel}>
          <p className={styles.kicker}>4. Manual ZIP</p>
          <h2>Download, unpack, run</h2>
          <ol className={styles.steps}>
            <li>Download the runtime ZIP from this page.</li>
            <li>Unzip it into a normal user folder.</li>
            <li>Run <code>start-spice-local.ps1</code>.</li>
            <li>Run <code>check-spice-local-update.ps1 -Download</code> later to fetch a newer package.</li>
          </ol>
        </article>
      </section>

      <section className={styles.commandPanel}>
        <div className={styles.commandHeader}>
          <div>
            <p className={styles.kicker}>Automation</p>
            <h2>PowerShell commands</h2>
          </div>
          <span>No admin rights required</span>
        </div>
        <div className={styles.commandGrid}>
          <InstallCommandCard label="Local manager" command={MANAGER_COMMAND} />
          <InstallCommandCard label="Install script" command={INSTALL_COMMAND} />
          <InstallCommandCard label="Portable script" command={PORTABLE_COMMAND} />
        </div>
      </section>
    </main>
  );
}

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, '');
}
