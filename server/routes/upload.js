const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { supabase, isEnabled } = require('../lib/supabase');

const uploadDir = path.join(__dirname, '../../public/uploads');
const BUCKET = 'uploads';

// Safe directory initialization
try {
  if (!isEnabled() && !fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
} catch (e) {
  // Ignored if running on read-only serverless filesystem like Vercel
}

/**
 * POST /api/upload
 * Accepts { data: "data:image/png;base64,...", filename: "image.png" }
 * Saves file to Supabase Storage (or returns data URL / local file)
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

    // 1. Try Supabase Storage if configured
    if (isEnabled()) {
      try {
        const { error } = await supabase.storage
          .from(BUCKET)
          .upload(uniqueName, buffer, { contentType: mimeType, upsert: false });
        if (!error) {
          const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(uniqueName);
          return res.json({
            success: true,
            url: publicData.publicUrl,
            filename: uniqueName,
            sizeBytes: buffer.length
          });
        }
      } catch (sbErr) {
        console.warn('Supabase storage upload failed, falling back to data URL:', sbErr.message);
      }
    }

    // 2. On Vercel / serverless:
    // Return the base64 data URL directly so image works immediately with zero disk write dependency
    if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
      return res.json({
        success: true,
        url: data,
        filename: uniqueName,
        sizeBytes: buffer.length
      });
    }

    // 3. Local development fallback: write to public/uploads
    try {
      const filePath = path.join(uploadDir, uniqueName);
      fs.writeFileSync(filePath, buffer);
      return res.json({
        success: true,
        url: `/uploads/${uniqueName}`,
        filename: uniqueName,
        sizeBytes: buffer.length
      });
    } catch (fsErr) {
      // If filesystem is read-only or write fails, return the data URL safely
      return res.json({
        success: true,
        url: data,
        filename: uniqueName,
        sizeBytes: buffer.length
      });
    }
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
