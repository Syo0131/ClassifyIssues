export default function SkeletonLoader() {
  return (
    <div className="skeleton-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <style dangerouslySetInnerHTML={{__html: `
        .skeleton {
          background: linear-gradient(90deg, var(--bg-card) 25%, var(--border-subtle) 50%, var(--bg-card) 75%);
          background-size: 200% 100%;
          animation: loading 1.5s infinite;
          border-radius: var(--radius-sm);
        }
        @keyframes loading {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}} />
      
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
        <div className="skeleton" style={{ height: '40px', width: '250px', borderRadius: '100px' }} />
        <div className="skeleton" style={{ height: '40px', width: '150px', borderRadius: '100px' }} />
        <div className="skeleton" style={{ height: '40px', width: '150px', borderRadius: '100px' }} />
      </div>

      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} style={{ display: 'flex', gap: '1rem', padding: '1rem', borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="skeleton" style={{ height: '24px', width: '60px' }} />
          <div className="skeleton" style={{ height: '24px', flex: 1 }} />
          <div className="skeleton" style={{ height: '24px', width: '100px' }} />
          <div className="skeleton" style={{ height: '24px', width: '80px', borderRadius: '100px' }} />
        </div>
      ))}
    </div>
  );
}
