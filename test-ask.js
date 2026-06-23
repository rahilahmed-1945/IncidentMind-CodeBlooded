const { processQuestion } = require('./server/ask-incidentmind/ask');

// Mock engine context exactly as it appears in the live app
const engineContext = {
  forecast: { predictions: [{ riskProbability: 92, service: 'checkout-service' }] },
  rca: { rca: { rootCause: "The failure was likely triggered by a recent deployment to checkout-service (v2.1.0). This deployment introduced a CPU-intensive regex operation leading to subsequent system saturation and cascading timeouts across dependent services." } }
};

async function runTests() {
  const queries = [
    "What caused the outage?",
    "Which deployment triggered the incident?",
    "Which was the faulty change?",
    "What is causing the bottleneck?",
    "Why is checkout failing?"
  ];

  for (const q of queries) {
    try {
      const res = await processQuestion(q, engineContext);
      console.log(`Q: ${q}`);
      console.log(`A: ${res.analysis}`);
      console.log('---');
    } catch (e) {
      console.log(`Error testing '${q}':`, e.message);
    }
  }
}

runTests();
