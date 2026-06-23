# IncidentMind

**AI Organizational Causality Engine for Incident Response, Operational Intelligence, and Decision Support**

IncidentMind is an AI-powered Operational Intelligence Platform that helps engineering teams understand why incidents happen, how failures propagate across systems, what business impact is occurring, and which remediation action should be taken.

Instead of manually investigating across GitHub, deployment pipelines, monitoring dashboards, alerts, and communication channels, IncidentMind reconstructs incident timelines, identifies root causes, traces incidents back to deployments and commits, predicts downstream failures, calculates business impact, and recommends recovery actions.

---

# Overview

Modern engineering organizations operate distributed systems consisting of interconnected services, APIs, databases, deployment pipelines, monitoring platforms, and communication tools.

When incidents occur, teams often struggle to answer:

* What changed?
* Which deployment introduced the issue?
* Which commit caused the outage?
* Who made the change?
* Why did it fail?
* Which systems are affected?
* What business impact is occurring?
* What is likely to fail next?
* What action should we take?

IncidentMind transforms fragmented operational signals into a unified causality graph and AI-generated operational briefing.

---

# Key Features

### AI Root Cause Analysis

Correlates deployments, commits, incidents, alerts, and telemetry to identify the most probable cause of failure.

### Commit Attribution Engine

Traces incidents back to specific deployments, pull requests, commits, and engineers.

### Temporal Incident Reconstruction

Reconstructs incidents into a chronological sequence of operational events.

### Blast Radius Analysis

Calculates downstream impact using service dependency relationships.

### Predictive Intelligence

Forecasts potential failures before they occur.

### Parallel Universe Simulator

Evaluates multiple remediation strategies and predicts their outcomes.

### Business Impact Analysis

Estimates revenue impact, users affected, risk levels, and MTTR reduction.

### Natural Language Operations Console

Allows operators to query incidents using conversational language.

### Real-Time Operational Dashboard

Provides live operational intelligence and incident visibility.

---

# What Makes IncidentMind Different?

Traditional monitoring tools tell teams:

> Something is broken.

IncidentMind tells teams:

* What changed
* Which deployment introduced the issue
* Which commit caused the outage
* Who made the change
* Why it failed
* Which systems are affected
* What business impact is occurring
* What is likely to fail next
* Which action should be taken

Rather than displaying isolated alerts, IncidentMind reconstructs organizational causality and provides actionable intelligence.

---

# System Architecture

```text
React Frontend
        │
        ▼
Socket.IO Real-Time Layer
        │
        ▼
Node.js / Express Backend
        │
 ┌──────┼───────────────────────────────────────────┐
 ▼      ▼                    ▼                     ▼

 RCA   Commit         Predictive          Decision
Engine Attribution   Intelligence         Engine
       Engine

        ▼
Temporal Reconstruction
        │
        ▼
Dependency Graph Engine
        │
        ▼
Business Impact Layer
        │
        ▼
OpenRouter AI Layer
        │
        ▼
Operational Intelligence UI
```

---

# Core Components

## Root Cause Analysis Engine

The RCA Engine correlates:

* Incident records
* Deployment metadata
* Commit history
* Pull requests
* Alert streams
* Service relationships
* Operational telemetry

The engine generates evidence bundles and uses AI reasoning to produce:

* Root cause summaries
* Confidence scores
* Supporting evidence
* Affected services
* Recommended actions

---

## Commit Attribution Engine

IncidentMind correlates incidents with deployment history and source-control activity to identify the exact change responsible for a failure.

The engine analyzes:

* Deployment records
* Pull Requests
* Commit history
* Service ownership
* Incident timelines
* Dependency relationships

Example:

```text
PR #445

Author: Charlie

Commit: a1b2c3d

Service: auth-service

Change:
JWT validation optimization
```

IncidentMind automatically correlates the change with production degradation and identifies it as the likely root cause.

Generated outputs include:

* Suspected deployment
* Related PR
* Commit identifier
* Engineer attribution
* Affected service
* Root-cause confidence score
* Supporting evidence

---

## Temporal Reconstruction Engine

Incidents are reconstructed into a causal sequence:

```text
Deployment
     ↓
Latency Spike
     ↓
Retry Storm
     ↓
Database Saturation
     ↓
Checkout Failure
     ↓
Revenue Impact
     ↓
Recovery
```

This provides operational context instead of isolated alerts.

---

## Blast Radius Engine

Dependency relationships are modeled as propagation graphs.

Example:

```text
auth-service
      ↓
gateway-service
      ↓
checkout-service
      ↓
payments-service
```

When a failure occurs, IncidentMind estimates:

* Direct impact
* Indirect impact
* Cascading failures
* Affected services

---

## Predictive Intelligence Layer

IncidentMind continuously evaluates operational risk signals.

Example:

```text
Primary Database Failure Risk: 76%
Estimated Failure Window: 11 Minutes
Escalation Momentum: High
```

Predictions include:

* Future service failures
* Escalation likelihood
* Risk propagation
* Time-to-impact estimates

---

## Parallel Universe Simulator

The simulator evaluates multiple intervention strategies:

* Rollback Deployment
* Enable Fallback
* Restart Service
* Ignore Warning

For each strategy, IncidentMind estimates:

* Revenue preserved
* Users protected
* MTTR reduction
* Risk reduction
* Cascading failures prevented

This enables teams to compare outcomes before taking action.

---

## Business Impact Engine

IncidentMind translates technical incidents into business metrics.

Outputs include:

* Revenue loss estimates
* Revenue preserved
* Users affected
* SLA risk
* Downtime severity
* MTTR improvements

---

## Natural Language Operations Console

Operators can ask:

* What caused the outage?
* Which deployment introduced the issue?
* Which commit caused the regression?
* Who made the change?
* Show evidence supporting the root cause.
* How many users are affected?
* What business impact is occurring?
* What should we do next?
* What happens if we ignore the warning?

Responses are generated using operational evidence and incident context.

---

# Technology Stack

## Frontend

* React
* Tailwind CSS
* Socket.IO Client

## Backend

* Node.js
* Express.js
* Socket.IO
* Axios

## AI Layer

* OpenRouter API
* GPT-OSS Models

## Deployment

* Vercel (Frontend)
* Render (Backend)

---

# Key Dependencies

## Frontend Dependencies

```bash
react
tailwindcss
socket.io-client
```

## Backend Dependencies

```bash
express
socket.io
axios
cors
dotenv
```

---

# Sample Data Used

The current MVP uses realistic synthetic enterprise datasets to simulate production incident response workflows.

Included datasets:

* Incident Records
* Deployment Events
* Pull Requests
* Commit History
* Alert Streams
* Infrastructure Telemetry
* Service Dependency Graphs
* Slack Incident Discussions
* Service Ownership Records

These datasets emulate information typically collected from:

* GitHub
* Datadog
* Slack
* CI/CD Pipelines
* Monitoring Platforms

The datasets are used to demonstrate:

* Root Cause Analysis
* Commit Attribution
* Blast Radius Computation
* Predictive Intelligence
* Business Impact Analysis
* Decision Simulation

without requiring access to production systems.

---

# Repository Structure

```text
IncidentMind/
│
├── frontend/
├── server/
├── datasets/
├── public/
├── README.md
└── package.json
```

---

# Installation

## Clone Repository

```bash
git clone https://github.com/rahilahmed-1945/IncidentMind-CodeBlooded.git
cd IncidentMind-CodeBlooded
```

---

## Backend Setup

```bash
cd server
npm install
npm start
```

---

## Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

---

# Environment Variables

Create a `.env` file inside the `server` directory.

```env
OPENROUTER_API_KEY=your_api_key
PORT=5000
```

---

# Environment Notes

## Requirements

* Node.js 18+
* npm 9+
* OpenRouter API Key
* Modern Browser (Chrome, Edge, Firefox)

## Tested Environment

* Windows 10/11
* Node.js 18+
* Vercel Deployment
* Render Deployment

---

# Example Incident Scenario

## Incident

A deployment of `auth-service v2.4.1` introduces a CPU-intensive JWT validation process.

## Processing

```text
Deployment Detected
        ↓
Latency Spike
        ↓
Gateway Retry Storm
        ↓
Redis Saturation
        ↓
Database Exhaustion
        ↓
Checkout Failure
```

## IncidentMind Output

### Root Cause

Deployment `v2.4.1` introduced an inefficient JWT validation process causing cascading service degradation.

### Commit Attribution

```text
PR #445

Author: Charlie

Commit: a1b2c3d

Service: auth-service

Change:
JWT validation optimization
```

### Recommended Action

Rollback Deployment

### Business Impact

* 120,000 users affected
* ₹20,833 projected loss
* 24-minute MTTR reduction

### Predicted Future Failures

* Redis Cache (11 minutes)
* Checkout Service (18 minutes)

---

# Current Status

## Implemented

* Incident Replay Engine
* Root Cause Analysis
* Commit Attribution Engine
* Temporal Reconstruction
* Blast Radius Analysis
* Predictive Intelligence
* Parallel Universe Simulator
* Business Impact Engine
* Natural Language Operations Console
* Real-Time Dashboard

## Partially Implemented

* Persistent Operational Storage
* Historical Incident Knowledge Base

## Simulated Components

* GitHub Integration
* Slack Integration
* Datadog Integration

---

# Future Roadmap

* Live GitHub Integration
* Live Datadog Integration
* Live Slack Integration
* Kubernetes Event Tracking
* Historical Incident Learning
* Real-Time Streaming Telemetry
* Multi-Incident Learning Engine

---

# Demo

## Live Application

https://incident-mind-code-blooded.vercel.app/


## Explanation Video

https://YOUR-VIDEO-LINK

---

Built for InnovateZ 2026.
