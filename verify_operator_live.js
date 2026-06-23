const { io } = require('socket.io-client');

const socket = io('http://localhost:3000');
console.log("Connected to server. Waiting for events...");

socket.on('incident_event', (evt) => {
  if (evt.eventType === 'ACTION_REQUIRED' || evt.eventType === 'ACTION_APPROVED' || evt.eventType === 'ACTION_EXECUTING') {
    console.log(`[EVENT] ${evt.eventType} at ${evt.displayTimestamp}`);
    console.log(`Payload:`, evt.payload);
  }
});
