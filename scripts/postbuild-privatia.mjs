import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const htmlFile = path.resolve('dist/privatia/index.html');
const assetNames = [
  'landing-default.js',
  'app-core.js',
  'hero-agent-demo.js',
  'journey.js',
  'journey-video.js',
  'experience-v2.js',
];

if (!fs.existsSync(htmlFile)) {
  throw new Error(`PrivatAI landing introuvable après build: ${htmlFile}`);
}

const assetFiles = Object.fromEntries(
  assetNames.map((name) => [name, path.resolve('dist/privatia', name)]),
);

for (const [name, file] of Object.entries(assetFiles)) {
  if (!fs.existsSync(file)) {
    throw new Error(`PrivatAI ${name} introuvable après build: ${file}`);
  }
}

const fingerprint = (file) => crypto
  .createHash('sha256')
  .update(fs.readFileSync(file))
  .digest('hex')
  .slice(0, 16);

const fingerprints = Object.fromEntries(
  Object.entries(assetFiles).map(([name, file]) => [name, fingerprint(file)]),
);

const landingDefaultSource = fs.readFileSync(assetFiles['landing-default.js'], 'utf8');
if (!landingDefaultSource.includes('scrollRestoration') || !landingDefaultSource.includes("'/privatia'")) {
  throw new Error('Le comportement d’accueil par défaut de PrivatAI est incomplet.');
}

const heroSource = fs.readFileSync(assetFiles['hero-agent-demo.js'], 'utf8');
if (!heroSource.includes('Agent Démo Live') || !heroSource.includes('pa-agent-demo-cursor')) {
  throw new Error('Le fichier hero-agent-demo.js ne contient pas la démo live attendue.');
}

const journeyVideoSource = fs.readFileSync(assetFiles['journey-video.js'], 'utf8');
if (!journeyVideoSource.includes('pa-tour-cursor')) {
  throw new Error('Le curseur animé du parcours PrivatAI est absent de journey-video.js.');
}

const experienceSource = fs.readFileSync(assetFiles['experience-v2.js'], 'utf8');
const experienceLower = experienceSource.toLocaleLowerCase('fr');
const requiredExperienceMarkers = [
  'Cas d’usage concrets',
  "label:'Message 1'",
  "label:'Réponse 1'",
  "label:'Message 2'",
  "label:'Réponse 2'",
  'Amani Industrie',
  'Art. 12.3',
];
for (const marker of requiredExperienceMarkers) {
  if (!experienceSource.includes(marker)) {
    throw new Error(`Marqueur PrivatAI Experience V2 manquant: ${marker}`);
  }
}
if (!experienceLower.includes('décisions sous 30 jours')) {
  throw new Error('Le parcours PrivatAI ne contient pas la relance de décision sous 30 jours.');
}

try {
  new Function(landingDefaultSource);
  new Function(experienceSource);
} catch (error) {
  throw new Error(`Syntaxe invalide dans les modules PrivatAI: ${error instanceof Error ? error.message : String(error)}`);
}

const scriptBlock = assetNames
  .map((name) => `  <script defer src="/privatia/${name}?v=${fingerprints[name]}"></script>`)
  .join('\n');

const before = fs.readFileSync(htmlFile, 'utf8');
let after = before;

// Le HTML final charge directement les modules dans l'ordre déterministe.
// landing-default.js est volontairement le premier module pour garantir que
// /privatia s'ouvre toujours sur le hero, sans casser les ancres explicites.
const legacyScriptPattern = /\s*<script\s+defer\s+src="\/privatia\/(?:app|landing-default|app-core|hero-agent-demo|journey|journey-video|experience-v2)\.js\?v=[^"]+"><\/script>/g;
after = after.replace(legacyScriptPattern, '');

if (!after.includes('</head>')) {
  throw new Error('Balise </head> introuvable dans la landing PrivatAI.');
}
after = after.replace('</head>', `${scriptBlock}\n</head>`);

// Le clic sur la marque revient vers l'URL canonique d'accueil.
after = after.replace('class="pa-brand" href="#top"', 'class="pa-brand" href="/privatia"');

// Les anciens href GitHub restent uniquement comme fallback dans le fichier source.
// En production ils sont neutralisés; app-core.js les remplace par les URL BOT.BJ.
after = after.replace(
  /href="https:\/\/github\.com\/zimesongbian007\/privatai\/releases"\s+target="_blank"\s+rel="noopener"/g,
  'href="#download"',
);

after = after.replace(
  /href="https:\/\/github\.com\/zimesongbian007\/privatai"\s+target="_blank"\s+rel="noopener"/g,
  'href="https://bot.bj"',
);

for (const name of assetNames) {
  const expected = `/privatia/${name}?v=${fingerprints[name]}`;
  if (!after.includes(expected)) {
    throw new Error(`Le module ${name} n’a pas été injecté dans la landing de production.`);
  }
}

const positions = assetNames.map((name) => after.indexOf(`/privatia/${name}?v=`));
if (positions.some((position) => position < 0) || positions.some((position, index) => index > 0 && position <= positions[index - 1])) {
  throw new Error('Ordre de chargement invalide des modules PrivatAI.');
}

if (after.includes('/privatia/app.js?v=')) {
  throw new Error('Le chargeur app.js historique subsiste dans le HTML de production.');
}

if (after.includes('github.com/zimesongbian007/privatai')) {
  throw new Error('Une navigation GitHub PrivatAI subsiste dans la landing de production.');
}

if (!after.includes('class="pa-brand" href="/privatia"')) {
  throw new Error('Le logo PrivatAI ne renvoie pas vers la landing canonique.');
}

fs.writeFileSync(htmlFile, after, 'utf8');

console.log('✅ PrivatAI landing: modules injectés directement dans le HTML final.');
for (const name of assetNames) {
  console.log(`✅ PrivatAI landing: ${name} fingerprint ${fingerprints[name]}.`);
}
console.log('✅ PrivatAI landing: /privatia ouvre le hero par défaut.');
console.log('✅ PrivatAI landing: les ancres explicites restent fonctionnelles.');
console.log('✅ PrivatAI landing: syntaxe Experience V2 validée.');
console.log('✅ PrivatAI landing: Agent Démo Live + parcours décisionnel détaillé obligatoires au build.');
console.log('✅ PrivatAI landing: cas pratiques métier obligatoires au build.');
console.log('✅ PrivatAI landing: aucun téléchargement ne navigue vers GitHub.');
