const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { supabase, isEnabled } = require('../lib/supabase');

const uploadDir = path.join(__dirname, '../../public/uploads');
const BUCKET = 'uploads';

// Local fallback dir only needed when Supabase Storage isn't configured
// (e.g. local dev). On Vercel this directory is read-only at runtime, so
// this branch is only ever hit when Supabase is not set up yet.
if (!isEnabled() && !fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

/**
 * POST /api/upload
 * Accepts { data: "data:image/png;base64,...", filename: "image.png" }
 * Saves file to Supabase Storage (or /public/uploads/ locally) and
 * returns { success: true, url: "..." }
 */
router.post('/', async (req, res) => {
  try {
    const { data, filename } = req.body;
    if (!data) {
      return res.status(400).json({ error: 'No image data provided' });
    }

    // Match mime type and base64 payload
    const matches = data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ error: 'Invalid base64 image data' });
    }

    const mimeType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');

    // Determine file extension
    let ext = '.jpg';
    if (mimeType.includes('png')) ext = '.png';
    else if (mimeType.includes('webp')) ext = '.webp';
    else if (mimeType.includes('gif')) ext = '.gif';
    else if (mimeType.includes('svg')) ext = '.svg';

    const safeBase = (filename || 'upload').replace(/[^a-zA-Z0-9_-]/g, '_');
    const uniqueName = `${safeBase}-${Date.now()}${ext}`;

    if (isEnabled()) {
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(uniqueName, buffer, { contentType: mimeType, upsert: false });
      if (error) throw error;

      const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(uniqueName);
      return res.json({
        success: true,
        url: publicData.publicUrl,
        filename: uniqueName,
        sizeBytes: buffer.length
      });
    }

    const filePath = path.join(uploadDir, uniqueName);
    fs.writeFileSync(filePath, buffer);

    const publicUrl = `/uploads/${uniqueName}`;
    res.json({
      success: true,
      url: publicUrl,
      filename: uniqueName,
      sizeBytes: buffer.length
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
