// Copies node/credential icons (svg, png) into dist/ after tsc.
// Kept dependency-free on purpose (the classic starter uses gulp for this).
const { cpSync, existsSync, statSync } = require('node:fs');
const { join } = require('node:path');

for (const dir of ['nodes', 'credentials']) {
	const from = join(__dirname, dir);
	if (!existsSync(from)) continue;
	cpSync(from, join(__dirname, 'dist', dir), {
		recursive: true,
		filter: (src) => statSync(src).isDirectory() || /\.(svg|png)$/.test(src),
	});
}
console.error('[n8n-nodes-newsflash] icons copied to dist/');
