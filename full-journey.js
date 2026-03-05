/* 
  * CITATION_START
  * Much of these configuration code are generated using ClaudeAI
*/

import puppeteer from 'puppeteer';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import deviceProfiles from './device-profiles.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const APPS = {
  'buildtime': 'https://btallesverkauf.vercel.app/',
  'runtime-v1': 'https://rtallesverkaufwp.vercel.app/',
  'runtime-v2': 'https://rtallesverkaufrb.vercel.app/',
};

const RUNS_PER_TEST = 5;
const RESULTS_DIR = path.join(__dirname, 'journey-results');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function injectAndSetupINPObserver(page) {
  await page.addScriptTag({
    url: 'https://unpkg.com/web-vitals@5/dist/web-vitals.iife.js'
  });

  // Wait for web-vitals to load
  await page.waitForFunction(() => window.webVitals !== undefined, { timeout: 5000 });

  // Setup INP observer
  await page.evaluate(() => {
    if (window.webVitals && window.webVitals.onINP) {
      window.webVitals.onINP((metric) => {
        console.log(`INP reported: ${metric.value}ms`);
        window.webVitalsData.inp = metric.value;
      });
    }
  });
}

async function applyProfileConfig(page, profileConfig) {
  // Set viewport
  await page.setViewport({
    width: profileConfig.settings.screenEmulation.width,
    height: profileConfig.settings.screenEmulation.height,
    deviceScaleFactor: profileConfig.settings.screenEmulation.deviceScaleFactor
  });

  // Apply CPU throttling
  const client = await page.target().createCDPSession();
  await client.send('Emulation.setCPUThrottlingRate', {
    rate: profileConfig.settings.throttling.cpuSlowdownMultiplier
  });

  // Apply network throttling
  await page.emulateNetworkConditions({
    offline: false,
    download: (profileConfig.settings.throttling.downloadThroughputKbps * 1024) / 8,
    upload: (profileConfig.settings.throttling.uploadThroughputKbps * 1024) / 8,
    latency: profileConfig.settings.throttling.rttMs
  });
}

async function runUserJourney(url, appName, profileName, runNumber) {
  console.log(`  Run ${runNumber}/${RUNS_PER_TEST}...`);

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // Apply device profile configuration
  const profileConfig = deviceProfiles[profileName];
  await applyProfileConfig(page, profileConfig);

  // Track interactions
  await page.evaluateOnNewDocument(() => {
    window.webVitalsData = {
      inp: null,
      interactionCount: 0
    };

    document.addEventListener('click', () => window.webVitalsData.interactionCount++, true);
    document.addEventListener('input', () => window.webVitalsData.interactionCount++, true);
  });

  try {
    console.log('    → Navigating to homepage...');
    await page.goto(url, { waitUntil: 'networkidle2' });

    await injectAndSetupINPObserver(page);
    await delay(1000);

    // STEP 1-3: First product
    console.log('    → Adding first product...');
    const firstProduct = await page.$('div.cursor-pointer');
    if (!firstProduct) throw new Error('First product not found');
    await firstProduct.click();
    await delay(500);

    const addToBagButton1 = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(btn => btn.textContent.includes('Add to bag'));
    });
    if (!addToBagButton1) throw new Error('Add to bag button not found');
    await addToBagButton1.asElement().click();
    await delay(1000);

    // STEP 4-6: Scroll and add last product
    console.log('    → Scrolling to bottom...');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await delay(1000);

    console.log('    → Adding last product...');
    const allProducts = await page.$$('div.cursor-pointer');
    const lastProduct = allProducts[allProducts.length - 1];
    if (!lastProduct) throw new Error('Last product not found');
    await lastProduct.click();
    await delay(500);

    const addToBagButton2 = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(btn => btn.textContent.includes('Add to bag'));
    });
    if (!addToBagButton2) throw new Error('Add to bag button not found (second)');
    await addToBagButton2.asElement().click();
    await delay(1000);

    // STEP 7-10: Search and add third product
    console.log('    → Searching for product...');
    await page.evaluate(() => window.scrollTo(0, 0));
    await delay(500);

    const searchInput = await page.$('input[placeholder="Search"]');
    if (!searchInput) throw new Error('Search input not found');
    await searchInput.click();
    await searchInput.type('R', { delay: 100 });
    await delay(2000);

    console.log('    → Adding third product...');
    const searchResultProduct = await page.$('div.cursor-pointer');
    if (!searchResultProduct) throw new Error('Search result product not found');
    await searchResultProduct.click();
    await delay(500);

    const addToBagButton3 = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(btn => btn.textContent.includes('Add to bag'));
    });
    if (!addToBagButton3) throw new Error('Add to bag button not found (third)');
    await addToBagButton3.asElement().click();
    await delay(1000);

    // STEP 11-12: Open cart
    console.log('    → Opening cart...');
    const cartButton = await page.evaluateHandle(() => {
      const nav = document.querySelector('nav');
      if (!nav) return null;
      return nav.querySelector('button');
    });
    if (!cartButton) throw new Error('Cart button not found');
    await cartButton.asElement().click();
    await delay(1000);

    // STEP 13: Go to checkout
    console.log('    → Going to checkout...');
    const checkoutButton = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(btn => btn.textContent.includes('Checkout'));
    });
    if (!checkoutButton) throw new Error('Checkout button not found');
    await checkoutButton.asElement().click();
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    await delay(1000);

    // STEP 14: Fill form
    console.log('    → Filling checkout form...');
    await page.type('#your_name', 'John Doe', { delay: 50 });
    await page.type('#your_email', 'john.doe@example.com', { delay: 50 });
    await delay(500);

    // STEP 18: Place order
    console.log('    → Placing order...');
    const placeOrderButton = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(btn => btn.textContent.includes('Place Order'));
    });
    if (!placeOrderButton) throw new Error('Place Order button not found');
    await placeOrderButton.asElement().click();
    await delay(2000);

    // STEP 19: Continue
    console.log('    → Completing journey...');
    const continueButton = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(btn => btn.textContent.includes('Continue'));
    });
    if (!continueButton) throw new Error('Continue button not found');
    await continueButton.asElement().click();
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    await delay(2000);

    // Force INP finalization
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', {
        writable: true,
        configurable: true,
        value: 'hidden'
      });
      document.dispatchEvent(new Event('visibilitychange'));
      window.dispatchEvent(new Event('pagehide'));
    });

    await delay(1000);

    // Collect metrics
    const metrics = await page.evaluate(() => {
      return {
        totalInteractions: window.webVitalsData?.interactionCount || 0,
        inp: window.webVitalsData?.inp || 0
      };
    });

    await browser.close();

    console.log(`    ✓ Interactions: ${metrics.totalInteractions}`);
    console.log(`    ✓ INP: ${Math.round(metrics.inp)}ms`);

    // Save individual run
    const runDir = path.join(RESULTS_DIR, profileName, appName, `run-${runNumber}`);
    await fs.ensureDir(runDir);
    await fs.writeJson(path.join(runDir, 'metrics.json'), metrics, { spaces: 2 });

    return {
      totalInteractions: metrics.totalInteractions,
      inp: Math.round(metrics.inp)
    };

  } catch (error) {
    console.error(`    ✗ Error: ${error.message}`);
    throw error;
  } finally {
    await browser.close();
  }
}

async function main() {
  console.log('🎭 User Journey Performance Test Across Device Profiles\n');
  console.log(`Testing ${Object.keys(APPS).length} variants`);
  console.log(`Across ${Object.keys(deviceProfiles).length} device profiles`);
  console.log(`With ${RUNS_PER_TEST} runs each\n`);

  await fs.emptyDir(RESULTS_DIR);

  const allResults = {};

  // Loop through each device profile
  for (const [profileName, profileConfig] of Object.entries(deviceProfiles)) {
    console.log(`\n📱 Profile: ${profileName}`);
    console.log('═'.repeat(70));

    allResults[profileName] = {};

    // Loop through each app variant
    for (const [appName, appUrl] of Object.entries(APPS)) {
      console.log(`\n  Testing: ${appName} (${appUrl})`);

      const runs = [];

      for (let i = 1; i <= RUNS_PER_TEST; i++) {
        try {
          const metrics = await runUserJourney(appUrl, appName, profileName, i);
          runs.push(metrics);
          await delay(5000); // Delay between runs
        } catch (error) {
          console.error(`  Run ${i} failed: ${error.message}`);
        }
      }

      if (runs.length === 0) {
        console.error(`  ✗ All runs failed for ${appName}`);
        allResults[profileName][appName] = { error: 'All runs failed' };
        continue;
      }

      // Calculate medians
      const inpValues = runs.map(r => r.inp).sort((a, b) => a - b);
      const interactionCounts = runs.map(r => r.totalInteractions).sort((a, b) => a - b);

      const medianINP = inpValues[Math.floor(inpValues.length / 2)];
      const medianInteractions = interactionCounts[Math.floor(interactionCounts.length / 2)];

      allResults[profileName][appName] = {
        medianINP,
        medianInteractions,
        runs
      };

      console.log(`\n  📊 Summary (Median of ${runs.length} runs):`);
      console.log(`     Interactions: ${medianInteractions}`);
      console.log(`     INP: ${medianINP}ms`);
    }
  }

  // Save summary
  const summaryPath = path.join(RESULTS_DIR, 'summary.json');
  await fs.writeJson(summaryPath, allResults, { spaces: 2 });

  console.log('\n\n✅ User Journey Tests Complete!');
  console.log(`📊 Results saved to: ${RESULTS_DIR}`);
  console.log(`📄 Summary: ${summaryPath}`);

  // Generate comparison report
  console.log('\n📈 Generating comparison report...');
  await generateComparisonReport(allResults);
}

async function generateComparisonReport(results) {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>User Journey INP Results</title>
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
  <h1>User Journey INP Comparison</h1>
  <p>Generated: ${new Date().toLocaleString()}</p>
  
  ${Object.entries(results).map(([profile, apps]) => `
    <div class="profile">
      <h2>📱 ${profile.replace(/-/g, ' ').toUpperCase()}</h2>
      <table>
        <thead>
          <tr>
            <th>Variant</th>
            <th>INP (ms)</th>
            <th>Total Interactions</th>
          </tr>
        </thead>
        <tbody>
          ${Object.entries(apps).map(([app, data]) => `
            <tr>
              <td><strong>${app}</strong></td>
              <td>${data.medianINP || 'N/A'}</td>
              <td>${data.medianInteractions || 'N/A'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `).join('')}
</body>
</html>
  `;

  const reportPath = path.join(RESULTS_DIR, 'comparison.html');
  await fs.writeFile(reportPath, html);
  console.log(`✓ Report generated: ${reportPath}`);
}

main().catch(console.error);

{/* CITATION_END */ }
