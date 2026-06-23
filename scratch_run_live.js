const { runLiveIncidentEngine } = require('./server/incident-engine/calculate');
const incidentData = require('./datasets/incidents/incident-001.json');

async function testLiveEngine() {
  console.log("Starting Live Engine...");
  
  let eventsReceived = [];
  
  const eventCallback = (evt) => {
    console.log(`[EVENT] ${evt.eventType}`);
    eventsReceived.push(evt.eventType);
    
    if (evt.eventType === 'PREDICTION_AVAILABLE') {
      console.log('Prediction Payload:', JSON.stringify(evt.payload, null, 2));
      console.log('--- ESCALATION MOMENTUM:', evt.payload.escalationMomentum);
    }
    if (evt.eventType === 'RCA_AVAILABLE') {
      console.log('RCA Payload:', JSON.stringify(evt.payload, null, 2));
    }
    if (evt.eventType === 'RECOVERY_AVAILABLE') {
      console.log('Recovery Payload:', JSON.stringify(evt.payload, null, 2));
    }
    if (evt.eventType === 'PARALLEL_UNIVERSE_AVAILABLE') {
      console.log('Parallel Universe Payload:', JSON.stringify(evt.payload, null, 2));
    }
  };

  // Run with instant mode (mode: "LIVE") so it doesn't pause forever, wait, mode LIVE waits for operator. 
  // Let's pass config to auto-approve.
  await runLiveIncidentEngine(incidentData, eventCallback, null, { mode: "TEST" });
  
  console.log("Engine finished!");
  console.log("Event trace:", eventsReceived.join(" -> "));
}

testLiveEngine().catch(console.error);
