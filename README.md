# Railroad Clarification Portal — Local Setup

Run locally with Flask + SQLite backend + Claude AI chatbot.

## Quick Start

### 1. Install Python deps
```bash
cd backend
pip install -r requirements.txt
```

### 2. Install Node deps
```bash
npm install
```

### 3. Set your Anthropic API key
```bash
# Windows CMD
set ANTHROPIC_API_KEY=sk-ant-...
# Mac/Linux
export ANTHROPIC_API_KEY=sk-ant-...
```

### 4. Run (Windows)
```cmd
start.bat
```

### 4. Run (Mac/Linux)
```bash
./start.sh
```

Open http://localhost:5173

## Demo Accounts
| Email | Password | Role |
|-------|----------|------|
| admin@railroad.com | admin123 | Admin |
| editor@railroad.com | editor123 | Editor |
| viewer@railroad.com | viewer123 | Viewer |

Database auto-created at backend/portal.db with 30 CN records.
