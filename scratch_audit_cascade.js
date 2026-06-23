const { generateRCA } = require('./server/rca/generate-rca');
const { calculateRecovery } = require('./server/recovery/calculate');
const { calculateParallelUniverse } = require('./server/parallel-universe/calculate');
const incidentData = require('./datasets/incidents/incident-001.json');
const { calculateBlastRadius } = require('./server/blast-radius/calculate');
const { calculateBusinessImpact } = require('./server/business-impact/calculate');

async function audit() {
    console.log("--- AUDITING CASCADE ---");
    
    // 1. RCA
    let rcaPayload = null;
    try {
        const rcaResult = await generateRCA("Determine the root cause of the incident cascade based on the provided telemetry, alerts, and deployment logs.");
        rcaPayload = rcaResult.rca;
        console.log("RCA_AVAILABLE Payload:");
        console.log(JSON.stringify(rcaPayload, null, 2));
    } catch (e) {
        console.log("generateRCA threw error:", e);
    }
    
    // 2. Blast Radius & Business Impact
    const blastRadius = calculateBlastRadius(incidentData);
    const businessImpact = calculateBusinessImpact(blastRadius, incidentData.timeline);
    
    // 3. Recovery
    let recoveryPayload = null;
    try {
        recoveryPayload = calculateRecovery(incidentData, blastRadius, businessImpact);
        console.log("RECOVERY_AVAILABLE Payload:");
        console.log(JSON.stringify(recoveryPayload, null, 2));
    } catch (e) {
        console.log("calculateRecovery threw error:", e);
    }
    
    // 4. Parallel Universe
    let puPayload = null;
    try {
        puPayload = calculateParallelUniverse(incidentData, blastRadius, businessImpact, recoveryPayload);
        console.log("PARALLEL_UNIVERSE_READY Payload:");
        console.log(JSON.stringify(puPayload, null, 2));
    } catch (e) {
        console.log("calculateParallelUniverse threw error:", e);
    }
}

audit();
