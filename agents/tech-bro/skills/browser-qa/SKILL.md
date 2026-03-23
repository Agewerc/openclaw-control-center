# Skill: Browser QA

Use this skill to test and verify the openclaw-control-center app after making changes.

---

## Capabilities

**What I can do directly (no browser needed):**
- HTTP health check — all pages return 200
- API response validation — data is correct structure/content
- Console error detection — via API responses
- Code review — catch TypeScript/logic issues before they hit the browser

**What requires your terminal (browser screenshots):**
- Visual screenshot via `openclaw browser`
- The browser CDP can't be started from within my exec sandbox

---

## My QA Protocol (After Every Change)

### Step 1 — HTTP health check (I run this)

```python
import urllib.request
pages = ['/', '/agents', '/ideas', '/board', '/logs', '/cron-jobs']
for p in pages:
    r = urllib.request.urlopen('http://localhost:3000' + p, timeout=4)
    print(r.status, p)
```

All should return 200. If not — fix before proceeding.

### Step 2 — API data validation (I run this)

Check each API returns correct structure and real data:

```bash
curl -s http://localhost:3000/api/workspace-agents | python3 -c "import json,sys; d=json.load(sys.stdin); print('agents:', len(d['agents']))"
curl -s http://localhost:3000/api/tasks | python3 -c "import json,sys; d=json.load(sys.stdin); print('tasks:', d['stats']['total'])"
curl -s http://localhost:3000/api/ideas | python3 -c "import json,sys; d=json.load(sys.stdin); print('ideas:', d['total'])"
curl -s http://localhost:3000/api/agent-logs | python3 -c "import json,sys; d=json.load(sys.stdin); print('logs:', d['total'])"
curl -s http://localhost:3000/api/gateway-status | python3 -c "import json,sys; d=json.load(sys.stdin); print('health:', d['health'])"
```

### Step 3 — TypeScript check (I run this)

```bash
cd /Users/alangewerc/.openclaw/workspace/agents/tech-bro/openclaw-control-center && npx tsc --noEmit 2>&1 | grep error | head -10
```

Zero errors = good.

### Step 4 — Visual screenshot (Alan runs this, or I request it)

When visual confirmation needed, ask Alan to run:
```bash
openclaw browser --browser-profile openclaw open http://localhost:3000/<page>
openclaw browser --browser-profile openclaw screenshot --full-page
```

Or I can request it explicitly: *"Can you open /board and take a screenshot?"*

---

## Quick Full QA (run after major changes)

```python
import urllib.request, json

BASE = 'http://localhost:3000'

# Page health
pages = ['/', '/agents', '/ideas', '/board', '/logs', '/cron-jobs']
print('=== Pages ===')
for p in pages:
    try:
        r = urllib.request.urlopen(BASE + p, timeout=4)
        print(f'  {r.status} OK  {p}')
    except Exception as e:
        print(f'  ERR {p}: {e}')

# API health
apis = [
    ('/api/workspace-agents', lambda d: f"agents: {len(d.get('agents',[]))}"),
    ('/api/tasks',            lambda d: f"tasks: {d.get('stats',{}).get('total',0)}"),
    ('/api/ideas',            lambda d: f"ideas: {d.get('total',0)}"),
    ('/api/agent-logs',       lambda d: f"logs: {d.get('total',0)}"),
    ('/api/gateway-status',   lambda d: f"health: {d.get('health','?')}"),
]
print('=== APIs ===')
for path, fmt in apis:
    try:
        r = urllib.request.urlopen(BASE + path, timeout=4)
        d = json.load(r)
        print(f'  OK  {path}  →  {fmt(d)}')
    except Exception as e:
        print(f'  ERR {path}: {e}')
```

---

## What to Report

After QA, always tell Alan:
- ✅/❌ All pages load
- ✅/❌ APIs returning real data (with counts)
- ✅/❌ TypeScript clean
- Any issues found + fix applied
- Screenshot request if visual confirmation needed

---

## Notes

- Always run QA before saying "done"
- TypeScript errors won't break dev mode but will break production builds
- Empty API responses (0 items when data should exist) are bugs, not just warnings
