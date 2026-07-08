const fs = require('fs');
const raw = fs.readFileSync('C:/Users/Administrator/.gemini/antigravity-ide/brain/19e59ba2-04a8-45c5-abb7-38fcfb44d8ee/.system_generated/steps/775/content.md', 'utf8');
const lines = raw.split('\n');
let json = '';
let inJson = false;
for (const l of lines) {
  if (l.startsWith('{')) { inJson = true; }
  if (inJson) json += l + '\n';
}
const d = JSON.parse(json.trim());
d.jobs.forEach(j => {
  if (j.conclusion === 'failure') {
    const fail = j.steps.filter(s => s.conclusion === 'failure');
    console.log('FAIL:', j.name, '->', fail.map(s => s.name).join(', '));
  } else {
    console.log('OK:  ', j.name, j.conclusion);
  }
});
