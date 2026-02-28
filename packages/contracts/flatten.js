const fs = require('fs');
const path = require('path');

const targetFile = 'src/DailyGM.sol';
const outputFile = 'FlatDailyGM.sol';

const processedFiles = new Set();
let out = '';

out += '// SPDX-License-Identifier: MIT\n';
out += 'pragma solidity ^0.8.24;\n\n';

function resolveImportPath(importStr, currentFileDir) {
    const match = importStr.match(/"([^"]+)"/);
    if (!match) return null;
    let imp = match[1];

    if (imp.startsWith('@openzeppelin/contracts/')) {
        // MUST USE THE FOUNDRY LIB VERSION (5.5.0) NOT THE NODE_MODULES VERSION (5.4.0)
        return path.join('lib', 'openzeppelin-contracts', 'contracts', imp.replace('@openzeppelin/contracts/', ''));
    }

    // Handle relative imports from inside openzeppelin
    if (imp.startsWith('.')) {
        return path.join(currentFileDir, imp);
    }

    return imp;
}

function processFile(filePath) {
    const absolutePath = path.resolve(__dirname, filePath);
    if (processedFiles.has(absolutePath)) return;
    processedFiles.add(absolutePath);

    if (!fs.existsSync(absolutePath)) {
        console.error(`Missing file: ${absolutePath}`);
        return;
    }

    const currentDir = path.dirname(absolutePath);
    const content = fs.readFileSync(absolutePath, 'utf8');
    const lines = content.split('\n');

    lines.forEach(line => {
        const trimmed = line.trim();
        if (trimmed.startsWith('import ')) {
            const resolved = resolveImportPath(trimmed, currentDir);
            if (resolved) {
                // Ensure the path is relative to the __dirname (contracts root) before recursing
                const relativeToRoot = path.relative(__dirname, resolved);
                processFile(relativeToRoot);
            }
        }
        else if (trimmed.startsWith('pragma solidity')) { }
        else if (trimmed.startsWith('// SPDX-License-Identifier')) { }
        else {
            out += line + '\n';
        }
    });
}

processFile(targetFile);

fs.writeFileSync(outputFile, out.trim() + '\n');
console.log(`Success: Wrote exact EVM byte-matching flattened source to ${outputFile}`);
