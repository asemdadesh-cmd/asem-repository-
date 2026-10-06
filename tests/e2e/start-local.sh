#!/usr/bin/env bash
# Starts two independent local relays + the dev server (relays as separate
# processes so the e2e test can kill one to test failover).
set -e
cd "$(dirname "$0")/../.."
node scripts/local-broker.mjs 8884 > /tmp/prc-broker-a.log 2>&1 &
echo $! > /tmp/prc-broker-a.pid
node scripts/local-broker.mjs 8885 > /tmp/prc-broker-b.log 2>&1 &
echo $! > /tmp/prc-broker-b.pid
# production build that talks to the local relays, served with the API middleware
PRC_LOCAL_RELAYS=1 npx vite build > /tmp/prc-build.log 2>&1
PRC_NO_LOCAL_BROKER=1 nohup npx vite preview --port 5174 > /tmp/prc-vite-e2e.log 2>&1 &
echo $! > /tmp/prc-vite.pid
sleep 5
echo "relays + vite ready on http://localhost:5174"
