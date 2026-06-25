'use client';
import Link from 'next/link';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { AccountSnapshot } from '@/lib/account';
import styles from './admin-dashboard.module.css';

const services = [
  { name: 'SPICE Music', status: 'Live', owner: 'Music platform', health: '99.98%', access: 'All signed-in users' },
  { name: 'Spice Anime', status: 'Starter', owner: 'Anime starter', health: 'Preview', access: 'All signed-in users' },
  { name: 'Spice Movie', status: 'Starter', owner: 'Movie starter', health: 'Preview', access: 'All signed-in users' },
  { name: 'SPICE Rooms', status: 'Planned', owner: 'Social listening', health: 'Design', access: 'Admins only preview' },
  { name: 'SPICE Recap', status: 'Planned', owner: 'Profile intelligence', health: 'Prototype', access: 'Admins only preview' },
  { name: 'SPICE Cloud', status: 'Planned', owner: 'Account services', health: 'Queued', access: 'Admins only preview' },
];

const activity = [
  'SPICE Music marked healthy after playback check',
  'Spice Anime starter surface is ready for account entry',
  'Spice Movie starter surface is ready for account entry',
  'New account creation prompt added to home screen',
  'Rooms invite limits waiting for admin policy',
  'Cloud account tools queued for service rollout',
];

export default function AdminDashboardView() {
  const [token, setToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<AccountSnapshot | null>(null);
  const [accounts, setAccounts] = useState<AccountSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Track save status per user ID
  const [savingUserIds, setSavingUserIds] = useState<Set<string>>(new Set());
  const [successUserIds, setSuccessUserIds] = useState<Set<string>>(new Set());
  const [saveErrors, setSaveErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const savedToken = localStorage.getItem('spice_cloud_token');
    setToken(savedToken);

    if (!savedToken) {
      setError('unsigned_in');
      setLoading(false);
      return;
    }

    async function initializeDashboard() {
      try {
        // 1. Verify current session
        const verifyRes = await fetch('/api/account/me', {
          headers: { Authorization: `Bearer ${savedToken}` },
        });

        if (!verifyRes.ok) {
          throw new Error('verification_failed');
        }

        const verifyData = await verifyRes.json();
        const me = verifyData.account || verifyData.user;

        if (!me) {
          throw new Error('user_not_found');
        }

        if (me.accountRole !== 'admin') {
          setError('admin_required');
          setLoading(false);
          return;
        }

        setCurrentUser(me);

        // 2. Fetch all accounts
        const accountsRes = await fetch('/api/admin/accounts', {
          headers: { Authorization: `Bearer ${savedToken}` },
        });

        if (!accountsRes.ok) {
          throw new Error('accounts_fetch_failed');
        }

        const accountsData = await accountsRes.json();
        setAccounts(accountsData.accounts || []);
      } catch (err) {
        console.error(err);
        setError('connection_error');
      } finally {
        setLoading(false);
      }
    }

    void initializeDashboard();
  }, []);

  const handleUpdate = async (
    userId: string,
    updates: {
      accountRole?: string;
      subscriptionTier?: string;
      subscriptionStatus?: string;
    }
  ) => {
    if (!token) return;

    // Clear previous error
    setSaveErrors((prev) => {
      const next = { ...prev };
      delete next[userId];
      return next;
    });

    // Mark as saving
    setSavingUserIds((prev) => {
      const next = new Set(prev);
      next.add(userId);
      return next;
    });

    try {
      const res = await fetch('/api/admin/accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId,
          ...updates,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to update account.');
      }

      const data = await res.json();
      if (data.success && data.account) {
        // Update local accounts state
        setAccounts((prev) =>
          prev.map((acc) => (acc.id === userId ? data.account : acc))
        );

        // Show transient success checkmark
        setSuccessUserIds((prev) => {
          const next = new Set(prev);
          next.add(userId);
          return next;
        });

        setTimeout(() => {
          setSuccessUserIds((prev) => {
            const next = new Set(prev);
            next.delete(userId);
            return next;
          });
        }, 2000);
      }
    } catch (err) {
      console.error(err);
      setSaveErrors((prev) => ({
        ...prev,
        [userId]: err instanceof Error ? err.message : 'Save failed',
      }));
    } finally {
      setSavingUserIds((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  };

  const getProfileInitials = () => {
    if (!currentUser?.email) return 'SA';
    return currentUser.email.slice(0, 2).toUpperCase();
  };

  const displayMetrics = [
    { label: 'Accounts', value: loading ? '...' : accounts.length.toString(), detail: `${accounts.filter((a) => a.accountRole === 'admin').length} admin accounts` },
    { label: 'Active devices', value: '346', detail: 'Spice Connect online' },
    { label: 'Live services', value: '3 / 6', detail: 'Music, Anime, and Movie are public' },
    { label: 'Review queue', value: '18', detail: 'Invites and reports' },
  ];

  if (loading) {
    return (
      <main className={styles.shell}>
        <div className={styles.backdrop} aria-hidden="true" />
        <div className={styles.loadingContainer}>
          <div className={styles.spinner} />
          <p>Verifying admin permissions...</p>
        </div>
      </main>
    );
  }

  if (error === 'unsigned_in') {
    return (
      <main className={styles.shell}>
        <div className={styles.backdrop} aria-hidden="true" />
        <section className={styles.hero} style={{ gridTemplateColumns: '1fr', textAlign: 'center', padding: '100px 0' }}>
          <div>
            <span className={styles.kicker}>Developer Operations</span>
            <h1>Access Denied</h1>
            <p style={{ margin: '20px auto', maxWidth: '500px' }}>
              Please sign in with a verified SPICE admin account on the home page or in SPICE Music to access the operations dashboard.
            </p>
            <Link href="/" className={styles.primaryLinkButton} style={{ display: 'inline-block', marginTop: '20px' }}>
              Go to Home Screen
            </Link>
          </div>
        </section>
      </main>
    );
  }

  if (error === 'admin_required') {
    return (
      <main className={styles.shell}>
        <div className={styles.backdrop} aria-hidden="true" />
        <section className={styles.hero} style={{ gridTemplateColumns: '1fr', textAlign: 'center', padding: '100px 0' }}>
          <div>
            <span className={styles.kicker}>Access level</span>
            <h1>Admin Account Required</h1>
            <p style={{ margin: '20px auto', maxWidth: '500px' }}>
              Your account does not have operator privileges. Normal users are limited to profile, music, anime, and public services.
            </p>
            <Link href="/" className={styles.primaryLinkButton} style={{ display: 'inline-block', marginTop: '20px' }}>
              Go to Home Screen
            </Link>
          </div>
        </section>
      </main>
    );
  }

  if (error) {
    return (
      <main className={styles.shell}>
        <div className={styles.backdrop} aria-hidden="true" />
        <section className={styles.hero} style={{ gridTemplateColumns: '1fr', textAlign: 'center', padding: '100px 0' }}>
          <div>
            <span className={styles.kicker}>System Error</span>
            <h1>Something went wrong</h1>
            <p style={{ margin: '20px auto', maxWidth: '500px' }}>
              Could not load the developer dashboard due to a connection or database error.
            </p>
            <button onClick={() => window.location.reload()} className={styles.primaryLinkButton} style={{ display: 'inline-block', marginTop: '20px', border: 'none' }}>
              Try Again
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.shell}>
      <div className={styles.backdrop} aria-hidden="true" />

      <header className={styles.header}>
        <div className={styles.brandLockup} aria-label="SPICE Admin">
          <span className={styles.logoMark}>
            <svg viewBox="0 0 48 48" role="img" aria-hidden="true">
              <path d="M24 4 42 14.4v19.2L24 44 6 33.6V14.4L24 4Z" />
              <path d="M17.5 30.5c4.7 3.3 12.3 1.6 14.2-3.2 1.3-3.4-.1-6.7-4.1-9.7L22 13.4v8.7l-3.1-2.2c-2.5-1.8-5.4-.1-5.4 2.9 0 1.3.7 2.6 1.9 3.4l4.4 3.1c1.4 1 3 .6 3.9-.7.8-1.2.5-2.8-.7-3.7l-3.8-2.7c-.3-.2-.4-.5-.2-.8.2-.3.6-.4.9-.2l6.2 4.4c1.7 1.2 2.2 2.7 1.5 4-.9 1.8-4.6 2.4-7.4.5l-4.2-2.9-3.2 4.4 4.7 3.3Z" />
            </svg>
          </span>
          <div>
            <span>SPICE Developer</span>
            <strong>Operations dashboard</strong>
          </div>
        </div>

        <div className={styles.profilePill} aria-label="Current admin account preview">
          <span>{getProfileInitials()}</span>
          <div>
            <strong>{currentUser?.email || 'Spice Admin'}</strong>
            <small>{currentUser?.accountRole === 'admin' ? 'Admin account' : 'Operator'}</small>
          </div>
        </div>
      </header>

      <section className={styles.hero} aria-label="Admin dashboard overview">
        <div>
          <span className={styles.kicker}>Wired Admin Engine</span>
          <h1>Control SPICE accounts, services, and launch readiness from one dashboard.</h1>
          <p>
            You are running in developer management mode. You can view all accounts below and instantly
            change their access roles and billing subscription parameters in the live database.
          </p>
        </div>

        <aside className={styles.accessPanel}>
          <span>Access level</span>
          <strong>Admin account verified</strong>
          <p>You have write permissions for user authentication states and subscription entitlement profiles.</p>
        </aside>
      </section>

      <section className={styles.metricGrid} aria-label="Admin metrics">
        {displayMetrics.map((metric) => (
          <article key={metric.label} className={styles.metricCard}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
            <p>{metric.detail}</p>
          </article>
        ))}
      </section>

      <section className={styles.dashboardGrid}>
        <div className={styles.servicePanel}>
          <div className={styles.panelHeading}>
            <span>Service controls</span>
            <h2>Launch status</h2>
          </div>

          <div className={styles.serviceList}>
            {services.map((service) => (
              <article key={service.name} className={styles.serviceRow}>
                <div>
                  <strong>{service.name}</strong>
                  <span>{service.owner}</span>
                </div>
                <p>{service.access}</p>
                <small className={service.status === 'Live' || service.status === 'Starter' ? styles.liveBadge : styles.plannedBadge}>
                  {service.status}
                </small>
                <small>{service.health}</small>
              </article>
            ))}
          </div>
        </div>

        <aside className={styles.queuePanel} aria-label="Admin activity queue">
          <div className={styles.panelHeading}>
            <span>Operator feed</span>
            <h2>Needs attention</h2>
          </div>
          <ul>
            {activity.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <button type="button" className={styles.activeFeedButton}>
            Developer Sync Enabled
          </button>
        </aside>
      </section>

      <section className={styles.accessTable} aria-label="Account Management Grid">
        <div className={styles.panelHeading}>
          <span>Account Governance</span>
          <h2>Manage accounts and subscriptions</h2>
        </div>

        <div className={styles.tableResponsive}>
          <table className={styles.adminTable}>
            <thead>
              <tr>
                <th>User ID / Email</th>
                <th>Account Role</th>
                <th>Subscription Tier</th>
                <th>Subscription Status</th>
                <th style={{ width: '120px', textAlign: 'center' }}>Sync Status</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((acc) => {
                const isSaving = savingUserIds.has(acc.id);
                const isSuccess = successUserIds.has(acc.id);
                const errorMsg = saveErrors[acc.id];

                return (
                  <tr key={acc.id} className={styles.adminTableRow}>
                    <td>
                      <div className={styles.userIdentity}>
                        <strong>{acc.email}</strong>
                        <small className={styles.userIdText}>{acc.id}</small>
                      </div>
                    </td>
                    <td>
                      <select
                        value={acc.accountRole}
                        disabled={isSaving}
                        onChange={(e) => handleUpdate(acc.id, { accountRole: e.target.value })}
                        className={styles.adminSelect}
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td>
                      <select
                        value={acc.subscription?.tier || 'free'}
                        disabled={isSaving}
                        onChange={(e) => handleUpdate(acc.id, { subscriptionTier: e.target.value })}
                        className={styles.adminSelect}
                      >
                        <option value="free">Free</option>
                        <option value="premium">Premium</option>
                        <option value="gold">Gold</option>
                        <option value="platinum">Platinum</option>
                      </select>
                    </td>
                    <td>
                      <select
                        value={acc.subscription?.status || 'inactive'}
                        disabled={isSaving}
                        onChange={(e) => handleUpdate(acc.id, { subscriptionStatus: e.target.value })}
                        className={styles.adminSelect}
                      >
                        <option value="inactive">Inactive</option>
                        <option value="trialing">Trialing</option>
                        <option value="active">Active</option>
                        <option value="past_due">Past Due</option>
                        <option value="canceled">Canceled</option>
                      </select>
                    </td>
                    <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                      <div className={styles.syncStateWrapper}>
                        {isSaving && <div className={styles.inlineSpinner} title="Saving to database..." />}
                        {isSuccess && <span className={styles.syncSuccess} title="Saved successfully!">&#x2714; Saved</span>}
                        {errorMsg && <span className={styles.syncError} title={errorMsg}>&#x26A0; Failed</span>}
                        {!isSaving && !isSuccess && !errorMsg && <span className={styles.syncIdle}>Synced</span>}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {accounts.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '30px', color: '#a1a1aa' }}>
                    No registered user accounts found in the database.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
