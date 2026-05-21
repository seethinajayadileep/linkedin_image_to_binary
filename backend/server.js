import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { createClient } from '@supabase/supabase-js';

// ─── Supabase client ────────────────────────────────────────────────────────
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY   // service-role bypasses RLS
);

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'images';

// ─── Multer (memory storage – no temp files on disk) ────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },          // 10 MB max
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'));
    }
    cb(null, true);
  },
});

// ─── Express app ────────────────────────────────────────────────────────────
const app  = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// ────────────────────────────────────────────────────────────────────────────
// POST /api/upload
// Receives multipart/form-data with field "image"
// Uploads binary to Supabase Storage, saves metadata to DB
// ────────────────────────────────────────────────────────────────────────────
app.post('/api/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const { originalname, mimetype, buffer, size } = req.file;

    // Unique path inside the bucket
    const storagePath = `${Date.now()}-${originalname.replace(/\s+/g, '_')}`;

    // 1. Push binary to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, buffer, { contentType: mimetype, upsert: false });

    if (uploadError) throw uploadError;

    // 2. Save metadata to the images table
    const { data, error: dbError } = await supabase
      .from('images')
      .insert({ name: originalname, storage_path: storagePath, mime_type: mimetype, size })
      .select()
      .single();

    if (dbError) throw dbError;

    return res.status(201).json({ message: 'Image uploaded successfully', image: data });
  } catch (err) {
    console.error('[upload]', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ────────────────────────────────────────────────────────────────────────────
// GET /api/images
// Returns JSON array of all image metadata rows
// ────────────────────────────────────────────────────────────────────────────
app.get('/api/images', async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('images')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return res.json(data);
  } catch (err) {
    console.error('[list]', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ────────────────────────────────────────────────────────────────────────────
// GET /api/images/:id
// Returns the RAW BINARY data of a single image
// Response headers: Content-Type, Content-Length, Content-Disposition
// ────────────────────────────────────────────────────────────────────────────
app.get('/api/images/:id', async (req, res) => {
  try {
    // Step 1 – fetch metadata from DB
    const { data: meta, error: metaErr } = await supabase
      .from('images')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (metaErr || !meta) {
      return res.status(404).json({ error: 'Image not found' });
    }

    // Step 2 – download binary from Supabase Storage
    const { data: fileData, error: dlErr } = await supabase.storage
      .from(BUCKET)
      .download(meta.storage_path);

    if (dlErr) throw dlErr;

    // Step 3 – convert Blob → Node.js Buffer
    const buffer = Buffer.from(await fileData.arrayBuffer());

    // Step 4 – send raw binary with proper headers
    res.set('Content-Type', meta.mime_type);
    res.set('Content-Length', buffer.length);
    res.set('Content-Disposition', `inline; filename="${meta.name}"`);
    return res.send(buffer);
  } catch (err) {
    console.error('[get-binary]', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ────────────────────────────────────────────────────────────────────────────
// DELETE /api/images/:id
// Removes file from Storage and metadata row from DB
// ────────────────────────────────────────────────────────────────────────────
app.delete('/api/images/:id', async (req, res) => {
  try {
    const { data: meta, error: metaErr } = await supabase
      .from('images')
      .select('storage_path')
      .eq('id', req.params.id)
      .single();

    if (metaErr || !meta) {
      return res.status(404).json({ error: 'Image not found' });
    }

    // Remove from storage first
    const { error: storageErr } = await supabase.storage
      .from(BUCKET)
      .remove([meta.storage_path]);

    if (storageErr) throw storageErr;

    // Then remove metadata row
    const { error: dbErr } = await supabase
      .from('images')
      .delete()
      .eq('id', req.params.id);

    if (dbErr) throw dbErr;

    return res.json({ message: 'Image deleted' });
  } catch (err) {
    console.error('[delete]', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ─── Start ──────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅  Image Vault API running → http://localhost:${PORT}`);
});
