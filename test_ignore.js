const { runLiveIncidentEngine } = require('./server/incident-engine/calculate');
const fs = require('fs');

const incidentData = JSON.parse(fs.readFileSync('./datasets/incidents/incident-001.json', 'utf8'));

let operatorEmitters = [];
const emitMock = (evt) => {
  if (evt.eventType === 'RAW_TELEMETRY_EVENT') {
    if (evt.payload.message.includes('Operator')) {
      console.log('EMITTED RAW_TELEMETRY_EVENT:', evt.payload.message);
    }
  }
};

const socketMock = {
  on: (event, cb) => {
    if (event === 'operator_action') {
      operatorEmitters.push(cb);
    }
  }
};

async function test() {
  console.log("Starting engine...");
  const enginePromise = runLiveIncidentEngine(incidentData, emitMock, socketMock, { mode: 'LIVE', stageDelayMs: 10 });
  
  setTimeout(() => {
    console.log("Simulating operator clicking Ignore Warning...");
    operatorEmitters.forEach(cb => cb({ action: 'Ignore Warning' }));
  }, 1000);
  
  await enginePromise;
  console.log("Done.");
}

test();
