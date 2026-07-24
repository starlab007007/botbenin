import fs from 'node:fs';
import vm from 'node:vm';

const root = new URL('../public/fa/', import.meta.url);
const packFiles = [
  'corpus-pack-init-v14.js',
  'corpus-pack-0-v14.js',
  'corpus-pack-1-v14.js',
  'corpus-pack-2-v14.js',
  'corpus-pack-3-v14.js',
  'corpus-pack-4-v14.js',
];
const storage = new Map();
const context = {
  window: {},
  console,
  atob,
  Uint8Array,
  Blob,
  DecompressionStream,
  Response,
  localStorage: {
    getItem: (key) => storage.get(key) || null,
    setItem: (key, value) => storage.set(key, value),
  },
};
vm.createContext(context);
for (const file of packFiles) {
  const source = fs.readFileSync(new URL(file, root), 'utf8');
  vm.runInContext(source, context, { filename: file });
}
vm.runInContext(fs.readFileSync(new URL('corpus-loader-v14.js', root), 'utf8'), context, { filename: 'corpus-loader-v14.js' });
const corpus = await context.window.FA_BOOK_CORPUS_READY;
const documentedKeys = Object.keys(corpus.entries || {});
const missingKeys = corpus.missing || [];
const allKeys = new Set([...documentedKeys, ...missingKeys]);

const bases = ['GBE', 'GOUDA', 'LETE', 'LOSSO', 'TOULA', 'TCHE', 'DI', 'ABLA', 'SA', 'WOLI', 'FOU', 'TROUKPIN', 'WLIN', 'KA', 'AKLAN', 'YEKOU'];
const expected = bases.flatMap((first) => bases.map((second) => `${first}|${second}`));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(corpus.version === '2026-07-23-corpus-book-256-v14', `Version inattendue: ${corpus.version}`);
assert(corpus.documented_count === 237, `Entrées documentées: ${corpus.documented_count}/237`);
assert(corpus.missing_count === 19, `Entrées manquantes: ${corpus.missing_count}/19`);
assert(documentedKeys.length === 237, `Clés documentées: ${documentedKeys.length}/237`);
assert(missingKeys.length === 19, `Clés manquantes: ${missingKeys.length}/19`);
assert(allKeys.size === 256, `Matrice totale: ${allKeys.size}/256`);
for (const key of expected) assert(allKeys.has(key), `Clé absente: ${key}`);
for (const key of documentedKeys) {
  const entry = corpus.entries[key];
  assert(Number.isInteger(entry.number) && entry.number >= 1 && entry.number <= 237, `Numéro invalide: ${key}`);
  assert(typeof entry.text === 'string' && entry.text.trim().length > 20, `Texte vide/court: ${key}`);
  assert(Number.isInteger(entry.pdf_page), `Page absente: ${key}`);
  const finalParagraph = entry.text.trim().split(/\n\n+/).at(-1).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
  assert(!/^LES DERIVE/.test(finalParagraph), `En-tête de section attaché à ${key}`);
}
assert(corpus.entries['TOULA|WLIN']?.number === 184, 'TOULA|WLIN doit pointer vers l’entrée 184');
assert(corpus.entries['YEKOU|TROUKPIN']?.number === 41, 'YEKOU|TROUKPIN doit pointer vers l’entrée 41');
assert(corpus.entries['TCHE|FOU']?.number === 237, 'TCHE|FOU doit pointer vers l’entrée 237');
assert(!corpus.entries['YEKOU|TROUKPIN'].text.startsWith('TRUNKPIN '), 'Fragment de titre résiduel dans YEKOU|TROUKPIN');
assert(!corpus.entries['AKLAN|ABLA'].text.startsWith('ABLA AKLAN'), 'Fragment de titre résiduel dans AKLAN|ABLA');
assert(missingKeys.includes('WLIN|TOULA'), 'WLIN|TOULA doit être signalé manquant');
assert(missingKeys.includes('FOU|GBE'), 'FOU|GBE doit être signalé manquant');

const index = fs.readFileSync(new URL('index.html', root), 'utf8');
const loaderPosition = index.indexOf('corpus-loader-v14.js');
const authPosition = index.indexOf('auth-bridge.js');
const enforcementPosition = index.indexOf('corpus-enforcement-v14.js');
const appPosition = index.indexOf('app.js');
assert(loaderPosition >= 0, 'Loader corpus absent de index.html');
assert(loaderPosition < authPosition && authPosition < enforcementPosition && enforcementPosition < appPosition, 'Ordre des scripts corpus/auth/app invalide');
assert(index.includes('20260724-corpus-v15'), 'Cache V15 non activé');

const loader = fs.readFileSync(new URL('corpus-loader-v14.js', root), 'utf8');
assert(loader.includes('Interprétation intégrale - ${displayedName}'), 'Nouveau titre de l’interprétation intégrale absent');
assert(loader.includes("PRESENTATION_VERSION = '2026-07-24-corpus-presentation-v15'"), 'Version de présentation V15 absente');
assert(loader.includes('corpus_presentation_version'), 'Migration du journal V15 absente');
assert(loader.includes('cleanStoredAnswer'), 'Nettoyage des anciennes références absent');

const enforcement = fs.readFileSync(new URL('corpus-enforcement-v14.js', root), 'utf8');
assert(enforcement.includes('19 signes sur 256'), 'Message des 19 signes absent');
assert(enforcement.includes('isInitialReading'), 'Contrôle de la première lecture absent');
assert(enforcement.includes('exactReading(entry, displayedName)'), 'Lecture exacte initiale absente');
assert(enforcement.includes('Interprétation intégrale - ${displayedName}'), 'Titre intégral sans le mot livre absent');
assert(enforcement.includes('cleanAnswer'), 'Nettoyage global des réponses absent');
assert(enforcement.includes('PROFILES'), 'Profils dynamiques des payloads absents');
assert(enforcement.includes('free_question'), 'Traitement des questions libres absent');
assert(enforcement.includes('analysis_contract'), 'Contrat d’analyse IA absent');
assert(enforcement.includes('use_exact_interpretation_as_primary_basis: true'), 'Ancrage sur l’interprétation intégrale absent');
assert(enforcement.includes('contextualize_with_consultation: true'), 'Contextualisation de la consultation absente');
assert(enforcement.includes('no_generic_base_sign_combination: true'), 'Interdiction des combinaisons génériques absente');
assert(enforcement.includes('no_source_reference_in_answer: true'), 'Suppression des références dans les analyses absente');
assert(enforcement.includes('do_not_mention_book: true'), 'Interdiction du mot livre absente');
assert(enforcement.includes('min_words: profile.minWords'), 'Longueur minimale dynamique absente');
assert(enforcement.includes('max_words: profile.maxWords'), 'Longueur maximale dynamique absente');

console.log(JSON.stringify({
  status: 'passed',
  version: corpus.version,
  presentation: '2026-07-24-corpus-presentation-v15',
  documented: documentedKeys.length,
  missing: missingKeys.length,
  total: allKeys.size,
  responseRules: {
    initial: 'integral_without_reference',
    payloads: 'ai_contextual_analysis',
    sourceMentions: 'removed',
    wordLimits: 'dynamic',
  },
  samples: {
    'TOULA|WLIN': corpus.entries['TOULA|WLIN'].number,
    'YEKOU|TROUKPIN': corpus.entries['YEKOU|TROUKPIN'].number,
    'TCHE|FOU': corpus.entries['TCHE|FOU'].number,
  },
}, null, 2));