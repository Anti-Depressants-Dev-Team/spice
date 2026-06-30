'use client';

import { useEffect, useMemo, useState } from 'react';

import type { ChangelogPayload, ServiceChangelog } from './changelog-types';
import styles from './changelog.module.css';

interface ChangelogViewProps {
  initialPayload: ChangelogPayload;
}

type AccountState = 'checking' | 'guest' | 'user' | 'admin';
const SPICE_RUNTIME_TARGET = process.env.NEXT_PUBLIC_SPICE_RUNTIME_TARGET === 'vercel' ? 'vercel' : 'local';

export default function ChangelogView({ initialPayload }: ChangelogViewProps) {
  const [payload, setPayload] = useState(initialPayload);
  const [accountState, setAccountState] = useState<AccountState>('checking');
  const [accountMessage, setAccountMessage] = useState('Checking for a signed-in SPICE account on this device.');
  const [selectedServiceId, setSelectedServiceId] = useState(initialPayload.services[0]?.id || '');

  useEffect(() => {
    let active = true;

    async function loadAccountScopedChangelog() {
      const token = window.localStorage.getItem('spice_cloud_token');
      if (!token) {
        if (!active) return;
        setAccountState('guest');
        setAccountMessage('Showing the normal user changelog. Sign in on this origin to unlock account-specific notes.');
        return;
      }

      try {
        const response = await fetch(cloudApiPath('/changelog'), {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Changelog account check failed.');
        }

        const nextPayload = (await response.json()) as ChangelogPayload;
        if (!active) return;

        setPayload(nextPayload);
        setAccountState(nextPayload.accountRole === 'admin' ? 'admin' : 'user');
        setAccountMessage(
          nextPayload.accountRole === 'admin'
            ? 'Admin account verified. Admin Ops changelog entries are unlocked.'
            : 'Normal user account verified. Admin-only operations entries stay hidden.',
        );
      } catch {
        if (!active) return;
        setAccountState('user');
        setAccountMessage('Showing the normal user changelog because the saved account could not be verified.');
      }
    }

    void loadAccountScopedChangelog();

    return () => {
      active = false;
    };
  }, []);

  const selectedService = useMemo(
    () => payload.services.find((service) => service.id === selectedServiceId) || payload.services[0],
    [payload.services, selectedServiceId],
  );

  const roleLabel =
    accountState === 'admin'
      ? 'Admin account'
      : accountState === 'user'
        ? 'Normal user account'
        : accountState === 'checking'
          ? 'Checking account'
          : 'Public user view';

  return (
    <>
      <div className={styles.heroGrid}>
        <div>
          <div className={styles.kicker}>Service release history</div>
          <h1>Changelogs split by SPICE service and account access.</h1>
          <p className={styles.lede}>
            Normal users see public service changes for Music, Anime, Connect, Accounts, and the home
            screen. Admin accounts can unlock private operations notes for admin dashboard and backend work.
          </p>
        </div>

        <aside className={styles.latestCard} aria-label="Latest visible SPICE release">
          <span>Latest visible release</span>
          <strong>{payload.latestVersion || 'No releases yet'}</strong>
          <p>{payload.latestNote || 'Release notes will appear here after the next update.'}</p>
        </aside>
      </div>

      <section className={styles.serviceBrowser} aria-label="Account-scoped service changelog selector">
        <div className={styles.accountStrip}>
          <div>
            <span>Account type</span>
            <strong>{roleLabel}</strong>
            <p>{accountMessage}</p>
          </div>
          <div className={accountState === 'admin' ? styles.adminSignal : styles.userSignal}>
            {accountState === 'checking' ? 'Checking' : accountState === 'admin' ? 'Admin unlocked' : 'User scope'}
          </div>
        </div>

        <div className={styles.serviceGrid}>
          {payload.services.map((service) => (
            <ServiceButton
              key={service.id}
              service={service}
              selected={service.id === selectedService?.id}
              onSelect={() => setSelectedServiceId(service.id)}
            />
          ))}

          {payload.lockedServices.map((service) => (
            <article key={service.id} className={styles.lockedService}>
              <span>Admin only</span>
              <strong>{service.label}</strong>
              <p>{service.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.timeline} aria-label={`${selectedService?.label || 'SPICE'} changelog entries`}>
        {selectedService ? (
          <>
            <div className={styles.timelineHeading}>
              <span>{selectedService.audience === 'admin' ? 'Admin changelog' : 'Service changelog'}</span>
              <h2>{selectedService.label}</h2>
              <p>{selectedService.description}</p>
            </div>

            {selectedService.entries.map((entry, index) => (
              <article key={entry.version} className={index === 0 ? styles.entryLatest : styles.entry}>
                <div className={styles.entryMarker} aria-hidden="true" />
                <div className={styles.entryHeader}>
                  <span>{index === 0 ? 'Current' : 'Release'}</span>
                  <h2>{entry.version}</h2>
                </div>

                <ul>
                  {entry.notes.map((note) => (
                    <li key={note}>{renderInlineMarkdown(note)}</li>
                  ))}
                </ul>
              </article>
            ))}
          </>
        ) : (
          <article className={styles.emptyState}>
            <h2>No changelog entries found</h2>
            <p>Update `walkthrough.md` with release notes and this page will render them automatically.</p>
          </article>
        )}
      </section>
    </>
  );
}

function ServiceButton({
  service,
  selected,
  onSelect,
}: {
  service: ServiceChangelog;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      className={selected ? styles.serviceButtonActive : styles.serviceButton}
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
    >
      <span>{service.audience === 'admin' ? 'Admin' : 'Service'}</span>
      <strong>{service.label}</strong>
      <p>{service.description}</p>
      <small>{service.entries.length} release{service.entries.length === 1 ? '' : 's'}</small>
    </button>
  );
}

function cloudApiPath(path: string) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return SPICE_RUNTIME_TARGET === 'vercel' ? `/api${normalizedPath}` : `/api/cloud${normalizedPath}`;
}

function renderInlineMarkdown(text: string) {
  return text.split(/(`[^`]+`)/g).map((part, index) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={`${part}-${index}`}>{part.slice(1, -1)}</code>;
    }

    return part;
  });
}
