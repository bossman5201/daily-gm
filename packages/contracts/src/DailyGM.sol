// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

contract DailyGM is Ownable, ReentrancyGuard, Pausable {
    mapping(address => uint256) public lastGMTime;
    mapping(address => uint256) public currentStreak;
    mapping(address => uint256) public totalGMs;
    mapping(address => uint256) public longestStreak;
    mapping(address => uint256) public brokenStreak; // Stores the streak that was just lost
    
    // 0.000015 ETH (~$0.05) protocol fee
    // 0.000025 ETH (~$0.08) protocol fee
    uint256 public protocolFee = 0.000025 ether;
    // 0.0005 ETH (~$1.50) streak restore fee
    uint256 public restoreFee = 0.0005 ether;

    // Global stats
    uint256 public totalGMCount;

    event GM(address indexed user, uint256 streak, uint256 timestamp);
    event StreakRestored(address indexed user, uint256 streak, uint256 timestamp);
    event FeesUpdated(uint256 newProtocolFee, uint256 newRestoreFee);

    constructor() Ownable(msg.sender) {}

    function gm() external payable nonReentrant whenNotPaused {
        // Check protocol fee
        require(msg.value == protocolFee, "Incorrect fee");

        uint256 lastTime = lastGMTime[msg.sender];
        uint256 currentTime = block.timestamp;

        if (lastTime != 0) {
            // Flexible Window: Allow GM after 20 hours (gives 4h buffer before next 'day')
            require(currentTime >= lastTime + 20 hours, "Already GM'd recently");
            
            if (currentTime > lastTime + 48 hours) {
                // Save the streak we are about to lose ONLY if it's within grace period (7 days)
                // If they have been gone for > 9 days (48h + 7 days), they lose it forever.
                if (currentTime - lastTime <= 48 hours + 7 days) {
                    if (currentStreak[msg.sender] > 1) {
                        brokenStreak[msg.sender] = currentStreak[msg.sender];
                    }
                } else {
                    brokenStreak[msg.sender] = 0; // Zombie streak killed
                }
                
                currentStreak[msg.sender] = 1; // Streak broken
            } else {
                currentStreak[msg.sender] += 1; // Streak continues
                // If they continue the streak, clear any old broken streak so they can't exploit it later
                brokenStreak[msg.sender] = 0;
            }
        } else {
            currentStreak[msg.sender] = 1; // First GM
        }

        // Update stats
        totalGMs[msg.sender] += 1;
        totalGMCount += 1;
        if (currentStreak[msg.sender] > longestStreak[msg.sender]) {
            longestStreak[msg.sender] = currentStreak[msg.sender];
        }

        lastGMTime[msg.sender] = currentTime;

        emit GM(msg.sender, currentStreak[msg.sender], currentTime);
    }

    function restoreStreak() external payable nonReentrant whenNotPaused {
        require(msg.value == restoreFee, "Incorrect fee");
        require(brokenStreak[msg.sender] > 0, "No broken streak to restore");

        // Logic: Restore the streak
        // We set their current streak back to what it was
        // And we must treat it as if they GM'd today to keep it valid
        
        currentStreak[msg.sender] = brokenStreak[msg.sender];
        brokenStreak[msg.sender] = 0; // Consume the shield
        
        // Update stats if this restored streak is now the longest (it should be equal or less, but good to check)
        if (currentStreak[msg.sender] > longestStreak[msg.sender]) {
            longestStreak[msg.sender] = currentStreak[msg.sender];
        }
        
        // Important: We do NOT update totalGMs here (restoring is not a new GM action, just a fix)
        // But we DO update lastGMTime to now, effectively counting as their GM for the day?
        // Actually, if they GM'd (resetting to 1) and THEN restore, they have already GM'd today (as 1).
        // So we just upgrade that 1 to X.
        // lastGMTime is already set by the gm() call that triggered the reset.
        // But what if they haven't GM'd yet today?
        // The brokenStreak is only set WHEN they GM and it calculates a reset.
        // So they MUST have just GM'd (reset to 1).
        // So lastGMTime is already correct (now).
        
        emit StreakRestored(msg.sender, currentStreak[msg.sender], block.timestamp);
    }

    function withdraw() external onlyOwner nonReentrant {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Withdraw failed");
    }

    function setFees(uint256 _protocolFee, uint256 _restoreFee) external onlyOwner {
        require(_protocolFee <= 0.01 ether, "Protocol fee too high");
        require(_restoreFee <= 0.05 ether, "Restore fee too high");
        protocolFee = _protocolFee;
        restoreFee = _restoreFee;
        emit FeesUpdated(_protocolFee, _restoreFee);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // Security: Prevent accidental renounceOwnership
    function renounceOwnership() public view override onlyOwner {
        revert("Renouncing ownership is disabled");
    }
}
