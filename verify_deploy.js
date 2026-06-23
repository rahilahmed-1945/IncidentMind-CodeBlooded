const { exec } = require('child_process');
const http = require('http');

console.log('1. Checking package.json validity...');
const pkg = require('./package.json');
if (pkg.scripts.start === "node server.js") {
  console.log('OK: package.json is valid and contains start script.');
} else {
  console.error('FAIL: start script missing or invalid.');
  process.exit(1);
}

function testServer(portEnv, expectedPort) {
  return new Promise((resolve, reject) => {
    console.log(`\n2. Testing server with PORT=${portEnv}...`);
    const env = { ...process.env };
    if (portEnv !== null) {
      env.PORT = portEnv;
    } else {
      delete env.PORT;
    }

    const serverProcess = exec('npm start', { env });
    
    let output = '';
    serverProcess.stdout.on('data', (data) => {
      output += data.toString();
      if (output.includes(`port ${expectedPort}`)) {
        console.log(`OK: Server correctly reported listening on port ${expectedPort}`);
        serverProcess.kill();
        resolve();
      }
    });

    serverProcess.stderr.on('data', (data) => {
      console.error(`SERVER ERROR: ${data}`);
    });
    
    setTimeout(() => {
      serverProcess.kill();
      if (!output.includes(`port ${expectedPort}`)) {
         reject(new Error(`Server did not report correct port. Output was: ${output}`));
      }
    }, 5000);
  });
}

(async () => {
  try {
    await testServer(null, 3000);
    await testServer('5000', 5000);
    console.log('\n--- ALL DEPLOYMENT VERIFICATIONS PASSED ---');
  } catch (err) {
    console.error('\nFAIL:', err.message);
  }
})();
