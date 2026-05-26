#!/usr/bin/env node
// Injects required runtime permissions into android/app/src/main/AndroidManifest.xml
// Run AFTER `npx cap add android` and after each `npx cap sync android`.
import fs from "node:fs";
import path from "node:path";

const manifestPath = path.resolve("android/app/src/main/AndroidManifest.xml");
if (!fs.existsSync(manifestPath)) {
  console.error("[patch-android-manifest] Not found:", manifestPath);
  console.error("Run `npx cap add android` first.");
  process.exit(1);
}

let xml = fs.readFileSync(manifestPath, "utf8");

const perms = [
  '<uses-permission android:name="android.permission.CAMERA" />',
  '<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />',
  '<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />',
  '<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="28" />',
  '<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />',
  '<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />',
];

let added = 0;
for (const p of perms) {
  const name = p.match(/android:name="([^"]+)"/)[1];
  const re = new RegExp(`<uses-permission[^>]*android:name="${name.replace(/\./g, "\\.")}"[^>]*/?>`);
  if (re.test(xml)) continue;
  xml = xml.replace(/(\s*)<application\b/, `\n    ${p}$1<application`);
  added++;
}

// Force debuggable=false (safe no-op if already false / absent)
xml = xml.replace(/android:debuggable="true"/g, 'android:debuggable="false"');

fs.writeFileSync(manifestPath, xml);
console.log(`[patch-android-manifest] OK — ${added} permission(s) added, debuggable forced false.`);
