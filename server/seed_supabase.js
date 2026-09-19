require('dotenv').config();
const { supabase, isEnabled } = require('./lib/supabase');
const fs = require('fs');
const path = require('path');

async function seed() {
  if (!isEnabled()) {
    console.error('❌ Supabase is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_KEY in .env');
    process.exit(1);
  }

  const productsPath = path.join(__dirname, 'data/products.json');
  const products = JSON.parse(fs.readFileSync(productsPath, 'utf8'));

  console.log(`📦 Found ${products.length} products to seed into Supabase...`);

  for (const prod of products) {
    const { error } = await supabase.from('products').upsert({
      id: prod.id,
      slug: prod.slug || prod.id,
      data: prod,
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' });

    if (error) {
      console.error(`❌ Failed to seed ${prod.name}:`, error.message);
    } else {
      console.log(`✅ Seeded: ${prod.name} (${prod.id})`);
    }
  }

  console.log('🎉 All products seeded successfully into Supabase!');

  // Seed site_settings
  const settingsPath = path.join(__dirname, 'data/site_settings.json');
  if (fs.existsSync(settingsPath)) {
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    const { error: setErr } = await supabase.from('site_settings').upsert({
      id: 1,
      data: settings,
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' });
    if (setErr) {
      console.error('❌ Failed to seed site_settings:', setErr.message);
    } else {
      console.log('✅ Seeded site_settings successfully!');
    }
  }
}

seed().catch(err => {
  console.error('Fatal seed error:', err);
  process.exit(1);
});
