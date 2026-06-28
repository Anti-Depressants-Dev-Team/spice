import Link from 'next/link';

interface ShelvedServiceProps {
  name: string;
}

export default function ShelvedService({ name }: ShelvedServiceProps) {
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
      <section style={{ width: 'min(640px, 100%)' }}>
        <p style={{ color: '#f472b6', fontSize: '0.78rem', fontWeight: 800, margin: 0, letterSpacing: '0.08em' }}>
          SHELVED SERVICE
        </p>
        <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', lineHeight: 1, margin: '10px 0 16px', letterSpacing: 0 }}>
          {name} is frozen.
        </h1>
        <p style={{ color: '#cbd5e1', fontSize: '1rem', lineHeight: 1.7, marginBottom: '28px' }}>
          This route is retained so its implementation history stays intact, but it is no longer part of active navigation.
        </p>
        <Link
          href="/"
          style={{
            color: '#fff',
            background: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
            textDecoration: 'none',
            borderRadius: '10px',
            padding: '12px 18px',
            fontWeight: 800,
          }}
        >
          Back to SPICE
        </Link>
      </section>
    </main>
  );
}
