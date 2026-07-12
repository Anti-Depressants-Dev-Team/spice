'use client';

import { useEffect, useRef, useState } from 'react';

import styles from './install-guide.module.css';

interface InstallCommandCardProps {
  label: string;
  command: string;
}

export default function InstallCommandCard({ label, command }: InstallCommandCardProps) {
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimer.current) {
        window.clearTimeout(resetTimer.current);
      }
    };
  }, []);

  async function copyCommand() {
    try {
      await navigator.clipboard.writeText(command);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = command;
      textArea.setAttribute('readonly', 'true');
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }

    setCopied(true);
    if (resetTimer.current) {
      window.clearTimeout(resetTimer.current);
    }
    resetTimer.current = window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <div className={styles.commandCard}>
      <div className={styles.commandTitleRow}>
        <span>{label}</span>
        <button type="button" onClick={copyCommand} aria-label={`Copy ${label} command`}>
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className={styles.codeBlock}><code>{command}</code></pre>
    </div>
  );
}
