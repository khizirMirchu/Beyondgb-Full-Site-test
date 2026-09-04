const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const required = [
  'index.html','pages/about.html','pages/services.html','pages/destinations.html','pages/tours.html',
  'pages/gallery.html','pages/blog.html','pages/faq.html','pages/contact.html','pages/plan.html',
  'pages/destination.html','pages/tour.html','admin/index.html','backend/server.js','backend/database.js',
  'backend/auth.js','css/styles.css','js/app.js','js/seo-performance.js','robots.txt'
];
let failed = false;
for (const rel of required) {
  if (!fs.existsSync(path.join(root, rel))) { console.error(`MISSING: ${rel}`); failed = true; }
}
for (const rel of ['index.html','pages/destination.html','pages/tour.html']) {
  const file = fs.readFileSync(path.join(root, rel), 'utf8');
  if (/loading="(?:eager|lazy) decoding="async"/.test(file)) {
    console.error(`MALFORMED IMG ATTRIBUTE: ${rel}`); failed = true;
  }
}
if (!fs.existsSync(path.join(root, 'backend', 'beyondgb.db'))) {
  console.log('INFO: No local database included in this package (expected for a safe deployment bundle).');
}
if (failed) process.exit(1);
console.log('BeyondGB static QA checks passed.');
