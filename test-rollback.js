const io = require('socket.io-client');
const socket = io('http://localhost:3000');

let actionEmitted = false;
socket.on('incident_state', (state) => {
  console.log(`[${state.displayTimestamp}] ${state.eventType} - ${state.currentState} -> ${state.nextState}`);
  
  if (state.eventType === 'ACTION_REQUIRED' && !actionEmitted) {
     console.log("=> Operator selected: Rollback Deployment");
     socket.emit('operator_action', { action: 'Rollback Deployment' });
     actionEmitted = true;
  }
  
  if (state.eventType === 'INCIDENT_RESOLVED') {
     console.log("DONE");
     process.exit(0);
  }
});
