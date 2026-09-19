/**
 * Data access layer for products / orders / site settings.
 *
 * Uses Supabase (Postgres) when SUPABASE_URL + a Supabase key are set in
 * the environment — required for Vercel, since its filesystem is read-only
 * outside /tmp and writes made by one serverless invocation are not visible
 * to the next one.
 *
 * Falls back to the original local JSON files under server/data/ when
 * Supabase isn't configured, so `npm run dev` keeps working with zero setup.
 */
const fs = require('fs');
const path = require('path');
const { supabase, isEnabled } = require('./supabase');

const productsFilePath = path.join(__dirname, '../data/products.json');
const ordersFilePath = path.join(__dirname, '../data/orders.json');
const settingsFilePath = path.join(__dirname, '../data/site_settings.json');

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8') || JSON.stringify(fallback));
  } catch (e) {
    return fallback;
  }
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

async function getProducts() {
  if (isEnabled()) {
    const { data, error } = await supabase
      .from('products')
      .select('data')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data.map(row => row.data);
  }
  return readJson(productsFilePath, []);
}

async function getProduct(idOrSlug) {
  if (isEnabled()) {
    const { data, error } = await supabase
      .from('products')
      .select('data')
      .or(`id.eq.${idOrSlug},slug.eq.${idOrSlug}`)
      .maybeSingle();
    if (error) throw error;
    return data ? data.data : null;
  }
  const products = readJson(productsFilePath, []);
  return products.find(p => p.id === idOrSlug || p.slug === idOrSlug) || null;
}

async function productExists(id, slug) {
  if (isEnabled()) {
    const { data, error } = await supabase
      .from('products')
      .select('id')
      .or(`id.eq.${id},slug.eq.${slug}`)
      .maybeSingle();
    if (error) throw error;
    return !!data;
  }
  const products = readJson(productsFilePath, []);
  return products.some(p => p.id === id || p.slug === slug);
}

async function createProduct(product) {
  if (isEnabled()) {
    const { error } = await supabase.from('products').insert({
      id: product.id,
      slug: product.slug,
      data: product
    });
    if (error) throw error;
    return product;
  }
  const products = readJson(productsFilePath, []);
  products.unshift(product);
  writeJson(productsFilePath, products);
  return product;
}

async function updateProduct(idOrSlug, updatedProduct) {
  if (isEnabled()) {
    const { data: existing, error: findErr } = await supabase
      .from('products')
      .select('id')
      .or(`id.eq.${idOrSlug},slug.eq.${idOrSlug}`)
      .maybeSingle();
    if (findErr) throw findErr;
    if (!existing) return null;
    const { error } = await supabase
      .from('products')
      .update({ data: updatedProduct, updated_at: new Date().toISOString() })
      .eq('id', existing.id);
    if (error) throw error;
    return updatedProduct;
  }
  const products = readJson(productsFilePath, []);
  const index = products.findIndex(p => p.id === idOrSlug || p.slug === idOrSlug);
  if (index === -1) return null;
  products[index] = updatedProduct;
  writeJson(productsFilePath, products);
  return updatedProduct;
}

async function deleteProduct(idOrSlug) {
  if (isEnabled()) {
    const existing = await getProduct(idOrSlug);
    if (!existing) return null;
    const { error } = await supabase
      .from('products')
      .delete()
      .or(`id.eq.${idOrSlug},slug.eq.${idOrSlug}`);
    if (error) throw error;
    return existing;
  }
  const products = readJson(productsFilePath, []);
  const index = products.findIndex(p => p.id === idOrSlug || p.slug === idOrSlug);
  if (index === -1) return null;
  const deleted = products.splice(index, 1)[0];
  writeJson(productsFilePath, products);
  return deleted;
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

async function getOrders() {
  if (isEnabled()) {
    const { data, error } = await supabase
      .from('orders')
      .select('data')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data.map(row => row.data);
  }
  return readJson(ordersFilePath, []);
}

async function addOrder(order) {
  if (isEnabled()) {
    const { error } = await supabase.from('orders').insert({
      order_id: order.orderId,
      data: order,
      amount: order.amount || 0,
      utm_campaign: order.marketing?.utmCampaign || null
    });
    if (error) throw error;
    return order;
  }
  const orders = readJson(ordersFilePath, []);
  orders.unshift(order);
  writeJson(ordersFilePath, orders);
  return order;
}

// ---------------------------------------------------------------------------
// Site settings (single row)
// ---------------------------------------------------------------------------

async function getSettings() {
  if (isEnabled()) {
    const { data, error } = await supabase
      .from('site_settings')
      .select('data')
      .eq('id', 1)
      .maybeSingle();
    if (error) throw error;
    return data ? data.data : {};
  }
  return readJson(settingsFilePath, {});
}

async function updateSettings(partial) {
  if (isEnabled()) {
    const current = await getSettings();
    const updated = { ...current, ...partial };
    const { error } = await supabase
      .from('site_settings')
      .upsert({ id: 1, data: updated, updated_at: new Date().toISOString() });
    if (error) throw error;
    return updated;
  }
  const current = readJson(settingsFilePath, {});
  const updated = { ...current, ...partial };
  writeJson(settingsFilePath, updated);
  return updated;
}

// ---------------------------------------------------------------------------
// Admin Users
// ---------------------------------------------------------------------------

const adminsFilePath = path.join(__dirname, '../data/admins.json');

async function getAdmins() {
  if (isEnabled()) {
    const { data, error } = await supabase
      .from('admins')
      .select('id, username, name, role, created_at')
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
  }
  const admins = readJson(adminsFilePath, []);
  return admins.map(a => ({
    id: a.id,
    username: a.username,
    name: a.name,
    role: a.role,
    created_at: a.created_at
  }));
}

async function getAdminByUsername(username) {
  if (isEnabled()) {
    const { data, error } = await supabase
      .from('admins')
      .select('*')
      .eq('username', username.toLowerCase().trim())
      .maybeSingle();
    if (error) throw error;
    return data || null;
  }
  const admins = readJson(adminsFilePath, []);
  return admins.find(a => a.username.toLowerCase() === username.toLowerCase().trim()) || null;
}

async function createAdmin({ username, passwordHash, name, role }) {
  const newAdmin = {
    id: 'admin-' + Date.now(),
    username: username.toLowerCase().trim(),
    password_hash: passwordHash,
    name: name || username,
    role: role || 'admin',
    created_at: new Date().toISOString()
  };

  if (isEnabled()) {
    const { error } = await supabase
      .from('admins')
      .insert(newAdmin);
    if (error) throw error;
    return {
      id: newAdmin.id,
      username: newAdmin.username,
      name: newAdmin.name,
      role: newAdmin.role,
      created_at: newAdmin.created_at
    };
  }

  const admins = readJson(adminsFilePath, []);
  admins.push(newAdmin);
  writeJson(adminsFilePath, admins);
  return {
    id: newAdmin.id,
    username: newAdmin.username,
    name: newAdmin.name,
    role: newAdmin.role,
    created_at: newAdmin.created_at
  };
}

async function deleteAdmin(id) {
  if (isEnabled()) {
    const { count } = await supabase
      .from('admins')
      .select('*', { count: 'exact', head: true });
    if (count <= 1) {
      throw new Error('ไม่สามารถลบแอดมินคนสุดท้ายของระบบได้');
    }
    const { error } = await supabase
      .from('admins')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  }

  const admins = readJson(adminsFilePath, []);
  if (admins.length <= 1) {
    throw new Error('ไม่สามารถลบแอดมินคนสุดท้ายของระบบได้');
  }
  const filtered = admins.filter(a => a.id !== id);
  writeJson(adminsFilePath, filtered);
  return true;
}

module.exports = {
  isEnabled,
  getProducts,
  getProduct,
  productExists,
  createProduct,
  updateProduct,
  deleteProduct,
  getOrders,
  addOrder,
  getSettings,
  updateSettings,
  getAdmins,
  getAdminByUsername,
  createAdmin,
  deleteAdmin
};
