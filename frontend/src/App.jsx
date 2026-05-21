import { useState, useEffect } from 'react';
import api from './api.js';
import ImageUpload from './components/ImageUpload.jsx';
import ImageGrid from './components/ImageGrid.jsx';

export default function App() {
  const [images, setImages]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  // Load all images on mount
  useEffect(() => {
    api.get('/api/images')
      .then(({ data }) => setImages(data))
      .catch(() => setError('Cannot reach backend — is the server running on port 4000?'))
      .finally(() => setLoading(false));
  }, []);

  const handleUploaded = (img) => setImages((prev) => [img, ...prev]);
  const handleDeleted  = (id)  => setImages((prev) => prev.filter((i) => i.id !== id));

  return (
    <div style={s.page}>
      {/* ── Header ── */}
      <header style={s.header}>
        <div style={s.brand}>
          <span style={s.logo}>🗄️</span>
          <div>
            <div style={s.title}>Image Vault</div>
            <div style={s.subtitle}>Upload · Store in Supabase · Serve as Binary</div>
          </div>
        </div>
        <div style={s.stack}>
          <Chip>Node.js</Chip>
          <Chip>React</Chip>
          <Chip>Supabase</Chip>
        </div>
      </header>

      {/* ── Main ── */}
      <main style={s.main}>
        <ImageUpload onUploaded={handleUploaded} />

        <section style={s.section}>
          <h2 style={s.sectionTitle}>
            Stored Images{images.length > 0 ? ` (${images.length})` : ''}
          </h2>
          {loading && <StatusMsg>Loading images…</StatusMsg>}
          {error   && <StatusMsg color="#f87171">{error}</StatusMsg>}
          {!loading && !error && (
            <ImageGrid images={images} onDeleted={handleDeleted} />
          )}
        </section>
      </main>
    </div>
  );
}

function Chip({ children }) {
  return <span style={s.chip}>{children}</span>;
}

function StatusMsg({ children, color = '#606070' }) {
  return <p style={{ textAlign: 'center', color, padding: '40px 0', fontSize: 15 }}>{children}</p>;
}

const s = {
  page: { minHeight: '100vh', display: 'flex', flexDirection: 'column' },
  header: {
    background: '#13131a',
    borderBottom: '1px solid #1e1e28',
    padding: '16px 32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    flexWrap: 'wrap',
  },
  brand: { display: 'flex', alignItems: 'center', gap: 12 },
  logo:  { fontSize: 28 },
  title: { fontSize: 18, fontWeight: 700, color: '#c0b8ff', lineHeight: 1.2 },
  subtitle: { fontSize: 12, color: '#50506a', marginTop: 2 },
  stack: { display: 'flex', gap: 8 },
  chip: {
    background: '#1e1e2e',
    border: '1px solid #2a2a3a',
    borderRadius: 20,
    padding: '3px 12px',
    fontSize: 12,
    color: '#8080b0',
  },
  main: { flex: 1, maxWidth: 960, width: '100%', margin: '0 auto', padding: '32px 24px' },
  section: {},
  sectionTitle: { fontSize: 16, fontWeight: 600, color: '#b0b0c8', marginBottom: 20 },
};
