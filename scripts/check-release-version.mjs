import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const tag = process.env.GITHUB_REF_NAME || process.argv[2] || "";
const expected = `v${pkg.version}`;

if (tag !== expected) {
  console.error(`Release tag must match package.json version: expected ${expected}, got ${tag || "(empty)"}`);
  process.exit(1);
}

console.log(`Release tag ${tag} matches package version ${pkg.version}.`);
