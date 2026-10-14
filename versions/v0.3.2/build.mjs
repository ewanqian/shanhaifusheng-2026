import {build} from 'esbuild';
import {mkdir,readFile,writeFile,copyFile} from 'node:fs/promises';

await build({entryPoints:['src/main.js'],bundle:true,minify:true,format:'esm',outfile:'app.js',target:'es2022'});
const html=(await readFile('src/index.html','utf8')).replace(/<script type="importmap">[\s\S]*?<\/script>/,'').replace('src="main.js"','src="app.js?v=0.3.2"');
await writeFile('index.html',html);

await writeFile('.nojekyll','');
console.log('Built self-contained Pages site. Runtime CDN requests: none.');
