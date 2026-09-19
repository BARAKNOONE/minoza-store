const express = require('express');
const crypto = require('crypto');
const store = require('../lib/store');

const router = express.Router();
const SECRET = process.env.ADMIN_JWT_SECRET || 'minoza-store-secret-token-key-2026';

// ---------------------------------------------------------------------------
// Security & Crypto Helpers
// ---------------------------------------------------------------------------

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(':')) return false;
  try {
    const [salt, key] = storedHash.split(':');
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(key, 'hex'), Buffer.from(hash, 'hex'));
  } catch (e) {
    return false;
  }
}

function createToken(admin) {
  const exp = Date.now() + (7 * 24 * 60 * 60 * 1000); // 7 days
  const payload = Buffer.from(JSON.stringify({
    id: admin.id,
    username: admin.username,
    name: admin.name,
    role: admin.role,
    exp
  })).toString('base64url');

  const sig = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifyToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  try {
    const [payload, sig] = token.split('.');
    const expectedSig = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) return null;

    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (data.exp && Date.now() > data.exp) return null;
    return data;
  } catch (e) {
    return null;
  }
}

function requireAdminAuth(req, res, next) {
  const authHeader = req.headers.authorization || req.headers['x-admin-token'];
  let token = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  } else if (authHeader) {
    token = authHeader;
  }

  const session = verifyToken(token);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized: กรุณาเข้าสู่ระบบ Admin ก่อนใช้งาน', requireLogin: true });
  }

  req.admin = session;
  next();
}

// ---------------------------------------------------------------------------
// Auth Endpoints
// ---------------------------------------------------------------------------

// POST /api/admin/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: 'กรุณากรอก Username และ Password ให้ครบถ้วน' });
    }

    const admin = await store.getAdminByUsername(username);
    if (!admin) {
      return res.status(401).json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
    }

    const valid = verifyPassword(password, admin.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
    }

    const token = createToken(admin);
    res.json({
      success: true,
      token,
      user: {
        id: admin.id,
        username: admin.username,
        name: admin.name,
        role: admin.role
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/me
router.get('/me', requireAdminAuth, (req, res) => {
  res.json({
    success: true,
    user: req.admin
  });
});

// POST /api/admin/logout
router.post('/logout', (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

// ---------------------------------------------------------------------------
// Admin Users Management Endpoints (CRUD)
// ---------------------------------------------------------------------------

// GET /api/admin/users
router.get('/users', requireAdminAuth, async (req, res) => {
  try {
    const users = await store.getAdmins();
    res.json({ success: true, users });
  } catch (error) {
    console.error('Get admin users error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/admin/users (Create new Admin)
router.post('/users', requireAdminAuth, async (req, res) => {
  try {
    const { username, password, name, role } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: 'กรุณากรอก Username และ Password' });
    }

    const cleanUsername = username.trim().toLowerCase();
    if (cleanUsername.length < 3) {
      return res.status(400).json({ error: 'Username ต้องมีอย่างน้อย 3 ตัวอักษร' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password ต้องมีความยาวอย่างน้อย 6 ตัวอักษร' });
    }

    const existing = await store.getAdminByUsername(cleanUsername);
    if (existing) {
      return res.status(409).json({ error: `ชื่อผู้ใช้ "${cleanUsername}" มีอยู่ในระบบแล้ว` });
    }

    const passwordHash = hashPassword(password);
    const newAdmin = await store.createAdmin({
      username: cleanUsername,
      passwordHash,
      name: name ? name.trim() : cleanUsername,
      role: role || 'admin'
    });

    res.status(201).json({ success: true, user: newAdmin });
  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', requireAdminAuth, async (req, res) => {
  try {
    const targetId = req.params.id;
    if (req.admin && req.admin.id === targetId) {
      return res.status(400).json({ error: 'ไม่สามารถลบบัญชีของตัวเองขณะกำลังใช้งานอยู่ได้' });
    }

    await store.deleteAdmin(targetId);
    res.json({ success: true, message: 'ลบผู้ดูแลระบบเรียบร้อยแล้ว' });
  } catch (error) {
    console.error('Delete admin error:', error);
    res.status(400).json({ error: error.message });
  }
});

module.exports = {
  router,
  requireAdminAuth
};
