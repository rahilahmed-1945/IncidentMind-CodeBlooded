const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  
  async function testResolution(width, height, name) {
    console.log(`\nTesting ${name} (${width}x${height})...`);
    const page = await browser.newPage();
    await page.setViewport({ width, height });
    await page.goto('http://localhost:5173');
    
    // Wait for boot sequence
    await new Promise(r => setTimeout(r, 4000));
    
    const metrics = await page.evaluate(() => {
      return {
        windowHeight: window.innerHeight,
        bodyScrollHeight: document.body.scrollHeight,
        docScrollHeight: document.documentElement.scrollHeight,
        hasVerticalScrollbar: window.innerWidth > document.documentElement.clientWidth
      };
    });
    
    console.log(`Metrics for ${name}:`);
    console.log(metrics);
    
    // Take a screenshot
    await page.screenshot({ path: `c:\\Users\\Rahil Ahmed\\.gemini\\antigravity-ide\\brain\\dc002243-fb92-4d39-8222-eced515b6785\\${name}.png` });
    
    await page.close();
  }

  await testResolution(1366, 768, 'layout_1366x768');
  await testResolution(1920, 1080, 'layout_1920x1080');

  await browser.close();
  console.log('\n--- VERIFICATION COMPLETE ---');
})();
