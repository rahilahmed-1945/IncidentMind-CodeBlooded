const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();

  page.on('console', msg => {
    if (msg.text().includes('[INSTRUMENT]')) {
      console.log(`[BROWSER] ${msg.text()}`);
    }
  });

  await page.goto('http://localhost:5173');
  
  // Wait for boot sequence
  await new Promise(r => setTimeout(r, 4000));
  
  console.log('--- SCROLLING DOWN TO PARALLEL SIMULATOR ---');
  await page.evaluate(() => {
    window.scrollTo(0, document.body.scrollHeight);
  });
  
  // Monitor for 15 seconds
  await new Promise(r => setTimeout(r, 15000));

  console.log('--- AUDIT COMPLETE ---');
  await browser.close();
})();
