// lib/test/test.js - DEX Nova version (cleaned & updated)
// Simple test utilities & example test runner for development

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { performance } = require('perf_hooks');

// Test results collector
const results = {
  passed: 0,
  failed: 0,
  total: 0,
  duration: 0
};

/**
 * Run a single test case
 * @param {string} name - Test description
 * @param {Function} fn - Test function (should throw on failure)
 */
function test(name, fn) {
  results.total++;
  const start = performance.now();

  try {
    fn();
    const duration = (performance.now() - start).toFixed(2);
    console.log(chalk.green(`✓ \( {name} ( \){duration}ms)`));
    results.passed++;
  } catch (err) {
    const duration = (performance.now() - start).toFixed(2);
    console.log(chalk.red(`✗ \( {name} ( \){duration}ms)`));
    console.log(chalk.dim(`   → ${err.message}`));
    console.log(chalk.dim(err.stack.split('\n').slice(1, 3).join('\n')));
    results.failed++;
  }
}

/**
 * Run all tests in a directory or file
 * @param {string} dirOrFile - Path to test file or directory
 */
async function runTests(dirOrFile = './tests') {
  const startTime = performance.now();
  console.log(chalk.cyan('DEX Nova Test Runner'));
  console.log(chalk.gray('---------------------'));

  const stat = fs.statSync(dirOrFile);

  if (stat.isFile() && dirOrFile.endsWith('.test.js')) {
    console.log(chalk.blue(`Running: ${path.basename(dirOrFile)}`));
    require(path.resolve(dirOrFile));
  } else if (stat.isDirectory()) {
    const files = fs.readdirSync(dirOrFile)
      .filter(f => f.endsWith('.test.js') || f.endsWith('.spec.js'));

    for (const file of files) {
      console.log(chalk.blue(`\nRunning: ${file}`));
      require(path.resolve(dirOrFile, file));
    }
  } else {
    throw new Error('Invalid path: must be .js test file or directory');
  }

  results.duration = (performance.now() - startTime).toFixed(2);

  console.log(chalk.cyan('\nTest Summary'));
  console.log(chalk.gray('-------------'));
  console.log(chalk.green(`Passed: \( {results.passed}/ \){results.total}`));
  console.log(chalk.red(`Failed: ${results.failed}`));
  console.log(chalk.yellow(`Time: ${results.duration}ms`));

  if (results.failed > 0) {
    process.exit(1);
  }
}

// Example test cases (you can move these to separate .test.js files)
if (require.main === module) {
  test('Basic arithmetic', () => {
    if (2 + 2 !== 4) throw new Error('Math is broken');
  });

  test('String concatenation', () => {
    if ('hello' + ' ' + 'world' !== 'hello world') {
      throw new Error('String concat failed');
    }
  });

  test('Array includes', () => {
    const arr = [1, 2, 3];
    if (!arr.includes(2)) throw new Error('includes() failed');
  });

  test('Intentional failure (for demo)', () => {
    throw new Error('This test should fail');
  });

  // Run all tests
  runTests().catch(err => {
    console.error(chalk.red('Test Runner Error:'), err.message);
    process.exit(1);
  });
}

// Export for use in other files
module.exports = {
  test,
  runTests
};