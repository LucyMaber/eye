#!/usr/bin/env node
/* index.js
   This CLI tool accepts a URL and an optional flag “--mastodon”
   It extracts an “identifier” from the URL (using content.js) and
   then loads bundled Bloom filters (from data files) to check whether
   the identifier is “transphobic” or “t‑friendly”.
*/

const fs = require('fs');
const path = require('path');
const { getIdentifierFromURLImpl, tryParseURL } = require('./content');
const { BloomFilter, CombinedBloomFilter } = require('./bloomfilter');

// --- Utility functions for loading bundled bloom filter data ---

// Re-create a CombinedBloomFilter from a binary buffer.
// (The bundled data is assumed to be two parts: the first part of fixed size and the remainder.)
function loadBloomFilterFromBuffer(name, dataBuffer) {
  // The extension code uses a split index of 287552 bytes.
  const splitIndex = 287552;
  if (dataBuffer.length < splitIndex) {
    throw new Error("Bloom filter data size too small.");
  }
  const part1Buffer = dataBuffer.slice(0, splitIndex);
  const part2Buffer = dataBuffer.slice(splitIndex);
  // Create Int32Array views (note: Node’s Buffer shares an ArrayBuffer)
  const part1 = new Int32Array(part1Buffer.buffer, part1Buffer.byteOffset, part1Buffer.byteLength / 4);
  const part2 = new Int32Array(part2Buffer.buffer, part2Buffer.byteOffset, part2Buffer.byteLength / 4);
  const combined = new CombinedBloomFilter();
  combined.name = name;
  combined.parts = [
    new BloomFilter(part1, 20),
    new BloomFilter(part2, 21)
  ];
  return combined;
}

// Test function (as in background.js)
function testBloomFilter(bloomFilter, id) {
  if (bloomFilter.test(id))
    return true;
  if (id.startsWith('youtube.com/@') && bloomFilter.test(id.replace('/@', '/c/')))
    return true;
  return false;
}

// Load a bundled bloom filter from a file in the "data" folder.
function loadBloomFilterBundled(name) {
  const filePath = path.join(__dirname, 'data', `${name}.dat`);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Bloom filter file not found: ${filePath}`);
  }
  const dataBuffer = fs.readFileSync(filePath);
  return loadBloomFilterFromBuffer(name, dataBuffer);
}

// --- CLI argument parsing ---

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Usage: checkurl <url> [--mastodon]");
  process.exit(1);
}

const inputUrl = args[0];
const isMastodon = args.includes('--mastodon');

const urlObj = tryParseURL(inputUrl);
if (!urlObj) {
  console.error("Invalid URL");
  process.exit(1);
}

// --- Get the identifier from the URL ---
let identifier = getIdentifierFromURLImpl(urlObj);
if (!identifier) {
  console.log("No identifier extracted from URL.");
  process.exit(0);
}

// If the mastodon flag is set and the identifier equals the host, then ignore.
if (isMastodon && identifier === urlObj.host) {
  console.log("Mastodon flag set and identifier equals host. No label.");
  process.exit(0);
}

// --- Load bundled bloom filters (t‑friendly and transphobic) ---
let tfriendly, transphobic;
try {
  tfriendly = loadBloomFilterBundled('t-friendly');
  transphobic = loadBloomFilterBundled('transphobic');
} catch (e) {
  console.error("Error loading bloom filters:", e.message);
  process.exit(1);
}

// --- Test the identifier against both filters ---
const isTFriendly = testBloomFilter(tfriendly, identifier);
const isTransphobic = testBloomFilter(transphobic, identifier);

// The original logic (in background.js) chooses a label only if exactly one filter fires.
let label = 'none';
if (isTransphobic !== isTFriendly) {
  label = isTransphobic ? 'transphobic' : 't-friendly';
}

console.log(`URL: ${inputUrl}`);
console.log(`Identifier: ${identifier}`);
console.log(`Label: ${label}`);
