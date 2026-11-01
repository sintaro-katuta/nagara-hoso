import {execFileSync} from 'node:child_process';
import {copyFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
execFileSync(process.execPath,[path.join(root,'node_modules/@tailwindcss/cli/dist/index.mjs'),'-i','src/styles.css','-o','public/styles.css','--minify'],{cwd:root,stdio:'inherit'});
await copyFile(path.join(root,'node_modules/flowbite/dist/flowbite.min.js'),path.join(root,'public/flowbite.js'));
console.log('Flowbite CSS and local runtime are ready.');
