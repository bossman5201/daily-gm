// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/DailyGM.sol";

contract Deploy is Script {
    function run() external {
        // Retrieve the private key from the .env file
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        // Start recording transactions for broadcasting
        vm.startBroadcast(deployerPrivateKey);

        // Deploy the contract
        DailyGM dailyGM = new DailyGM();

        console.log("DailyGM deployed to:", address(dailyGM));

        // Stop recording
        vm.stopBroadcast();
    }
}
