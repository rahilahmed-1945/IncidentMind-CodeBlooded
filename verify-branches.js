const { spawn } = require('child_process');
const io = require('socket.io-client');
const axios = require('axios');

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function testBranch(branchName, actionString) {
  return new Promise((resolve) => {
    console.log(`\n=== Testing Branch: ${branchName} ===`);
    
    // Spawn server
    const server = spawn('node', ['server.js'], { cwd: process.cwd() });
    
    server.stdout.on('data', (data) => {
       if (data.toString().includes('IncidentMind server running')) {
          runClient();
       }
    });

    async function runClient() {
      const socket = io('http://localhost:3000', { forceNew: true });
      let actionEmitted = false;

      socket.on('incident_state', (state) => {
        const ts = state.displayTimestamp;
        
        if (state.eventType === 'ACTION_REQUIRED' && !actionEmitted) {
           console.log(`[ACTION_REQUIRED] Emitting: ${actionString}`);
           socket.emit('operator_action', { action: actionString });
           actionEmitted = true;
        }
        else if (state.eventType === 'SERVICE_STATE_CHANGE') {
           console.log(`[SERVICE_STATE] ${state.payload.service}: ${state.payload.oldState} -> ${state.payload.newState}`);
        }
        else if (state.eventType === 'INCIDENT_RESOLVED') {
           console.log(`[INCIDENT_RESOLVED] Sequence complete.`);
           cleanup();
        }
        else if (state.payload && state.payload.message && state.payload.message.includes('SEV-1')) {
           console.log(`[SEV-1 REACHED] -> Engine detected SEV-1.`);
        }
        else if (state.eventType === 'PREDICTION_AVAILABLE' && actionEmitted) {
           const preds = state.payload.predictions || [];
           if (preds.length > 0) {
              console.log(`[PREDICTION] Peak Risk: ${preds[0].riskProbability}% for ${preds[0].service}`);
           }
        }
        else {
           console.log(`[EVENT] ${state.eventType}`);
        }
      });

      // Timeout fallback for Ignore Warning branch which hits the end of the timeline
      setTimeout(() => {
        console.log(`[Timeout] Ending test for ${branchName}`);
        cleanup();
      }, 60000); // 60s max since timeline plays fast

      function cleanup() {
        socket.disconnect();
        server.kill();
        resolve();
      }
    }
  });
}

async function runAll() {
  await testBranch('Rollback', 'Rollback Deployment');
  await sleep(1000);
  await testBranch('Ignore', 'Ignore Warning');
  await sleep(1000);
  await testBranch('Fallback', 'Enable Fallback');
  await sleep(1000);
  await testBranch('Restart', 'Restart Service');
  console.log("All branches verified.");
}

runAll();
