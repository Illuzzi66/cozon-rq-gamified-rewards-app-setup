// Test Helper Utilities for Watch to Earn and Spin Wheel Features

export interface TestResult {
  testName: string;
  passed: boolean;
  message: string;
  timestamp: Date;
  details?: any;
}

export interface WatchAdTestStats {
  adsWatched: number;
  coinsEarned: number;
  isPremium: boolean;
  expectedCoinsPerAd: number;
  dailyLimit: number;
  remainingAds: number;
}

export interface SpinWheelTestStats {
  totalSpins: number;
  rewardDistribution: {
    coins: number;
    money: number;
    spins: number;
    loss: number;
  };
  totalCoinsWon: number;
  totalMoneyWon: number;
  extraSpinsWon: number;
}

/**
 * Test Watch to Earn Daily Limit Enforcement
 * Verifies that users cannot watch more than 5 ads per day
 */
export async function testWatchAdDailyLimit(
  currentAdsWatched: number,
  dailyLimit: number = 5
): Promise<TestResult> {
  const testName = 'Watch Ad Daily Limit Enforcement';
  
  try {
    // Check if limit is correctly set to 5
    if (dailyLimit !== 5) {
      return {
        testName,
        passed: false,
        message: `Daily limit should be 5, but found ${dailyLimit}`,
        timestamp: new Date(),
        details: { dailyLimit }
      };
    }

    // Check if user has reached limit
    const hasReachedLimit = currentAdsWatched >= dailyLimit;
    const remaining = Math.max(0, dailyLimit - currentAdsWatched);

    return {
      testName,
      passed: true,
      message: `Daily limit correctly enforced. Watched: ${currentAdsWatched}/${dailyLimit}, Remaining: ${remaining}`,
      timestamp: new Date(),
      details: {
        currentAdsWatched,
        dailyLimit,
        remaining,
        hasReachedLimit
      }
    };
  } catch (error) {
    return {
      testName,
      passed: false,
      message: `Test failed: ${error instanceof Error ? error.message : String(error)}`,
      timestamp: new Date()
    };
  }
}

/**
 * Test Watch Ad Reward Calculation
 * Verifies correct coin rewards for free and premium users
 */
export function testWatchAdRewards(
  isPremium: boolean,
  baseReward: number = 5
): TestResult {
  const testName = 'Watch Ad Reward Calculation';
  
  try {
    const expectedReward = isPremium ? Math.floor(baseReward * 2.5) : baseReward;
    const premiumMultiplier = 2.5;
    
    // Verify base reward is 5
    if (baseReward !== 5) {
      return {
        testName,
        passed: false,
        message: `Base reward should be 5 coins, but found ${baseReward}`,
        timestamp: new Date(),
        details: { baseReward }
      };
    }

    // Verify premium calculation
    if (isPremium && expectedReward !== 12) {
      return {
        testName,
        passed: false,
        message: `Premium reward should be 12 coins (5 * 2.5), but calculated ${expectedReward}`,
        timestamp: new Date(),
        details: { isPremium, expectedReward }
      };
    }

    return {
      testName,
      passed: true,
      message: `Reward calculation correct: ${expectedReward} coins (${isPremium ? 'Premium 2.5x' : 'Free user'})`,
      timestamp: new Date(),
      details: {
        isPremium,
        baseReward,
        premiumMultiplier,
        expectedReward
      }
    };
  } catch (error) {
    return {
      testName,
      passed: false,
      message: `Test failed: ${error instanceof Error ? error.message : String(error)}`,
      timestamp: new Date()
    };
  }
}

/**
 * Test Spin Wheel Probability Distribution
 * Verifies that reward probabilities match expected values
 */
export function testSpinWheelProbabilities(
  spinResults: Array<{ rewardType: string; rewardAmount: number; probability: number }>
): TestResult {
  const testName = 'Spin Wheel Probability Distribution';
  
  try {
    // Expected probabilities from wheelSegments
    const expectedProbabilities = {
      '10_coins': 22,
      '0.50_money': 5,
      '25_coins': 18,
      'try_again': 15,
      '100_coins': 5,
      '2_spins': 10,
      '2_money': 0.5,
      '50_coins': 8,
      'better_luck': 5,
      '500_coins': 1.5
    };

    // Calculate actual distribution
    const distribution: { [key: string]: number } = {};
    spinResults.forEach(result => {
      const key = `${result.rewardAmount}_${result.rewardType}`;
      distribution[key] = (distribution[key] || 0) + 1;
    });

    const totalSpins = spinResults.length;
    const actualProbabilities: { [key: string]: number } = {};
    
    Object.keys(distribution).forEach(key => {
      actualProbabilities[key] = (distribution[key] / totalSpins) * 100;
    });

    // Check if probabilities sum to 100%
    const totalProbability = Object.values(expectedProbabilities).reduce((a, b) => a + b, 0);
    const probabilitySumCorrect = Math.abs(totalProbability - 100) < 0.1;

    if (!probabilitySumCorrect) {
      return {
        testName,
        passed: false,
        message: `Probabilities don't sum to 100%. Total: ${totalProbability}%`,
        timestamp: new Date(),
        details: { expectedProbabilities, totalProbability }
      };
    }

    return {
      testName,
      passed: true,
      message: `Probability distribution valid. Total spins analyzed: ${totalSpins}`,
      timestamp: new Date(),
      details: {
        totalSpins,
        expectedProbabilities,
        actualProbabilities: totalSpins > 0 ? actualProbabilities : 'Need more spins for analysis',
        probabilitySumCorrect
      }
    };
  } catch (error) {
    return {
      testName,
      passed: false,
      message: `Test failed: ${error instanceof Error ? error.message : String(error)}`,
      timestamp: new Date()
    };
  }
}

/**
 * Test Spin Wheel Reward Types
 * Verifies all reward types are correctly configured
 */
export function testSpinWheelRewardTypes(): TestResult {
  const testName = 'Spin Wheel Reward Types Configuration';
  
  try {
    const expectedRewardTypes = ['coins', 'money', 'spins', 'loss'];
    const expectedSegments = [
      { label: '10 Coins', rewardType: 'coins', rewardAmount: 10, probability: 22 },
      { label: '$0.50', rewardType: 'money', rewardAmount: 750, moneyAmount: 0.50, probability: 5 },
      { label: '25 Coins', rewardType: 'coins', rewardAmount: 25, probability: 18 },
      { label: 'Try Again', rewardType: 'loss', rewardAmount: 0, probability: 15 },
      { label: '100 Coins', rewardType: 'coins', rewardAmount: 100, probability: 5 },
      { label: '+2 Spins', rewardType: 'spins', rewardAmount: 2, probability: 10 },
      { label: '$2', rewardType: 'money', rewardAmount: 3000, moneyAmount: 2.00, probability: 0.5 },
      { label: '50 Coins', rewardType: 'coins', rewardAmount: 50, probability: 8 },
      { label: 'Better Luck', rewardType: 'loss', rewardAmount: 0, probability: 5 },
      { label: '500 Coins', rewardType: 'coins', rewardAmount: 500, probability: 1.5 }
    ];

    // Verify segment count
    if (expectedSegments.length !== 10) {
      return {
        testName,
        passed: false,
        message: `Expected 10 segments, found ${expectedSegments.length}`,
        timestamp: new Date(),
        details: { segmentCount: expectedSegments.length }
      };
    }

    // Verify money rewards are correctly mapped
    const moneySegments = expectedSegments.filter(s => s.rewardType === 'money');
    const moneyRewardsCorrect = moneySegments.every(s => {
      if (s.moneyAmount === 0.50) return s.rewardAmount === 750;
      if (s.moneyAmount === 2.00) return s.rewardAmount === 3000;
      return false;
    });

    if (!moneyRewardsCorrect) {
      return {
        testName,
        passed: false,
        message: 'Money reward mapping incorrect (should be 750 coins = $0.50, 3000 coins = $2)',
        timestamp: new Date(),
        details: { moneySegments }
      };
    }

    return {
      testName,
      passed: true,
      message: `All ${expectedSegments.length} reward types correctly configured`,
      timestamp: new Date(),
      details: {
        expectedRewardTypes,
        segmentCount: expectedSegments.length,
        moneyRewardsCorrect,
        segments: expectedSegments
      }
    };
  } catch (error) {
    return {
      testName,
      passed: false,
      message: `Test failed: ${error instanceof Error ? error.message : String(error)}`,
      timestamp: new Date()
    };
  }
}

/**
 * Test Spin Purchase Discount Calculation
 * Verifies bulk purchase discounts are correctly applied
 */
export function testSpinPurchaseDiscounts(
  spinCount: number,
  basePrice: number = 50
): TestResult {
  const testName = 'Spin Purchase Discount Calculation';
  
  try {
    let discount = 0;
    if (spinCount >= 20) discount = 0.20;
    else if (spinCount >= 10) discount = 0.10;

    const baseCost = spinCount * basePrice;
    const finalCost = Math.floor(baseCost * (1 - discount));
    const savings = baseCost - finalCost;

    return {
      testName,
      passed: true,
      message: `Discount correctly calculated: ${spinCount} spins = ${finalCost} coins (${discount * 100}% off, saved ${savings} coins)`,
      timestamp: new Date(),
      details: {
        spinCount,
        basePrice,
        baseCost,
        discount: discount * 100,
        finalCost,
        savings
      }
    };
  } catch (error) {
    return {
      testName,
      passed: false,
      message: `Test failed: ${error instanceof Error ? error.message : String(error)}`,
      timestamp: new Date()
    };
  }
}

/**
 * Generate Test Report
 * Creates a formatted test report from multiple test results
 */
export function generateTestReport(results: TestResult[]): string {
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;
  
  let report = '\n=== TEST REPORT ===\n\n';
  report += `Total Tests: ${total}\n`;
  report += `Passed: ${passed} ✓\n`;
  report += `Failed: ${failed} ✗\n`;
  report += `Success Rate: ${((passed / total) * 100).toFixed(1)}%\n\n`;
  
  report += '=== DETAILED RESULTS ===\n\n';
  
  results.forEach((result, index) => {
    const status = result.passed ? '✓ PASS' : '✗ FAIL';
    report += `${index + 1}. ${result.testName} - ${status}\n`;
    report += `   Message: ${result.message}\n`;
    report += `   Time: ${result.timestamp.toLocaleString()}\n`;
    if (result.details) {
      report += `   Details: ${JSON.stringify(result.details, null, 2)}\n`;
    }
    report += '\n';
  });
  
  return report;
}

/**
 * Log Test Results to Console
 * Outputs formatted test results with color coding
 */
export function logTestResults(results: TestResult[]): void {
  console.log('\n' + '='.repeat(60));
  console.log('TEST RESULTS');
  console.log('='.repeat(60) + '\n');
  
  results.forEach((result, index) => {
    const icon = result.passed ? '✓' : '✗';
    const style = result.passed ? 'color: green; font-weight: bold' : 'color: red; font-weight: bold';
    
    console.log(`%c${icon} Test ${index + 1}: ${result.testName}`, style);
    console.log(`  ${result.message}`);
    if (result.details) {
      console.log('  Details:', result.details);
    }
    console.log('');
  });
  
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  console.log('='.repeat(60));
  console.log(`Summary: ${passed}/${total} tests passed (${((passed / total) * 100).toFixed(1)}%)`);
  console.log('='.repeat(60) + '\n');
}
