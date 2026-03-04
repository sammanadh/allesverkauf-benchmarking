{/* 
  * CITATION_START
  * Much of these configuration code are genrated using ClaudeAI
*/ }
import puppeteer from 'puppeteer';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const APPS = {
  'buildtime': 'https://btallesverkauf.vercel.app/',
  //'runtime-v1': 'https://your-runtime-v1.vercel.app',
  //'runtime-v2': 'https://your-runtime-v2.vercel.app',
};

const RUNS_PER_APP = 1;
const RESULTS_DIR = path.join(__dirname, 'journey-results');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function injectAndSetupINPObserver(page) {
  await page.addScriptTag({
    url: 'https://unpkg.com/web-vitals@5/dist/web-vitals.iife.js'
  });

  // Setup INP observer using web-vitals
  await page.evaluate(() => {
    if (window.webVitals && window.webVitals.onINP) {
      window.webVitals.onINP((metric) => {
        const value = metric.value;
        console.log(`INP reported: ${metric.value}ms`);
        window.webVitalsData.inp = value;
      });
    }
  });
}

async function runUserJourney(url, appName, runNumber) {
  console.log(`  Run ${runNumber}/${RUNS_PER_APP}...`);

  const browser = await puppeteer.launch({
    headless: false,
    devtools: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1920, height: 1080 }
  });

  const page = await browser.newPage();

  // Track interactions with timing
  await page.evaluateOnNewDocument(() => {
    window.webVitalsData = {
      inp: null,
      interactionCount: 0
    };

    // Track interaction count
    document.addEventListener('click', () => window.webVitalsData.interactionCount++, true);
    document.addEventListener('input', () => window.webVitalsData.interactionCount++, true);
  });

  try {
    console.log('    → Navigating to homepage...');
    await page.goto(url, { waitUntil: 'networkidle2' });

    // Re-setting up INP observer after page load
    await injectAndSetupINPObserver(page);

    await delay(1000);

    page.evaluate(() => {
      console.log(window.webVitals)
    })

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

    // STEP 15-17: Select options
    console.log('    → Selecting payment and delivery...');
    const gridDivs = await page.$$('div.grid.grid-cols-1.gap-4.md\\:grid-cols-3');
    if (gridDivs.length !== 2) throw new Error(`Expected 2 grid divs, found ${gridDivs.length}`);

    const shippingOptions = await gridDivs[0].$$('div');
    if (shippingOptions.length < 2) throw new Error('Not enough shipping options');
    await shippingOptions[1].click();
    await delay(500);

    const paymentOptions = await gridDivs[1].$$('div');
    if (paymentOptions.length < 3) throw new Error('Not enough payment options');
    await paymentOptions[2].click();
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

    // Trigger "session end" events 
    // Necessary because for onINP handler to fire, webVitals must think the user has ended his sessions
    await page.evaluate(() => {
      // Simulate tab switch
      Object.defineProperty(document, 'visibilityState', {
        writable: true,
        configurable: true,
        value: 'hidden'
      });
      document.dispatchEvent(new Event('visibilitychange'));

      // Simulate page unload
      window.dispatchEvent(new Event('pagehide'));
    });

    await delay(2000);

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

    return {
      totalInteractions: metrics.totalInteractions,
      inp: Math.round(metrics.inp)
    };
  } catch (error) {
    console.error(`    ✗ Error: ${error.message}`);
    await browser.close();
    throw error;
  }
}

async function main() {
  console.log('🎭 User Journey Performance Test\n');

  await fs.emptyDir(RESULTS_DIR);

  const allResults = {};

  for (const [appName, appUrl] of Object.entries(APPS)) {
    console.log(`\n📱 Testing: ${appName}`);
    console.log('═'.repeat(50));

    const runs = [];

    for (let i = 1; i <= RUNS_PER_APP; i++) {
      try {
        const metrics = await runUserJourney(appUrl, appName, i);
        runs.push(metrics);
        await delay(3000);
      } catch (error) {
        console.error(`  Run ${i} failed: ${error.message}`);
      }
    }

    if (runs.length === 0) {
      console.error(`  ✗ All runs failed for ${appName}`);
      continue;
    }

    // Calculate medians
    const inpValues = runs.map(r => r.inp).sort((a, b) => a - b);
    const interactionCounts = runs.map(r => r.totalInteractions).sort((a, b) => a - b);

    const medianINP = inpValues[Math.floor(inpValues.length / 2)];
    const medianInteractions = interactionCounts[Math.floor(interactionCounts.length / 2)];

    allResults[appName] = {
      medianINP,
      medianInteractions,
      runs
    };

    console.log(`\n  📊 Summary (Median of ${runs.length} runs):`);
    console.log(`     Interactions: ${medianInteractions}`);
    console.log(`     INP: ${medianINP}ms`);
  }

  // Save summary
  await fs.writeJson(
    path.join(RESULTS_DIR, 'summary.json'),
    allResults,
    { spaces: 2 }
  );

  // Print comparison
  console.log('\n\n📊 Results:\n');
  console.log('| Variant     | Interactions | INP   |');
  console.log('|-------------|--------------|-------|');

  for (const [appName, results] of Object.entries(allResults)) {
    console.log(
      `| ${appName.padEnd(11)} | ${String(results.medianInteractions).padStart(12)} | ${String(results.medianINP).padStart(3)}ms |`
    );
  }

  console.log('\n✅ Complete!');
  console.log(`📄 Results: ${path.join(RESULTS_DIR, 'summary.json')}`);
}

main().catch(console.error);

{/* CITATION_END */ }
