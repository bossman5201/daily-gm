const fs = require('fs');
const path = require('path');

const targetFile = 'src/DailyGM.sol';
const processedFiles = new Set();
const sources = {};

function resolveImportPath(importStr, currentFileDir) {
    const match = importStr.match(/"([^"]+)"/);
    if (!match) return null;
    let imp = match[1];

    if (imp.startsWith('@openzeppelin/contracts/')) {
        return path.join('lib', 'openzeppelin-contracts', 'contracts', imp.replace('@openzeppelin/contracts/', ''));
    }

    if (imp.startsWith('.')) {
        return path.join(currentFileDir, imp);
    }

    return imp;
}

function processFile(filePath, pseudoPath) {
    const absolutePath = path.resolve(__dirname, filePath);
    if (processedFiles.has(absolutePath)) return;
    processedFiles.add(absolutePath);

    if (!fs.existsSync(absolutePath)) {
        console.error(`Missing file: ${absolutePath}`);
        return;
    }

    const currentDir = path.dirname(absolutePath);
    const content = fs.readFileSync(absolutePath, 'utf8');

    // Add to Standard JSON source keys exactly as they appeared in imports
    sources[pseudoPath] = {
        content: content
    };

    const lines = content.split('\n');
    lines.forEach(line => {
        const trimmed = line.trim();
        if (trimmed.startsWith('import ')) {
            const rawImportMatch = trimmed.match(/"([^"]+)"/);
            if (rawImportMatch) {
                const rawImport = rawImportMatch[1];
                const resolved = resolveImportPath(trimmed, currentDir);
                if (resolved) {
                    const relativeToRoot = path.relative(__dirname, resolved);
                    // OpenZeppelin dependencies refer to internal files relatively or exactly
                    // We must map it so that when solc resolves the import, it matches our `sources` keys.
                    // For Foundry, the source keys are either root relative or library mapped paths.
                    let nextPseudoPath = rawImport;
                    if (rawImport.startsWith('.')) {
                        // Resolve relative import to absolute, then back to pseudo-root
                        const parentDir = path.dirname(pseudoPath);
                        nextPseudoPath = path.posix.join(parentDir, rawImport);
                    } else if (!rawImport.startsWith('@openzeppelin')) {
                        // Fallback
                        nextPseudoPath = relativeToRoot.replace(/\\/g, '/');
                    }

                    processFile(relativeToRoot, nextPseudoPath);
                }
            }
        }
    });
}

// Start with the main contract
processFile(targetFile, 'src/DailyGM.sol');

// Also Foundry remappings are simulated simply by having the exact path keys in 'sources'
// that match what `import "..."` is looking for.

const input = {
    language: 'Solidity',
    sources: sources,
    settings: {
        optimizer: {
            enabled: true,
            runs: 200
        },
        outputSelection: {
            '*': {
                '*': ['*']
            }
        }
    }
};

fs.writeFileSync('DailyGM-MultiFile-Json.json', JSON.stringify(input, null, 2));
console.log('Successfully generated Multi-File JSON: DailyGM-MultiFile-Json.json');
