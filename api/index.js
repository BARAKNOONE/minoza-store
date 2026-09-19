// Vercel serverless entry point. Vercel imports this file per request
// instead of running a persistent server; it reuses server/app.js so
// local dev (server/server.js) and production stay identical.
module.exports = require('../server/app');
