{/* 
  * CITATION_START
  * Much of these configuration code are genrated using ClaudeAI
*/ }
// run-benchmarks.js
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';
import { fileURLToPath } from 'url';
import fs from 'fs-extra';
import path, { dirname } from 'path';
import deviceProfiles from './device-profiles.js';

// Your three app URLs
const APPS = {
  'buildtime': 'https://btallesverkauf.vercel.app/',
  'runtime-v1': 'https://rtallesverkaufwp.vercel.app/',
  'runtime-v2': 'https://rtallesverkaufrb.vercel.app/',
};

// Number of runs per configuration
const RUNS_PER_TEST = 5;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Output directories
const RESULTS_DIR = path.join(__dirname, 'results');
const REPORTS_DIR = path.join(__dirname, 'reports');

/**
 * Run Lighthouse for a single URL with a specific profile
 */
async function runLighthouse(url, profile, runNumber) {
  console.log(`  Run ${runNumber}/${RUNS_PER_TEST}...`);

  const chrome = await chromeLauncher.launch({
    chromeFlags: ['--headless', '--disable-gpu', '--no-sandbox'],
  });

  const options = {
    logLevel: 'error',
    output: ['json', 'html'],
    onlyCategories: ['performance'],
    port: chrome.port,
  };

  const config = deviceProfiles[profile];
  const runnerResult = await lighthouse(url, options, config);

  chrome.kill();

  return {
    lhr: runnerResult.lhr, // Lighthouse Result object
    report: runnerResult.report, // [JSON, HTML]
  };
}

/**
 * Run multiple tests and calculate median
 */
async function runMultipleTests(url, profile, runs = RUNS_PER_TEST) {
  const results = [];

  for (let i = 1; i <= runs; i++) {
    const result = await runLighthouse(url, profile, i);
    results.push(result.lhr);

    // Save individual run
    const runDir = path.join(RESULTS_DIR, profile, path.basename(new URL(url).hostname), `run-${i}`);
    await fs.ensureDir(runDir);
    await fs.writeJson(path.join(runDir, 'result.json'), result.lhr, { spaces: 2 });

    // Delay between runs
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  // Calculate median metrics
  const medianMetrics = calculateMedian(results);

  return {
    runs: results,
    median: medianMetrics,
  };
}

/**
 * Calculate median from multiple runs
 */
function calculateMedian(results) {
  const metrics = ['first-contentful-paint', 'largest-contentful-paint',
    'total-blocking-time', 'speed-index', 'interactive'];

  const medianData = {
    performanceScore: median(results.map(r => r.categories.performance.score * 100)),
    metrics: {},
  };

  metrics.forEach(metric => {
    const values = results.map(r => r.audits[metric]?.numericValue || 0);
    medianData.metrics[metric] = {
      value: median(values),
      displayValue: formatMetric(metric, median(values)),
    };
  });

  return medianData;
}

/**
 * Calculate median value
 */
function median(values) {
  const sorted = values.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

/**
 * Format metric for display
 */
function formatMetric(metric, value) {
  if (metric.includes('time') || metric.includes('paint') || metric.includes('index')) {
    return `${(value / 1000).toFixed(2)}s`;
  }
  return `${Math.round(value)}ms`;
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Starting Lighthouse Benchmarks\n');
  console.log(`Testing ${Object.keys(APPS).length} variants`);
  console.log(`Across ${Object.keys(deviceProfiles).length} device profiles`);
  console.log(`With ${RUNS_PER_TEST} runs each\n`);

  // Clean and create output directories
  await fs.emptyDir(RESULTS_DIR);
  await fs.emptyDir(REPORTS_DIR);

  const allResults = {};

  // Loop through each device profile
  for (const [profileName, profileConfig] of Object.entries(deviceProfiles)) {
    console.log(`\n📱 Profile: ${profileName}`);
    console.log('═'.repeat(50));

    allResults[profileName] = {};

    // Loop through each app variant
    for (const [appName, appUrl] of Object.entries(APPS)) {
      console.log(`\n  Testing: ${appName} (${appUrl})`);

      try {
        const result = await runMultipleTests(appUrl, profileName);
        allResults[profileName][appName] = result.median;

        console.log(`  ✓ Performance Score: ${result.median.performanceScore.toFixed(0)}`);
        console.log(`  ✓ FCP: ${result.median.metrics['first-contentful-paint'].displayValue}`);
        console.log(`  ✓ LCP: ${result.median.metrics['largest-contentful-paint'].displayValue}`);

      } catch (error) {
        console.error(`  ✗ Error testing ${appName}:`, error.message);
        allResults[profileName][appName] = { error: error.message };
      }
    }
  }

  // Save summary
  const summaryPath = path.join(RESULTS_DIR, 'summary.json');
  await fs.writeJson(summaryPath, allResults, { spaces: 2 });

  console.log('\n\n✅ Benchmarks Complete!');
  console.log(`📊 Results saved to: ${RESULTS_DIR}`);
  console.log(`📄 Summary: ${summaryPath}`);

  // Generate comparison report
  console.log('\n📈 Generating comparison report...');
  await generateComparisonReport(allResults);
}

/**
 * Generate HTML comparison report
 */
async function generateComparisonReport(results) {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Lighthouse Benchmark Results</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
    h1 { color: #333; }
    .profile { margin-bottom: 40px; background: white; padding: 20px; border-radius: 8px; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background-color: #4CAF50; color: white; }
    tr:hover { background-color: #f5f5f5; }
    .best { background-color: #c8e6c9; font-weight: bold; }
    .worst { background-color: #ffcdd2; }
  </style>
</head>
<body>
  <h1>Micro-Frontend Performance Comparison</h1>
  <p>Generated: ${new Date().toLocaleString()}</p>
  
  ${Object.entries(results).map(([profile, apps]) => `
    <div class="profile">
      <h2>📱 ${profile.replace(/-/g, ' ').toUpperCase()}</h2>
      <table>
        <thead>
          <tr>
            <th>Variant</th>
            <th>Performance Score</th>
            <th>FCP</th>
            <th>LCP</th>
            <th>TBT</th>
            <th>Speed Index</th>
          </tr>
        </thead>
        <tbody>
          ${Object.entries(apps).map(([app, data]) => `
            <tr>
              <td><strong>${app}</strong></td>
              <td>${data.performanceScore?.toFixed(0) || 'N/A'}</td>
              <td>${data.metrics?.['first-contentful-paint']?.displayValue || 'N/A'}</td>
              <td>${data.metrics?.['largest-contentful-paint']?.displayValue || 'N/A'}</td>
              <td>${data.metrics?.['total-blocking-time']?.displayValue || 'N/A'}</td>
              <td>${data.metrics?.['speed-index']?.displayValue || 'N/A'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `).join('')}
</body>
</html>
  `;

  await fs.writeFile(path.join(REPORTS_DIR, 'comparison.html'), html);
  console.log(`✓ Report generated: ${path.join(REPORTS_DIR, 'comparison.html')}`);
}

// Run the benchmarks
main().catch(console.error);

{/* CITATION_END */ }
