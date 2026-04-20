/**
 * Build verification script.
 * Loads models and key controllers (no DB connection) to catch require/syntax errors before deploy.
 * Run: npm run build or npm run vercel-build
 * Exit code: 0 on success, 1 on error (so Vercel build fails).
 */
'use strict';

const path = require('path');
const fs = require('fs');

console.log('Verifying build...');

function requireModels() {
  const modelsDir = path.join(__dirname, '../src/models');
  const entries = fs.readdirSync(modelsDir, { withFileTypes: true });
  for (const e of entries) {
    if (e.isFile() && e.name.endsWith('.js')) {
      require(path.join(modelsDir, e.name));
    }
    if (e.isDirectory() && e.name !== 'newblog') {
      const sub = fs.readdirSync(path.join(modelsDir, e.name), { withFileTypes: true });
      for (const s of sub) {
        if (s.isFile() && s.name.endsWith('.js')) {
          require(path.join(modelsDir, e.name, s.name));
        }
      }
    }
  }
  if (entries.some(e => e.name === 'newblog')) {
    const sub = fs.readdirSync(path.join(modelsDir, 'newblog'), { withFileTypes: true });
    for (const s of sub) {
      if (s.isFile() && s.name.endsWith('.js')) {
        require(path.join(modelsDir, 'newblog', s.name));
      }
    }
  }
}

try {
  requireModels();
  console.log('✓ Models loaded');

  // Controllers that don't require connections/mongo (so no DB connect on load)
  require('../src/controller/homepageFeatureController');
  require('../src/controller/categoryCardController');
  require('../src/controller/promotionalSectionsController');
  console.log('✓ Controllers loaded');

  console.log('Build verification passed.');
  process.exit(0);
} catch (err) {
  console.error('Build verification failed:', err.message);
  if (err.stack) console.error(err.stack);
  process.exit(1);
}
