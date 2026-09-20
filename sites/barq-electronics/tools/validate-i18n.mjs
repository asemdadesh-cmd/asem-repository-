/* Fails if the two dictionaries have drifted apart. Run: node tools/validate-i18n.mjs */
import { missingKeys } from '../assets/js/i18n.js';
const { missingInAr, missingInEn, total } = missingKeys();
if (missingInAr.length) console.log('Missing in Arabic:', missingInAr.join(', '));
if (missingInEn.length) console.log('Missing in English:', missingInEn.join(', '));
console.log(`${total} keys per language.`);
const bad = missingInAr.length + missingInEn.length;
console.log(bad ? `${bad} key(s) out of sync` : 'Dictionaries in sync.');
process.exit(bad ? 1 : 0);
