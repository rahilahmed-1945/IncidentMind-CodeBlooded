const axios = require('axios');

async function runTests() {
  console.log("Querying /analyze with live engineContext...");

  const queries = [
    "What caused the outage?",
    "Which deployment triggered the incident?",
    "Which was the faulty change?",
    "What is causing the bottleneck?",
    "Why is checkout failing?"
  ];

  for (const q of queries) {
    try {
      const res = await axios.post("http://localhost:3000/analyze", { query: q });
      console.log(`\nQ: ${q}`);
      console.log(`A: ${res.data.analysis}`);
    } catch (e) {
      console.log(`Error testing '${q}':`, e.message);
    }
  }
}

runTests();
