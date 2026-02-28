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
        evmVersion: 'prague',
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

try {
    const output = JSON.parse(solc.compile(JSON.stringify(input)));
    const bytecode = output.contracts['FlatDailyGM.sol'].DailyGM.evm.bytecode.object;

    console.log("Local Test - Prague Flat Bytecode Prefix:");
    console.log(bytecode.substring(0, 150));

    if (bytecode.includes('5f5ffd')) {
        console.log("\nSuccess! PRAGUE generated the PUSH0 PUSH0 REVERT!");
    } else {
        console.log("\nDarn, still generated expected PUSH0 DUP1 REVERT (5f80fd)");
    }
} catch (e) {
    console.log("Error compiling locally:", e);
}
