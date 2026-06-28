const LOCAL_RUNTIME_URL = 'http://127.0.0.1:3939';

export default function CloudPortal() {
  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#050509',
        color: '#f8fafc',
        fontFamily: 'var(--font-geist-sans), Inter, sans-serif',
        display: 'grid',
        placeItems: 'center',
        padding: '32px',
      }}
    >
      <section style={{ width: 'min(720px, 100%)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
              display: 'grid',
              placeItems: 'center',
              fontWeight: 900,
              boxShadow: '0 18px 44px rgba(236, 72, 153, 0.24)',
            }}
          >
            S
          </div>
          <div>
            <p style={{ color: '#c084fc', fontSize: '0.78rem', fontWeight: 800, margin: 0, letterSpacing: '0.08em' }}>
              SPICE CONNECT
            </p>
            <h1 style={{ fontSize: 'clamp(2rem, 5vw, 4rem)', lineHeight: 1, margin: '4px 0 0', letterSpacing: 0 }}>
              Local runtime required.
            </h1>
          </div>
        </div>

        <p style={{ color: '#cbd5e1', fontSize: '1rem', lineHeight: 1.7, maxWidth: '620px', marginBottom: '28px' }}>
          This Vercel surface now keeps auth, sync, metadata routing, and update delivery online. Media scraping,
          stream extraction, lyrics, and proxying run from the user PC on localhost.
        </p>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <a
            href={LOCAL_RUNTIME_URL}
            style={{
              color: '#fff',
              background: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
              textDecoration: 'none',
              borderRadius: '10px',
              padding: '12px 18px',
              fontWeight: 800,
            }}
          >
            Open local SPICE
          </a>
          <a
            href="/api/runtime"
            style={{
              color: '#e2e8f0',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              textDecoration: 'none',
              borderRadius: '10px',
              padding: '12px 18px',
              fontWeight: 700,
            }}
          >
            Runtime status
          </a>
        </div>
      </section>
    </main>
  );
}
