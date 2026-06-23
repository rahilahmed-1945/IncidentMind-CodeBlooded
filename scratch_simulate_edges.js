const { reduceState } = require('./server/incident-engine/calculate');
const incidentData = require('./datasets/incidents/incident-001.json');

let state = null;

const events = [
  { eventType: "START_INCIDENT", payload: incidentData },
  { eventType: "BLAST_RADIUS_AVAILABLE", payload: {
      blastRadius: { directlyImpacted: ["gateway-service", "redis-cache", "checkout-service"], indirectlyImpacted: ["payments-service"] }
  }},
  { eventType: "ACTION_SELECTED", payload: { actionId: "rollback_deployment" } },
  { eventType: "SERVICE_STATE_CHANGE", payload: { service: "auth-service", newState: "RECOVERING" } },
  { eventType: "SERVICE_STATE_CHANGE", payload: { service: "auth-service", newState: "HEALTHY" } },
  { eventType: "INCIDENT_RESOLVED", payload: {} }
];

console.log("=== Edge States Tracker ===\n");
events.forEach(evt => {
  state = reduceState(state, evt);
  console.log(`\nAfter Event: ${evt.eventType}`);
  console.log(`State: ${state.narrative.recoveryState || 'N/A'}`);
  const redEdges = state.edges.filter(e => e.style && e.style.stroke === '#ef4444').map(e => `${e.source}->${e.target}`);
  const blueEdges = state.edges.filter(e => e.style && e.style.stroke === '#06b6d4').map(e => `${e.source}->${e.target}`);
  console.log(`Red Edges: ${redEdges.length > 0 ? redEdges.join(", ") : "None"}`);
});
