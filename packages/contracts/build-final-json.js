const fs = require('fs');
const solc = require('solc');

const input = JSON.parse(fs.readFileSync('DailyGM-MultiFile-Json.json', 'utf8'));

// The true compiler version discovered from the underlying metadata!
// We MUST not supply "prague" to a verifier that expects `cancun` defaults for 0.8.24.
// By setting it to the true compiler version (0.8.33), we eliminate the manual EVM override problem.
delete input.settings.evmVersion;

fs.writeFileSync('DailyGM-Standard-Json-Final.json', JSON.stringify(input, null, 2));

console.log('Successfully generated Final Multi-File JSON: DailyGM-Standard-Json-Final.json');
