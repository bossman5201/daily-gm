// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/DailyGM.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

contract DailyGMTest is Test {
    DailyGM public dailyGM;
    address public user1 = address(1);
    address public owner = address(this);

    function setUp() public {
        dailyGM = new DailyGM();
        // Label addresses for better traces
        vm.label(user1, "User 1");
    }

    function testSetFees() public {
        vm.prank(owner);
        uint256 newFee = 0.00002 ether;
        dailyGM.setFees(newFee, 0.001 ether);
        
        assertEq(dailyGM.protocolFee(), newFee);
        assertEq(dailyGM.restoreFee(), 0.001 ether);
    }

    function testProtocolFee() public {
        vm.deal(user1, 1 ether);
        vm.prank(user1);
        
        // Underpaying should fail
        vm.expectRevert(DailyGM.IncorrectFee.selector);
        dailyGM.gm{value: 0.000024 ether}();

        // Overpaying should succeed (Mempool Griefing Fix)
        vm.prank(user1);
        dailyGM.gm{value: 0.000026 ether}();
        assertEq(getCurrentStreak(user1), 1);
    }

    function testGMSuccess() public {
        vm.deal(user1, 1 ether);
        vm.prank(user1);

        dailyGM.gm{value: 0.000025 ether}();
        
        assertEq(getCurrentStreak(user1), 1);
        assertEq(getTotalGMs(user1), 1);
    }
    
    function testStreakReset() public {
        vm.deal(user1, 1 ether);
        vm.startPrank(user1);

        // Day 1
        dailyGM.gm{value: 0.000025 ether}();
        assertEq(getCurrentStreak(user1), 1);
        
        // Day 2 (Flexible window: 21h later is OK)
        vm.warp(block.timestamp + 21 hours);
        dailyGM.gm{value: 0.000025 ether}();
        assertEq(getCurrentStreak(user1), 2);

        // Fast forward 49 hours from last GM (missed the window)
        vm.warp(block.timestamp + 49 hours);
        
        // Trying to GM again, should reset streak
        dailyGM.gm{value: 0.000025 ether}();
        assertEq(getCurrentStreak(user1), 1); // Reset to 1
        assertEq(getBrokenStreak(user1), 2); // Tracked broken streak
        
        vm.stopPrank();
    }

    function testPause() public {
        dailyGM.pause();
        
        vm.deal(user1, 1 ether);
        vm.prank(user1);
        
        vm.expectRevert(Pausable.EnforcedPause.selector);
        dailyGM.gm{value: 0.000025 ether}();
        
        dailyGM.unpause();
        
        vm.prank(user1);
        dailyGM.gm{value: 0.000025 ether}();
        assertEq(getCurrentStreak(user1), 1);
    }

    function testZombieStreak() public {
        vm.deal(user1, 1 ether);
        vm.startPrank(user1);

        // Build streak to 2
        dailyGM.gm{value: 0.000025 ether}();
        vm.warp(block.timestamp + 24 hours);
        dailyGM.gm{value: 0.000025 ether}();
        assertEq(getCurrentStreak(user1), 2);

        // Disappear for 30 days (Zombie Mode)
        vm.warp(block.timestamp + 30 days);
        
        // Return and GM
        dailyGM.gm{value: 0.000025 ether}();
        
        // Verification:
        assertEq(getCurrentStreak(user1), 1); // Reset to 1
        assertEq(getBrokenStreak(user1), 0); // NO broken streak saved (Too late)

        // Try to restore (should fail)
        vm.expectRevert(DailyGM.NoBrokenStreak.selector);
        dailyGM.restoreStreak{value: 0.0005 ether}();
        
        vm.stopPrank();
    }

    function testRenounceOwnership() public {
        vm.prank(owner);
        vm.expectRevert(DailyGM.RenounceOwnershipDisabled.selector);
        dailyGM.renounceOwnership();
    }

    // Helpers to wrap struct access for tests
    function getCurrentStreak(address user) internal view returns (uint32) {
        (, uint32 streak, , , ) = dailyGM.userStats(user);
        return streak;
    }
    function getTotalGMs(address user) internal view returns (uint32) {
        (, , uint32 total, , ) = dailyGM.userStats(user);
        return total;
    }
    function getBrokenStreak(address user) internal view returns (uint32) {
        (, , , , uint32 broken) = dailyGM.userStats(user);
        return broken;
    }
}
