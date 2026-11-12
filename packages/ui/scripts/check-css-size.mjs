// size-limit's bundler cannot ingest CSS, so the stylesheet budget is checked here.
import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
const LIMIT = 3 * 1024;
const size = gzipSync(readFileSync("dist/styles.css")).length;
console.log(`dist/styles.css: ${size} B gzip (limit ${LIMIT} B)`);
if (size > LIMIT) { console.error("CSS budget exceeded"); process.exit(1); }
