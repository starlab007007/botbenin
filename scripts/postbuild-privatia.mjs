import fs from 'node:fs';
import path from 'node:path';

const file = path.resolve('dist/privatia/index.html');
if (!fs.existsSync(file)) {
  throw new Error(`PrivatAI landing introuvable après build: ${file}`);
}

const before = fs.readFileSync(file, 'utf8');
const after = before.replace(
  /\/privatia\/app\.js\?v=[^"']+/g,
  '/privatia/app.js?v=20260808-download-license-v6',
);

if (after === before) {
  throw new Error('Référence /privatia/app.js?v=... introuvable dans la landing PrivatAI.');
}

fs.writeFileSync(file, after, 'utf8');
console.log('✅ PrivatAI landing: cache app.js invalidé pour le téléchargement direct.');
