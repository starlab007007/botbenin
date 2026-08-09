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
let after = before.replace(
  /\/privatia\/app\.js\?v=[^"']+/g,
  `/privatia/app.js?v=${fingerprint}`,
);

// Les anciens href GitHub restent uniquement comme fallback dans le fichier source.
// En production ils sont neutralisés avant publication; le contrôleur app.js les
// remplace par les URL same-origin /privatia/downloads/... selon Windows ou Mac.
after = after.replace(
  /href="https:\/\/github\.com\/zimesongbian007\/privatai\/releases"\s+target="_blank"\s+rel="noopener"/g,
  'href="#download"',
);

after = after.replace(
  /href="https:\/\/github\.com\/zimesongbian007\/privatai"\s+target="_blank"\s+rel="noopener"/g,
  'href="https://bot.bj"',
);

if (after === before) {
  throw new Error('Aucune transformation PrivatAI appliquée après build.');
}

if (after.includes('github.com/zimesongbian007/privatai')) {
  throw new Error('Une navigation GitHub PrivatAI subsiste dans la landing de production.');
}

fs.writeFileSync(htmlFile, after, 'utf8');
console.log(`✅ PrivatAI landing: app.js fingerprint ${fingerprint}.`);
console.log('✅ PrivatAI landing: aucun téléchargement ne navigue vers GitHub.');
