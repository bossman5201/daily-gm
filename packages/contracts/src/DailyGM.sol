// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

contract DailyGM is Ownable, ReentrancyGuard, Pausable {
    struct UserStats {
        uint40 lastGMTime;
        uint32 currentStreak;
        uint32 totalGMs;
        uint32 longestStreak;
        uint32 brokenStreak;
    }
    mapping(address => UserStats) public userStats;

    // Referral tracking — stores who referred whom (set once on first GM)
    mapping(address => address) public referrer;

    // Custom Errors
    error IncorrectFee();
    error GMTooSoon();
    error NoBrokenStreak();
    error NoFunds();
    error WithdrawFailed();
    error FeeTooHigh();
    error RenounceOwnershipDisabled();
    
    // 0.000025 ETH (~$0.08) protocol fee
    uint256 public protocolFee = 0.000025 ether;
    // 0.0005 ETH (~$1.50) streak restore fee
    uint256 public restoreFee = 0.0005 ether;

    // Global stats
    uint256 public totalGMCount;

    event GM(address indexed user, uint256 streak, uint256 timestamp);
    event StreakRestored(address indexed user, uint256 streak, uint256 timestamp);
    event FeesUpdated(uint256 newProtocolFee, uint256 newRestoreFee);
    event Milestone(address indexed user, uint256 streak);
    event Referred(address indexed user, address indexed referredBy);

    constructor() Ownable(msg.sender) {}

    function gm(address _referrer) external payable whenNotPaused {
        // Check protocol fee
        if (msg.value != protocolFee) revert IncorrectFee();

        UserStats storage stats = userStats[msg.sender];
        uint256 lastTime = stats.lastGMTime;
        uint256 currentTime = block.timestamp;

        if (lastTime != 0) {
            // Flexible Window: Allow GM after 20 hours (gives 4h buffer before next 'day')
            if (currentTime < lastTime + 20 hours) revert GMTooSoon();
            
            if (currentTime > lastTime + 48 hours) {
                // Save the streak we are about to lose ONLY if it's within grace period (7 days)
                // If they have been gone for > 9 days (48h + 7 days), they lose it forever.
                if (currentTime - lastTime <= 48 hours + 7 days) {
                    if (stats.currentStreak > 1) {
                        stats.brokenStreak = stats.currentStreak;
                    } else {
                        // V3.1 GOD MODE FIX
                        // If they are inside the grace window but their current streak is already 1, 
                        // it means they broke a streak, waited, and broke it again without restoring.
                        // We MUST kill the banked broken streak so they can't exploit it forever.
                        stats.brokenStreak = 0;
                    }
                } else {
                    stats.brokenStreak = 0; // Zombie streak killed
                }
                
                stats.currentStreak = 1; // Streak broken
            } else {
                stats.currentStreak += 1; // Streak continues
                // If they continue the streak, clear any old broken streak so they can't exploit it later
                stats.brokenStreak = 0;
            }
        } else {
            stats.currentStreak = 1; // First GM

            // Record referrer on first GM only
            if (_referrer != address(0) && _referrer != msg.sender) {
                referrer[msg.sender] = _referrer;
                emit Referred(msg.sender, _referrer);
            }
        }

        // Update stats
        stats.totalGMs += 1;
        totalGMCount += 1;
        if (stats.currentStreak > stats.longestStreak) {
            stats.longestStreak = stats.currentStreak;
        }

        stats.lastGMTime = uint40(currentTime);

        emit GM(msg.sender, stats.currentStreak, currentTime);

        // Emit milestone events at key streaks
        if (stats.currentStreak == 7 || stats.currentStreak == 30 ||
            stats.currentStreak == 100 || stats.currentStreak == 365) {
            emit Milestone(msg.sender, stats.currentStreak);
        }
    }

    function restoreStreak() external payable whenNotPaused {
        if (msg.value != restoreFee) revert IncorrectFee();
        UserStats storage stats = userStats[msg.sender];
        if (stats.brokenStreak == 0) revert NoBrokenStreak();

        // Logic: Restore the streak
        // We set their current streak back to what it was
        // And we must treat it as if they GM'd today to keep it valid
        
        stats.currentStreak = stats.brokenStreak;
        stats.brokenStreak = 0; // Consume the shield
        stats.lastGMTime = uint40(block.timestamp); // V3.1 GOD MODE FIX: Prevent Ghost Restore
        
        // Update stats if this restored streak is now the longest (it should be equal or less, but good to check)
        if (stats.currentStreak > stats.longestStreak) {
            stats.longestStreak = stats.currentStreak;
        }
        
        emit StreakRestored(msg.sender, stats.currentStreak, block.timestamp);
    }

    function withdraw() external onlyOwner nonReentrant {
        uint256 balance = address(this).balance;
        if (balance == 0) revert NoFunds();
        (bool success, ) = payable(owner()).call{value: balance}("");
        if (!success) revert WithdrawFailed();
    }

    function setFees(uint256 _protocolFee, uint256 _restoreFee) external onlyOwner {
        if (_protocolFee > 0.01 ether) revert FeeTooHigh();
        if (_restoreFee > 0.05 ether) revert FeeTooHigh();
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
        revert RenounceOwnershipDisabled();
    }
}
