export default function HomePage() {
  return (
    <main
      style={{
        display: 'grid',
        minHeight: '100vh',
        padding: '4rem',
        placeItems: 'center',
      }}
    >
      <section style={{ maxWidth: '48rem' }}>
        <p style={{ color: '#8fb3ff', fontWeight: 700, letterSpacing: '0.16em' }}>CODE-SHERPA</p>
        <h1 style={{ fontSize: 'clamp(2.5rem, 8vw, 5rem)', lineHeight: 1, margin: 0 }}>
          AI-tutored algorithms practice.
        </h1>
        <p style={{ color: '#bdd0ef', fontSize: '1.25rem', lineHeight: 1.6 }}>
          Build learning plans, solve tasks locally, and sync progress into your own GitHub repo.
        </p>
      </section>
    </main>
  );
}
