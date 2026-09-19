// Local / traditional-host entry point (npm start, npm run dev, a VPS, etc).
// On Vercel, api/index.js imports server/app.js directly instead — Vercel
// runs the app as a serverless function rather than a long-lived listener.
const app = require('./app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🌟 Minoza Store (minozastore.com) is RUNNING!`);
  console.log(`🌐 Local URL: http://localhost:${PORT}`);
  console.log(`📊 Sales Data Stack: http://localhost:${PORT}/api/orders`);
  console.log(`📦 Product Catalog: http://localhost:${PORT}/api/products`);
  console.log(`======================================================\n`);
});
