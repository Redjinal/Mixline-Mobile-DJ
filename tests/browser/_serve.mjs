/** Dev server: node tests/browser/_serve.mjs [port] */
import {serve} from './_harness.mjs';
const site = await serve(Number(process.argv[2]) || 8080);
console.log(`Mixline dev server: ${site.url}`);
