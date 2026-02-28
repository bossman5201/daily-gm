const fs = require('fs');
const solc = require('solc');

const sourceCode = fs.readFileSync('FlatDailyGM.sol', 'utf8');

const input = {
    language: 'Solidity',
    sources: {
        'FlatDailyGM.sol': {
            content: sourceCode
        }
    },
    settings: {
        evmVersion: 'paris',  // THIS WAS THE MISSING KEY! Base deployed on `paris` equivalent.
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

fs.writeFileSync('DailyGM-Standard-Json.json', JSON.stringify(input, null, 2));
console.log('Successfully generated PERFECT DailyGM-Standard-Json.json!');
