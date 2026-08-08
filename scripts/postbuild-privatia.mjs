import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const htmlFile = path.resolve('dist/privatia/index.html');
const scriptFile = path.resolve('dist/privatia/app.js');

if (!fs.existsSync(htmlFile)) {
  throw new Error(`PrivatAI landing introuvable après build: ${htmlFile}`);
}
if (!fs.existsSync(scriptFile)) {
  throw new Error(`PrivatAI app.js introuvable après build: ${scriptFile}`);
}

const fingerprint = crypto
  .createHash('sha256')
  .update(fs.readFileSync(scriptFile))
  .digest('hex')
  .slice(0, 16);

const before = fs.readFileSync(htmlFile, 'utf8');
const after = before.replace(
  /\/privatia\/app\.js\?v=[^"']+/g,
  `/privatia/app.js?v=${fingerprint}`,
);

if (after === before) {
  throw new Error('Référence /privatia/app.js?v=... introuvable dans la landing PrivatAI.');
}

fs.writeFileSync(htmlFile, after, 'utf8');
console.log(`✅ PrivatAI landing: app.js fingerprint ${fingerprint}.`);
