import { useState } from 'react';
import api from '../api.js';

const BASE = import.meta.env.VITE_API_URL ?? '';

export default function ImageGrid({ images, onDeleted }) {
  const [binaryPanel, setBinaryPanel] = useState(null);
  // binaryPanel = { id, name, mimeType, bytes, objectUrl }
  const [fetchingId, setFetchingId] = useState(null);

  // ── Fetch single image as raw binary ─────────────────────────────────────
  const getBinary = async (img) => {
    setFetchingId(img.id);
    setBinaryPanel(null);
    try {
      const resp = await api.get(`/api/images/${img.id}`, {
        responseType: 'arraybuffer',   // ← receive raw binary buffer
      });

      const bytes     = resp.data.byteLength;
      const blob      = new Blob([resp.data], { type: img.mime_type });
      const objectUrl = URL.createObjectURL(blob);

      setBinaryPanel({ id: img.id, name: img.name, mimeType: img.mime_type, bytes, objectUrl });
    } catch (err) {
      alert(err.response?.data?.error ?? 'Failed to fetch binary');
    } finally {
      setFetchingId(null);
    }
  };

  // ── Delete image ─────────────────────────────────────────────────────────
  const deleteImage = async (img) => {
    if (!window.confirm(`Delete "${img.name}"?`)) return;
    try {
      await api.delete(`/api/images/${img.id}`);
      if (binaryPanel?.id === img.id) setBinaryPanel(null);
      onDeleted(img.id);
    } catch (err) {
      alert(err.response?.data?.error ?? 'Delete failed');
    }
  };

  // ── Empty state ───────────────────────────────────────────────────────────
  if (!images.length) {
    return (
      <div style={s.empty}>
        <span style={{ fontSize: 40 }}>📭</span>
        <p>No images stored yet. Upload one above!</p>
      </div>
    );
  }

  return (
    <>
      {/* Binary Inspector Panel */}
      {binaryPanel && (
        <div style={s.panel}>
          <div style={s.panelHeader}>
            <span style={{ color: '#60aaff', fontWeight: 600 }}>
              Binary Response — <code style={{ fontSize: 13 }}>GET https://linkedin-image-to-binary.vercel.app/api/images/{binaryPanel.id}</code>
            </span>
            <button style={s.closeBtn} onClick={() => setBinaryPanel(null)}>✕</button>
          </div>

          {/* Metadata badges */}
          <div style={s.badges}>
            <Badge label="Content-Type" value={binaryPanel.mimeType} />
            <Badge label="Bytes"        value={binaryPanel.bytes.toLocaleString()} />
            <Badge label="Size"         value={`${(binaryPanel.bytes / 1024).toFixed(2)} KB`} />
          </div>

          {/* Image rendered from the binary ArrayBuffer */}
          <img src={binaryPanel.objectUrl} alt={binaryPanel.name} style={s.panelImg} />

          <p style={s.panelNote}>
            ↑ Rendered from raw <code>ArrayBuffer</code> received as{' '}
            <code>responseType: &apos;arraybuffer&apos;</code> — no base64 encoding involved.
          </p>
        </div>
      )}

      {/* Image Grid */}
      <div style={s.grid}>
        {images.map((img) => (
          <div key={img.id} style={s.card}>
            {/* Thumbnail — served directly as binary from the backend */}
            <div style={s.thumbBox}>
              <img
                src={`${BASE}/api/images/${img.id}`}
                alt={img.name}
                style={s.thumb}
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            </div>

            {/* Info */}
            <div style={s.info}>
              <p style={s.name} title={img.name}>{img.name}</p>
              <p style={s.meta}>{img.mime_type}</p>
              <p style={s.meta}>{(img.size / 1024).toFixed(1)} KB</p>
              <p style={s.meta}>{new Date(img.created_at).toLocaleString()}</p>
              <p style={s.idRow}>
                ID: <code style={s.idCode}>{img.id.slice(0, 8)}…</code>
              </p>
            </div>

            {/* Actions */}
            <div style={s.cardFooter}>
              <button
                style={s.btnBinary}
                onClick={() => getBinary(img)}
                disabled={fetchingId === img.id}
                title="Fetch this image as raw binary from GET /api/images/:id"
              >
                {fetchingId === img.id ? '…' : '⬇ Get Binary'}
              </button>
              <button
                style={s.btnDelete}
                onClick={() => deleteImage(img)}
                title="Delete from Supabase"
              >
                🗑
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function Badge({ label, value }) {
  return (
    <span style={b.badge}>
      <span style={b.label}>{label}:</span>
      <span style={b.value}>{value}</span>
    </span>
  );
}

const b = {
  badge: {
    display: 'inline-flex',
    gap: 6,
    alignItems: 'center',
    background: '#111c30',
    border: '1px solid #1e3050',
    borderRadius: 6,
    padding: '4px 10px',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  label: { color: '#5070a0' },
  value: { color: '#90c0ff' },
};

const s = {
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 14,
    padding: '60px 0',
    color: '#505062',
    fontSize: 15,
  },

  // Binary panel
  panel: {
    background: '#0e1624',
    border: '1px solid #1e3050',
    borderRadius: 14,
    padding: 22,
    marginBottom: 28,
  },
  panelHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
    gap: 8,
    flexWrap: 'wrap',
  },
  closeBtn: {
    background: 'transparent',
    color: '#506070',
    fontSize: 18,
    padding: '0 4px',
    lineHeight: 1,
  },
  badges: { display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  panelImg: {
    display: 'block',
    maxWidth: '100%',
    maxHeight: 220,
    objectFit: 'contain',
    borderRadius: 8,
    border: '1px solid #1e3050',
    marginBottom: 12,
  },
  panelNote: {
    fontSize: 12,
    color: '#404858',
    fontFamily: 'monospace',
    lineHeight: 1.6,
  },

  // Grid
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
    gap: 16,
  },
  card: {
    background: '#16161e',
    border: '1px solid #22222e',
    borderRadius: 12,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  thumbBox: {
    height: 148,
    background: '#0d0d12',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumb: { width: '100%', height: '100%', objectFit: 'cover' },
  info: { padding: '12px 14px', flex: 1 },
  name: {
    fontSize: 13,
    fontWeight: 600,
    color: '#c8c8e0',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    marginBottom: 5,
  },
  meta:   { fontSize: 11, color: '#50505e', lineHeight: 1.7 },
  idRow:  { fontSize: 11, color: '#404052', marginTop: 6 },
  idCode: {
    background: '#0f0f16',
    padding: '1px 5px',
    borderRadius: 4,
    color: '#7070a0',
  },

  cardFooter: {
    display: 'flex',
    gap: 8,
    padding: '10px 14px',
    borderTop: '1px solid #1e1e28',
    alignItems: 'center',
  },
  btnBinary: {
    flex: 1,
    background: '#0e1e40',
    color: '#60aaff',
    padding: '7px 0',
    borderRadius: 7,
    fontSize: 12,
  },
  btnDelete: {
    background: '#2a1010',
    color: '#f87171',
    padding: '7px 10px',
    borderRadius: 7,
    fontSize: 14,
  },
};
