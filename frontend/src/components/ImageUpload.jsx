import { useState, useRef } from 'react';
import axios from 'axios';

export default function ImageUpload({ onUploaded }) {
  const [file, setFile]         = useState(null);
  const [preview, setPreview]   = useState(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess]   = useState('');
  const [error, setError]       = useState('');
  const inputRef = useRef();

  // ── pick a file ──────────────────────────────────────────────────────────
  const pickFile = (f) => {
    setError('');
    setSuccess('');
    if (!f) return;
    if (!f.type.startsWith('image/')) {
      setError('Please choose an image file (PNG, JPG, GIF, WebP …).');
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setError('File is too large. Maximum size is 10 MB.');
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    pickFile(e.dataTransfer.files[0]);
  };

  // ── upload ────────────────────────────────────────────────────────────────
  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError('');
    setSuccess('');
    try {
      const form = new FormData();
      form.append('image', file);
      const { data } = await axios.post('/api/upload', form);
      onUploaded(data.image);
      setSuccess(`"${file.name}" uploaded successfully!`);
      setFile(null);
      setPreview(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed. Check that the backend is running.');
    } finally {
      setUploading(false);
    }
  };

  const reset = () => { setFile(null); setPreview(null); setError(''); setSuccess(''); };

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div style={s.card}>
      <h2 style={s.cardTitle}>Upload Image</h2>

      {/* Drop-zone or Preview */}
      {!preview ? (
        <div
          style={{ ...s.dropzone, ...(dragging ? s.dzActive : {}) }}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && inputRef.current.click()}
        >
          <span style={s.dzIcon}>🖼️</span>
          <p style={s.dzText}>
            Drag & drop an image here, or <u style={{ color: '#9d8fff' }}>click to browse</u>
          </p>
          <p style={s.dzHint}>PNG · JPG · GIF · WebP — max 10 MB</p>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => pickFile(e.target.files[0])}
          />
        </div>
      ) : (
        <div style={s.previewArea}>
          <img src={preview} alt="preview" style={s.previewImg} />
          <p style={s.fileMeta}>
            <strong style={{ color: '#c0c0d8' }}>{file.name}</strong>
            &ensp;·&ensp;{file.type}
            &ensp;·&ensp;{(file.size / 1024).toFixed(1)} KB
          </p>
          <div style={s.actions}>
            <button style={s.btnUpload} onClick={handleUpload} disabled={uploading}>
              {uploading ? '⏳ Uploading…' : '☁️  Upload to Supabase'}
            </button>
            <button style={s.btnCancel} onClick={reset} disabled={uploading}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Feedback */}
      {success && <p style={s.success}>✅ {success}</p>}
      {error   && <p style={s.error}>⚠️ {error}</p>}
    </div>
  );
}

const s = {
  card: {
    background: '#16161e',
    border: '1px solid #22222e',
    borderRadius: 16,
    padding: 28,
    marginBottom: 36,
  },
  cardTitle: { fontSize: 16, fontWeight: 600, color: '#c0b8ff', marginBottom: 20 },

  dropzone: {
    border: '2px dashed #2e2e40',
    borderRadius: 12,
    padding: '44px 24px',
    textAlign: 'center',
    cursor: 'pointer',
    background: '#0f0f16',
    transition: 'border-color 0.2s, background 0.2s',
    outline: 'none',
  },
  dzActive: { borderColor: '#7c6cf2', background: '#14112a' },
  dzIcon:  { fontSize: 42, display: 'block', marginBottom: 14 },
  dzText:  { fontSize: 14, color: '#8080a0', marginBottom: 6 },
  dzHint:  { fontSize: 12, color: '#505062' },

  previewArea: { textAlign: 'center' },
  previewImg: {
    maxWidth: '100%',
    maxHeight: 300,
    objectFit: 'contain',
    borderRadius: 10,
    border: '1px solid #22222e',
    marginBottom: 14,
  },
  fileMeta: { fontSize: 13, color: '#606074', marginBottom: 18 },

  actions: { display: 'flex', gap: 10, justifyContent: 'center' },
  btnUpload: {
    background: '#6c5de8',
    color: '#fff',
    padding: '10px 26px',
    fontSize: 14,
    borderRadius: 9,
  },
  btnCancel: {
    background: '#1e1e2c',
    color: '#9090b0',
    padding: '10px 20px',
    fontSize: 14,
    borderRadius: 9,
  },

  success: { marginTop: 16, color: '#4ade80', fontSize: 13, textAlign: 'center' },
  error:   { marginTop: 16, color: '#f87171', fontSize: 13, textAlign: 'center' },
};
