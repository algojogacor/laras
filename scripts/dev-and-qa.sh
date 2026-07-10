#!/bin/bash
# QA helper: starts dev server, waits for ready, runs agent-browser checks, then stops server.
# Usage: bash scripts/dev-and-qa.sh
set +e
cd /home/z/my-project

# Kill any stale server
pkill -f 'next dev' 2>/dev/null; pkill -f 'next-server' 2>/dev/null; pkill -f 'bun run dev' 2>/dev/null
sleep 2

# Start dev server (detached)
setsid bash -c 'cd /home/z/my-project && exec bun run dev' < /dev/null > /home/z/my-project/dev.out.log 2>&1 &
disown 2>/dev/null

# Wait for port 3000 (up to 40s)
ready=0
for i in $(seq 1 40); do
  code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null)
  if [ "$code" = "200" ]; then ready=1; echo "[qa] server ready after ${i}s (HTTP $code)"; break; fi
  sleep 1
done
if [ "$ready" != "1" ]; then echo "[qa] SERVER NOT READY"; tail -20 dev.out.log; exit 1; fi

echo "========================================"
echo "[qa] HOME PAGE"
echo "========================================"
agent-browser open http://localhost:3000 2>&1 | tail -1
sleep 1
agent-browser snapshot 2>&1 | head -50

echo ""
echo "========================================"
echo "[qa] LOGIN PAGE"
echo "========================================"
agent-browser open http://localhost:3000/login 2>&1 | tail -1
sleep 1
agent-browser snapshot 2>&1 | head -40

echo ""
echo "========================================"
echo "[qa] SIGNUP PAGE"
echo "========================================"
agent-browser open http://localhost:3000/signup 2>&1 | tail -1
sleep 1
agent-browser snapshot 2>&1 | head -40

echo ""
echo "========================================"
echo "[qa] CONSOLE ERRORS CHECK (via eval)"
echo "========================================"
agent-browser open http://localhost:3000 2>&1 | tail -1
sleep 1
agent-browser eval "JSON.stringify({title: document.title, h1: document.querySelector('h1')?.textContent, bodyLen: document.body.innerText.length, hasError: /error|exception/i.test(document.body.innerText)})" 2>&1 | head -5

echo ""
echo "[qa] dev.out.log tail (runtime errors?)"
tail -15 dev.out.log 2>&1

# Leave server running for further inspection
echo ""
echo "[qa] DONE. Server left running on :3000"
