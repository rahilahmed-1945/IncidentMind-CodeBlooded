require('dotenv').config();
const axios = require('axios');
const fs = require('fs');

// Patch axios before anything else
const originalAxiosPost = axios.post;
let rcaTrace = {
  question: null,
  retrievedEvidence: [],
  finalPrompt: null,
  openRouterResponse: null,
  openRouterError: null,
  fallbackExecuted: false,
  finalRcaPayload: null,
  actionEvents: []
};

axios.post = async function(url, data, config) {
  if (url === 'https://openrouter.ai/api/v1/chat/completions') {
    rcaTrace.finalPrompt = data.messages;
    try {
      const response = await originalAxiosPost.apply(this, arguments);
      rcaTrace.openRouterResponse = response.data;
      return response;
    } catch (e) {
      rcaTrace.openRouterError = e.message;
      rcaTrace.fallbackExecuted = true;
      throw e;
    }
  }
  return originalAxiosPost.apply(this, arguments);
};

// Now load modules
const ragModule = require('./server/rag/index');
const originalRetrieve = ragModule.retrieveSemanticV2;
ragModule.retrieveSemanticV2 = async function(question) {
  rcaTrace.question = question;
  const result = await originalRetrieve.apply(this, arguments);
  rcaTrace.retrievedEvidence = result.evidence;
  return result;
};

// Now load the engine
const { runLiveIncidentEngine } = require('./server/incident-engine/calculate');
const incidentData = require('./datasets/incidents/incident-001.json');

async function runAudit() {
  console.log("Running Live Incident Engine...");
  
  const eventCallback = (evt) => {
    if (evt.eventType === 'RCA_AVAILABLE') {
      rcaTrace.finalRcaPayload = evt.payload;
    }
    if (evt.eventType === 'ACTION_REQUIRED' || evt.eventType === 'ACTION_EXECUTING' || evt.eventType === 'ACTION_COMPLETED') {
      rcaTrace.actionEvents.push({ type: evt.eventType, payload: evt.payload });
    }
  };

  await runLiveIncidentEngine(incidentData, eventCallback, null, { mode: "TEST" });
  
  // If openRouterResponse was not captured but no error, maybe it didn't run.
  fs.writeFileSync('rca_audit_output.json', JSON.stringify(rcaTrace, null, 2));
  console.log("Audit complete. Written to rca_audit_output.json");
}

runAudit().catch(console.error);
