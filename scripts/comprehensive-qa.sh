#!/bin/bash
# Comprehensive QA: start server, login via browser, test all pages + features.
set +e
cd /home/z/my-project
pkill -f 'next dev' 2>/dev/null; pkill -f 'next-server' 2>/dev/null; sleep 2
setsid bash -c 'cd /home/z/my-project && exec bun run dev' < /dev/null > /home/z/my-project/dev.out.log 2>&1 & disown 2>/dev/null

for i in $(seq 1 40); do
  code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null)
  [ "$code" = "200" ] && { echo "[server ready ${i}s]"; break; }
  sleep 1
done

echo "=== 1. HOME ==="
agent-browser open http://localhost:3000 2>&1 | tail -1; sleep 1
agent-browser eval "JSON.stringify({title:document.title, h1:document.querySelector('h1')?.textContent, navLinks:document.querySelectorAll('nav a').length})" 2>&1 | tail -1

echo "=== 2. SIGNUP + LOGIN FLOW ==="
agent-browser open http://localhost:3000/login 2>&1 | tail -1; sleep 1
agent-browser fill '#email' 'qa-test-1783652916@laras.test' 2>&1 | tail -1
agent-browser fill '#password' 'TestPass123!' 2>&1 | tail -1
agent-browser click 'button[type="submit"]' 2>&1 | tail -1
sleep 5
agent-browser eval "JSON.stringify({url:location.href, h1:document.querySelector('h1')?.textContent})" 2>&1 | tail -1

echo "=== 3. DASHBOARD ==="
agent-browser open http://localhost:3000/dashboard 2>&1 | tail -1; sleep 3
agent-browser eval "JSON.stringify({url:location.href, h1:document.querySelector('h1')?.textContent, sections:document.querySelectorAll('section').length, links:document.querySelectorAll('a').length})" 2>&1 | tail -1

echo "=== 4. DOCUMENTS ==="
agent-browser open http://localhost:3000/documents 2>&1 | tail -1; sleep 3
agent-browser eval "JSON.stringify({url:location.href, h1:document.querySelector('h1')?.textContent, cards:document.querySelectorAll('[class*=card]').length, links:document.querySelectorAll('a[href*=\"/documents/\"]').length})" 2>&1 | tail -1

echo "=== 5. ENGLISH HUB ==="
agent-browser open http://localhost:3000/english 2>&1 | tail -1; sleep 3
agent-browser eval "JSON.stringify({url:location.href, h1:document.querySelector('h1')?.textContent, buttons:document.querySelectorAll('button').length})" 2>&1 | tail -1

echo "=== 6. APPLICATIONS ==="
agent-browser open http://localhost:3000/applications 2>&1 | tail -1; sleep 3
agent-browser eval "JSON.stringify({url:location.href, h1:document.querySelector('h1')?.textContent})" 2>&1 | tail -1

echo "=== 7. INTERVIEW ==="
agent-browser open http://localhost:3000/interview 2>&1 | tail -1; sleep 3
agent-browser eval "JSON.stringify({url:location.href, h1:document.querySelector('h1')?.textContent})" 2>&1 | tail -1

echo "=== 8. PROFILE ==="
agent-browser open http://localhost:3000/profile 2>&1 | tail -1; sleep 3
agent-browser eval "JSON.stringify({url:location.href, h1:document.querySelector('h1')?.textContent})" 2>&1 | tail -1

echo "=== 9. COMMAND PALETTE (Cmd+K) ==="
agent-browser open http://localhost:3000/dashboard 2>&1 | tail -1; sleep 2
agent-browser eval "document.body.dispatchEvent(new KeyboardEvent('keydown',{key:'k',metaKey:true,bubbles:true})); 'dispatched'" 2>&1 | tail -1
sleep 1
agent-browser eval "JSON.stringify({dialog:!!document.querySelector('[role=dialog]'), cmdkInput:!!document.querySelector('[cmdk-input]'), cmdkItems:document.querySelectorAll('[cmdk-item]').length})" 2>&1 | tail -1

echo "=== 10. MOBILE VIEW (375px) ==="
agent-browser eval "window.resizeTo(375, 812); 'resized'" 2>&1 | tail -1
agent-browser open http://localhost:3000/dashboard 2>&1 | tail -1; sleep 2
agent-browser eval "JSON.stringify({w:window.innerWidth, h1:document.querySelector('h1')?.textContent, horizontalScroll:document.body.scrollWidth>window.innerWidth})" 2>&1 | tail -1

echo "=== 11. SETTINGS ==="
agent-browser open http://localhost:3000/settings 2>&1 | tail -1; sleep 2
agent-browser eval "JSON.stringify({url:location.href, h1:document.querySelector('h1')?.textContent})" 2>&1 | tail -1

echo "=== 12. RUNTIME ERRORS ==="
tail -30 dev.out.log 2>/dev/null | grep -iE 'error|fail|exception|unhandled' | grep -v '0 errors\|Compiled\|Compiling' | tail -5 || echo "[no runtime errors]"

echo "=== QA DONE ==="
