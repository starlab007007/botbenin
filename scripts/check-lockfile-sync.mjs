// Échoue si package.json déclare une dépendance absente de package-lock.json
// (cas des plugins ajoutés à l'export). Ne corrige rien : signale seulement.
import { readFileSync } from "node:fs";
const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const lock = JSON.parse(readFileSync("package-lock.json", "utf8"));
const root = lock.packages?.[""] ?? {};
const missing = [];
for (const field of ["dependencies", "devDependencies", "optionalDependencies"]) {
  for (const [name, range] of Object.entries(pkg[field] ?? {})) {
    if (root[field]?.[name] !== range) missing.push(`${field}: ${name}@${range} (lock: ${root[field]?.[name] ?? "absent"})`);
    else if (!lock.packages?.[`node_modules/${name}`]) missing.push(`${name}: version résolue absente du lockfile`);
  }
}
if (missing.length) {
  console.error("package-lock.json n'est pas synchronisé avec package.json :\n- " + missing.join("\n- "));
  console.error("Corriger avec : npm install --package-lock-only --legacy-peer-deps --no-audit --no-fund");
  process.exit(1);
}
console.log("package-lock.json synchronisé avec package.json.");
