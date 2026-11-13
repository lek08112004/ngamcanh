// Developer tool: parse every module, and catch a mistake that is easy to make here:
// a storage call that bypasses js/store.js.
//   node tools/syntax.mjs
import { readdirSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const files = [];
for (const dir of ['js', 'js/shaders', 'tools']) {
  for (const f of readdirSync(dir)) if (/\.m?js$/.test(f)) files.push(join(dir, f));
}
let bad = 0;
for (const file of files) {
  try {
    execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
  } catch (e) {
    bad++;
    console.log(`FAIL ${file}`);
    console.log(String(e.stderr).split(/\r?\n/).slice(0, 6).join('\n'));
  }
  const text = readFileSync(file, 'utf8');
  const inSite = file.startsWith('js') && !file.endsWith('store.js');
  if (inSite && /localStorage\.(get|set|remove)Item/.test(text)) {
    bad++;
    console.log(`FAIL ${file}: talks to localStorage directly; go through js/store.js`);
  }
}
console.log(bad ? `${bad} problem(s)` : `ok   ${files.length} modules parse; storage goes through the store`);
process.exit(bad ? 1 : 0);
