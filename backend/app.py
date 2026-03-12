"""
Domain Clarification Portal - Flask Backend
Replaces Supabase with local SQLite database.
Chatbot powered by Claude claude-sonnet-4-20250514.
"""

import os
import json
import sqlite3
import hashlib
import secrets
import time
from datetime import datetime, timedelta
from functools import wraps
from flask import Flask, request, jsonify, Response, stream_with_context
from flask_cors import CORS
import anthropic

app = Flask(__name__)
CORS(app, origins=[
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost:4173",
    "https://domain-trackers-with-chat-bot.vercel.app",
    "https://*.vercel.app",
], supports_credentials=True)

DB_PATH = os.path.join(os.path.dirname(__file__), "portal.db")
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")

# ─────────────────────────────────────────────────
#  DATABASE SETUP
# ─────────────────────────────────────────────────

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn

def init_db():
    with get_db() as conn:
        conn.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id          TEXT PRIMARY KEY,
            email       TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            display_name TEXT,
            mobile_number TEXT,
            role        TEXT DEFAULT 'viewer',
            created_at  TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS sessions (
            token       TEXT PRIMARY KEY,
            user_id     TEXT NOT NULL,
            expires_at  TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS clarifications (
            id                      TEXT PRIMARY KEY,
            s_no                    INTEGER,
            module                  TEXT,
            scenario_steps          TEXT,
            status                  TEXT DEFAULT 'Open',
            offshore_comments       TEXT DEFAULT '',
            onsite_comments         TEXT DEFAULT '',
            date                    TEXT,
            tester                  TEXT DEFAULT '',
            offshore_reviewer       TEXT DEFAULT '',
            addressed_by            TEXT DEFAULT '',
            defect_should_be_raised TEXT DEFAULT '',
            priority                TEXT DEFAULT '',
            assigned_to             TEXT DEFAULT '',
            drop_name               TEXT DEFAULT '',
            keywords                TEXT DEFAULT '',
            reason                  TEXT DEFAULT '',
            open                    TEXT DEFAULT '',
            created_at              TEXT DEFAULT (datetime('now')),
            updated_at              TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS upload_history (
            id          TEXT PRIMARY KEY,
            filename    TEXT,
            row_count   INTEGER,
            uploaded_by TEXT,
            created_at  TEXT DEFAULT (datetime('now'))
        );
        """)

def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

def generate_token():
    return secrets.token_urlsafe(32)

def seed_dummy_data():
    with get_db() as conn:
        # Check if already seeded
        if conn.execute("SELECT COUNT(*) FROM users").fetchone()[0] > 0:
            return

        # Seed admin user
        admin_id = secrets.token_urlsafe(16)
        conn.execute("""
            INSERT INTO users (id, email, password_hash, display_name, role)
            VALUES (?, ?, ?, ?, ?)
        """, (admin_id, "admin@railroad.com", hash_password("admin123"), "Admin User", "admin"))

        # Seed editor user
        editor_id = secrets.token_urlsafe(16)
        conn.execute("""
            INSERT INTO users (id, email, password_hash, display_name, role)
            VALUES (?, ?, ?, ?, ?)
        """, (editor_id, "editor@railroad.com", hash_password("editor123"), "Jane Smith", "editor"))

        # Seed viewer user
        viewer_id = secrets.token_urlsafe(16)
        conn.execute("""
            INSERT INTO users (id, email, password_hash, display_name, role)
            VALUES (?, ?, ?, ?, ?)
        """, (viewer_id, "viewer@railroad.com", hash_password("viewer123"), "Bob Lee", "viewer"))

        # Seed 30 realistic CN (Clarification Notice) records for Railways
        clarifications = [
            (1, "Locomotive", "Verify max axle load for CN 4500 class on the Bala subdivision. Drawings show 28t but operational manual says 26t. Which is the authoritative source?", "Closed", "Offshore: Drawing version 3.2 is authoritative; manual is outdated. Axle load is 28t.", "Onsite: Confirmed 28t. Manual will be updated in next revision cycle.", "John Tester", "Priya R.", "John T.", "No", "P1", "Track Engineering", "Drop-1"),
            (2, "Signalling", "Signal aspect 'Clear to Limited' not defined in the CN Rule Book section 4.2. How should crews interpret this at controlled points?", "Closed", "Offshore: Refer to CROR Rule 410(a) which supersedes local rule book.", "Onsite: Training bulletin issued to all conductors.", "Sarah K.", "Rahul M.", "Sarah K.", "No", "P2", "Operations", "Drop-1"),
            (3, "Track Geometry", "Spiral transition length calculation in curve CN-34B does not match the computed value in the submitted drawing. Is there an approved deviation?", "Open", "Offshore: Awaiting confirmation from design lead on spiral length formula used.", "Onsite: Field survey pending. Hold construction until resolved.", "Mike D.", "Anita S.", "Mike D.", "Yes", "P1", "Civil Engineering", "Drop-2"),
            (4, "Bridge", "Pier cap reinforcement schedule missing from CN Bridge 112 structural drawings. How do we proceed with concrete pour?", "Open from Offshore", "Offshore: Schedule being drafted. Do not proceed with pour.", "Onsite: Pour postponed. Formwork ready.", "Chris L.", "Vijay P.", "", "Yes", "P1", "Structural", "Drop-2"),
            (5, "Locomotive", "Pantograph height specification conflict between OEM manual and CN clearance diagram for electrification pilot project.", "Closed", "Offshore: OEM manual takes precedence in electrification zones.", "Onsite: Updated clearance zones marked on track charts.", "Alice B.", "Priya R.", "Alice B.", "No", "P2", "Electrification", "Drop-1"),
            (6, "Drainage", "Storm water detention calculation for yard expansion at MacMillan yard uses 1:50 year return period but CN standard requires 1:100.", "Open", "Offshore: Escalated to senior hydraulic engineer for ruling.", "Onsite: Design on hold pending clarification.", "Tom W.", "Rahul M.", "Tom W.", "No", "P1", "Civil Engineering", "Drop-3"),
            (7, "Communications", "Radio dead zone identified between Mile 44 and Mile 46 on the Edson Subdivision. Not captured in the communication coverage plan.", "Closed", "Offshore: Dead zone was known; repeater installation scheduled for Q3.", "Onsite: Temporary protocol issued for affected segment.", "Nancy F.", "Anita S.", "Nancy F.", "No", "P2", "Telecom", "Drop-1"),
            (8, "Signalling", "Interlocking diagram for Jasper does not show the new siding added in 2024. Is the diagram to be updated before testing?", "Open", "Offshore: Updated diagram under review. Testing cannot proceed without it.", "Onsite: Testing paused.", "James O.", "Vijay P.", "", "No", "P1", "Signalling", "Drop-3"),
            (9, "Track Geometry", "Gauge widening tolerance on curve at MP 102.3 exceeds CN standard by 3mm. Is a formal deviation required?", "Closed", "Offshore: Formal deviation CN-DEV-2024-019 approved. No further action.", "Onsite: Deviation record filed.", "Lisa M.", "Priya R.", "Lisa M.", "No", "P2", "Track Engineering", "Drop-2"),
            (10, "Bridge", "Bridge CN-88 inspection report references AREMA 2019 but the project specification requires AREMA 2023. Which edition governs?", "Closed", "Offshore: AREMA 2023 governs per project spec section 01010.", "Onsite: Inspector to re-verify items that changed between editions.", "Kevin R.", "Rahul M.", "Kevin R.", "No", "P2", "Structural", "Drop-1"),
            (11, "Locomotive", "DPU (Distributed Power Unit) consist configuration limits not specified for the new 8000HP units on mountain grades.", "Open", "Offshore: Awaiting traction simulation results.", "Onsite: Operations restricted to 2+1 consist pending clarification.", "Paula S.", "Anita S.", "", "No", "P1", "Motive Power", "Drop-3"),
            (12, "Drainage", "Culvert CN-CUL-047 hydraulic capacity appears undersized for 1:100 year event based on revised watershed area.", "Open from Offshore", "Offshore: Recommending upsizing to 1800mm diameter from 1200mm.", "Onsite: Awaiting revised design drawing.", "Brian T.", "Vijay P.", "", "Yes", "P1", "Civil Engineering", "Drop-3"),
            (13, "Signalling", "Block occupancy detection system sensitivity setting conflicts between two vendors on the Wainwright Subdivision.", "Closed", "Offshore: Vendor A settings apply throughout; Vendor B to reconfigure.", "Onsite: Reconfiguration complete and tested.", "Diana L.", "Priya R.", "Diana L.", "No", "P2", "Signalling", "Drop-2"),
            (14, "Communications", "Fibre optic splice loss budget exceeds CN's allowed 0.3dB/km on segment between Edmonton and Wainwright.", "Open", "Offshore: Root cause analysis in progress. May require re-splicing.", "Onsite: Service intact but monitoring.", "Eric C.", "Rahul M.", "", "No", "P2", "Telecom", "Drop-2"),
            (15, "Track Geometry", "Super-elevation run-off rate on curve entry at MP 78 calculated at 1:400 but CN standard requires 1:500 minimum.", "Closed", "Offshore: Engineering departure CN-ED-2023-044 covers this. No action needed.", "Onsite: Filed.", "Fiona B.", "Anita S.", "Fiona B.", "No", "P2", "Track Engineering", "Drop-1"),
            (16, "Bridge", "Expansion joint gap specification for Bridge CN-156 not clear — thermal range not stated. What temperature range to use?", "Open", "Offshore: Use -40°C to +35°C per CN bridge design standard section 6.3.", "Onsite: Designer to update drawings.", "George H.", "Vijay P.", "George H.", "No", "P1", "Structural", "Drop-3"),
            (17, "Locomotive", "Brake pipe pressure test procedure for 150-car train not documented in the new rolling stock maintenance manual.", "Closed", "Offshore: Procedure located in CN Engineering Circular EC-2022-17.", "Onsite: Circular distributed to maintenance staff.", "Helen D.", "Priya R.", "Helen D.", "No", "P2", "Motive Power", "Drop-1"),
            (18, "Drainage", "Swale grades on the east side of the MacMillan expansion do not direct flow toward the detention pond.", "Open", "Offshore: Grading plan revision required.", "Onsite: Construction paused in swale area.", "Ian K.", "Rahul M.", "", "Yes", "P1", "Civil Engineering", "Drop-3"),
            (19, "Signalling", "Axle counter reset procedure requires two-person verification but site only has single-technician coverage nights.", "Open from Offshore", "Offshore: Recommending remote witness via video call as interim measure.", "Onsite: Pending approval of interim procedure.", "Julia M.", "Anita S.", "", "No", "P2", "Signalling", "Drop-2"),
            (20, "Communications", "Emergency radio channel plan does not include the new MacMillan Yard tower. Channel assignments incomplete.", "Closed", "Offshore: Updated channel plan issued. Tower added as R-07.", "Onsite: All radios reprogrammed.", "Karl N.", "Vijay P.", "Karl N.", "No", "P2", "Telecom", "Drop-1"),
            (21, "Track Geometry", "Tie plate fastener torque spec missing from track laying specification document for CWR installation.", "Closed", "Offshore: 210 Nm per CN Track Standard TS-15.", "Onsite: Spec addendum issued.", "Laura O.", "Priya R.", "Laura O.", "No", "P2", "Track Engineering", "Drop-2"),
            (22, "Bridge", "Concrete mix design for deck rehabilitation of Bridge CN-204 uses w/c ratio of 0.45 but CN requires 0.40 max.", "Open", "Offshore: Non-conformance raised. Mix design to be revised.", "Onsite: Pour halted.", "Mark P.", "Rahul M.", "", "Yes", "P1", "Structural", "Drop-3"),
            (23, "Locomotive", "Sand delivery rate for locomotives operating on 1% grades not meeting CN traction requirements during wet conditions.", "Open", "Offshore: Investigating nozzle orifice size. Possible modification required.", "Onsite: Temporary speed restriction on affected grade.", "Nina Q.", "Anita S.", "", "No", "P1", "Motive Power", "Drop-3"),
            (24, "Drainage", "Riprap specification for culvert outlet protection does not include a gradation table.", "Closed", "Offshore: Gradation per OPSS 1004 Table 2, Class 2.", "Onsite: Spec updated.", "Oscar R.", "Vijay P.", "Oscar R.", "No", "P2", "Civil Engineering", "Drop-1"),
            (25, "Signalling", "Vital relay room temperature limits exceed CN's 35°C max on summer days due to HVAC undersizing.", "Open from Offshore", "Offshore: HVAC upgrade order placed. Portable cooling unit as interim.", "Onsite: Portable unit deployed.", "Penny S.", "Priya R.", "", "No", "P2", "Signalling", "Drop-2"),
            (26, "Communications", "SCADA system polling interval for yard switches set at 5 seconds; CN standard requires 2 seconds.", "Closed", "Offshore: Configuration corrected to 2 second polling.", "Onsite: Verified and tested.", "Quinn T.", "Rahul M.", "Quinn T.", "No", "P2", "Telecom", "Drop-2"),
            (27, "Track Geometry", "Ballast section drawing shows 150mm shoulder but CN standard requires 300mm on curves > 4 degrees.", "Open", "Offshore: Drawing error confirmed. Revision in progress.", "Onsite: Construction proceeding per verbal direction. Formal revision awaited.", "Rachel U.", "Anita S.", "", "No", "P1", "Track Engineering", "Drop-3"),
            (28, "Bridge", "Welding procedure specification (WPS) for Bridge CN-89 stiffener repair not pre-qualified per CSA W59.", "Open", "Offshore: WPS qualification testing underway. Estimated 3 weeks.", "Onsite: Repair on hold.", "Steve V.", "Vijay P.", "", "Yes", "P1", "Structural", "Drop-3"),
            (29, "Locomotive", "Fuel tank vent pipe orientation on new GE Tier 4 units could allow rainwater ingress per engineering review.", "Closed", "Offshore: OEM issued service bulletin SB-2024-112 with corrective action.", "Onsite: All units updated.", "Tina W.", "Priya R.", "Tina W.", "No", "P2", "Motive Power", "Drop-1"),
            (30, "Drainage", "Detention pond outfall pipe inverts shown on drawing don't match the geotechnical boring elevations. 0.8m discrepancy.", "Open", "Offshore: Survey check ordered. Design to be reconciled.", "Onsite: Outfall construction paused.", "Uma X.", "Rahul M.", "", "Yes", "P1", "Civil Engineering", "Drop-3"),
        ]

        keywords_map = {
            "Locomotive": "locomotive, axle, load, DPU, pantograph, brake, sand, fuel",
            "Signalling": "signal, interlocking, axle counter, relay, SCADA, block",
            "Track Geometry": "track, curve, gauge, super-elevation, spiral, ballast, CWR",
            "Bridge": "bridge, pier, reinforcement, expansion, concrete, welding, deck",
            "Drainage": "drainage, culvert, detention, storm water, swale, riprap, pond",
            "Communications": "communication, radio, fibre, SCADA, channel, polling",
        }

        for i, (sno, module, scenario, status, offshore, onsite, tester, reviewer, addressed, defect, priority, assignee, drop) in enumerate(clarifications):
            cid = secrets.token_urlsafe(16)
            date_val = (datetime(2024, 1, 1) + timedelta(days=i * 12)).strftime("%Y-%m-%dT%H:%M:%S")
            open_val = "Closed" if status == "Closed" else "Open"
            conn.execute("""
                INSERT INTO clarifications (id, s_no, module, scenario_steps, status,
                    offshore_comments, onsite_comments, date, tester, offshore_reviewer,
                    addressed_by, defect_should_be_raised, priority, assigned_to, drop_name,
                    keywords, open)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            """, (cid, sno, module, scenario, status, offshore, onsite, date_val,
                  tester, reviewer, addressed, defect, priority, assignee, drop,
                  keywords_map.get(module, ""), open_val))

        conn.commit()
        print("✅ Database seeded with demo data.")

# ─────────────────────────────────────────────────
#  AUTH HELPERS
# ─────────────────────────────────────────────────

def get_current_user():
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None
    token = auth[7:]
    with get_db() as conn:
        row = conn.execute("""
            SELECT u.* FROM sessions s
            JOIN users u ON u.id = s.user_id
            WHERE s.token = ? AND s.expires_at > datetime('now')
        """, (token,)).fetchone()
    return dict(row) if row else None

def require_auth(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        user = get_current_user()
        if not user:
            return jsonify({"error": "Unauthorized"}), 401
        request.current_user = user
        return f(*args, **kwargs)
    return wrapper

def require_admin(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        user = get_current_user()
        if not user or user["role"] != "admin":
            return jsonify({"error": "Admin required"}), 403
        request.current_user = user
        return f(*args, **kwargs)
    return wrapper

# ─────────────────────────────────────────────────
#  AUTH ROUTES
# ─────────────────────────────────────────────────

@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.json or {}
    email = data.get("email", "").lower().strip()
    password = data.get("password", "")

    with get_db() as conn:
        user = conn.execute(
            "SELECT * FROM users WHERE email = ? AND password_hash = ?",
            (email, hash_password(password))
        ).fetchone()

    if not user:
        return jsonify({"error": "Invalid email or password"}), 401

    token = generate_token()
    expires_at = (datetime.utcnow() + timedelta(days=7)).strftime("%Y-%m-%dT%H:%M:%S")

    with get_db() as conn:
        conn.execute(
            "INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)",
            (token, user["id"], expires_at)
        )

    return jsonify({
        "token": token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "display_name": user["display_name"],
            "role": user["role"],
        }
    })

@app.route("/api/auth/logout", methods=["POST"])
@require_auth
def logout():
    auth = request.headers.get("Authorization", "")[7:]
    with get_db() as conn:
        conn.execute("DELETE FROM sessions WHERE token = ?", (auth,))
    return jsonify({"success": True})

@app.route("/api/auth/me", methods=["GET"])
@require_auth
def me():
    u = request.current_user
    return jsonify({
        "id": u["id"],
        "email": u["email"],
        "display_name": u["display_name"],
        "mobile_number": u["mobile_number"],
        "role": u["role"],
        "created_at": u["created_at"],
    })

# ─────────────────────────────────────────────────
#  CLARIFICATIONS ROUTES
# ─────────────────────────────────────────────────

def row_to_dict(row):
    d = dict(row)
    return d

@app.route("/api/clarifications", methods=["GET"])
@require_auth
def list_clarifications():
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM clarifications ORDER BY s_no ASC"
        ).fetchall()
    return jsonify([row_to_dict(r) for r in rows])

@app.route("/api/clarifications/<cid>", methods=["GET"])
@require_auth
def get_clarification(cid):
    with get_db() as conn:
        row = conn.execute("SELECT * FROM clarifications WHERE id = ?", (cid,)).fetchone()
    if not row:
        return jsonify({"error": "Not found"}), 404
    return jsonify(row_to_dict(row))

@app.route("/api/clarifications", methods=["POST"])
@require_auth
def create_clarification():
    if request.current_user["role"] not in ("admin", "editor"):
        return jsonify({"error": "Forbidden"}), 403
    data = request.json or {}
    cid = secrets.token_urlsafe(16)
    now = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S")
    with get_db() as conn:
        conn.execute("""
            INSERT INTO clarifications (id, s_no, module, scenario_steps, status,
                offshore_comments, onsite_comments, date, tester, offshore_reviewer,
                addressed_by, defect_should_be_raised, priority, assigned_to,
                drop_name, keywords, reason, open, created_at, updated_at)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        """, (cid, data.get("s_no"), data.get("module",""), data.get("scenario_steps",""),
              data.get("status","Open"), data.get("offshore_comments",""),
              data.get("onsite_comments",""), data.get("date", now),
              data.get("tester",""), data.get("offshore_reviewer",""),
              data.get("addressed_by",""), data.get("defect_should_be_raised",""),
              data.get("priority",""), data.get("assigned_to",""),
              data.get("drop_name",""), data.get("keywords",""),
              data.get("reason",""), data.get("open","Open"), now, now))
    return jsonify({"id": cid, "success": True})

@app.route("/api/clarifications/<cid>", methods=["PUT"])
@require_auth
def update_clarification(cid):
    if request.current_user["role"] not in ("admin", "editor"):
        return jsonify({"error": "Forbidden"}), 403
    data = request.json or {}
    now = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S")
    with get_db() as conn:
        conn.execute("""
            UPDATE clarifications SET
                s_no=?, module=?, scenario_steps=?, status=?,
                offshore_comments=?, onsite_comments=?, date=?,
                tester=?, offshore_reviewer=?, addressed_by=?,
                defect_should_be_raised=?, priority=?, assigned_to=?,
                drop_name=?, keywords=?, reason=?, open=?, updated_at=?
            WHERE id=?
        """, (data.get("s_no"), data.get("module",""), data.get("scenario_steps",""),
              data.get("status","Open"), data.get("offshore_comments",""),
              data.get("onsite_comments",""), data.get("date",""),
              data.get("tester",""), data.get("offshore_reviewer",""),
              data.get("addressed_by",""), data.get("defect_should_be_raised",""),
              data.get("priority",""), data.get("assigned_to",""),
              data.get("drop_name",""), data.get("keywords",""),
              data.get("reason",""), data.get("open",""), now, cid))
    return jsonify({"success": True})

@app.route("/api/clarifications/<cid>", methods=["DELETE"])
@require_auth
def delete_clarification(cid):
    if request.current_user["role"] != "admin":
        return jsonify({"error": "Admin required"}), 403
    with get_db() as conn:
        conn.execute("DELETE FROM clarifications WHERE id = ?", (cid,))
    return jsonify({"success": True})

@app.route("/api/clarifications/search", methods=["GET"])
@require_auth
def search_clarifications():
    q = request.args.get("q", "").strip()
    if not q:
        return jsonify({"results": [], "suggestions": []})
    like = f"%{q}%"
    with get_db() as conn:
        rows = conn.execute("""
            SELECT * FROM clarifications
            WHERE module LIKE ? OR scenario_steps LIKE ?
               OR offshore_comments LIKE ? OR onsite_comments LIKE ?
               OR keywords LIKE ? OR assigned_to LIKE ?
            ORDER BY s_no ASC LIMIT 20
        """, (like, like, like, like, like, like)).fetchall()
    return jsonify({"results": [row_to_dict(r) for r in rows], "suggestions": []})

# ─────────────────────────────────────────────────
#  UPLOAD HISTORY
# ─────────────────────────────────────────────────

@app.route("/api/upload-history", methods=["GET"])
@require_auth
def upload_history():
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM upload_history ORDER BY created_at DESC"
        ).fetchall()
    return jsonify([dict(r) for r in rows])

@app.route("/api/upload-history", methods=["POST"])
@require_auth
def add_upload_history():
    data = request.json or {}
    hid = secrets.token_urlsafe(16)
    with get_db() as conn:
        conn.execute("""
            INSERT INTO upload_history (id, filename, row_count, uploaded_by)
            VALUES (?, ?, ?, ?)
        """, (hid, data.get("filename",""), data.get("row_count",0),
              request.current_user["email"]))
    return jsonify({"id": hid, "success": True})

# ─────────────────────────────────────────────────
#  USERS (admin only)
# ─────────────────────────────────────────────────

@app.route("/api/users", methods=["GET"])
@require_admin
def list_users():
    with get_db() as conn:
        rows = conn.execute(
            "SELECT id, email, display_name, role, created_at FROM users ORDER BY created_at ASC"
        ).fetchall()
    return jsonify([dict(r) for r in rows])

@app.route("/api/users", methods=["POST"])
@require_admin
def create_user():
    data = request.json or {}
    uid = secrets.token_urlsafe(16)
    with get_db() as conn:
        try:
            conn.execute("""
                INSERT INTO users (id, email, password_hash, display_name, role)
                VALUES (?, ?, ?, ?, ?)
            """, (uid, data["email"].lower(), hash_password(data.get("password","changeme")),
                  data.get("display_name",""), data.get("role","viewer")))
        except sqlite3.IntegrityError:
            return jsonify({"error": "Email already exists"}), 409
    return jsonify({"id": uid, "success": True})

@app.route("/api/users/<uid>", methods=["DELETE"])
@require_admin
def delete_user(uid):
    with get_db() as conn:
        conn.execute("DELETE FROM sessions WHERE user_id = ?", (uid,))
        conn.execute("DELETE FROM users WHERE id = ?", (uid,))
    return jsonify({"success": True})

# ─────────────────────────────────────────────────
#  CHATBOT (Claude AI - Live DB-Aware + Streaming)
# ─────────────────────────────────────────────────

def get_live_db_context():
    """Query the live SQLite database and build a rich context snapshot for the AI."""
    with get_db() as conn:
        # --- Summary stats ---
        total = conn.execute("SELECT COUNT(*) FROM clarifications").fetchone()[0]
        open_cnt = conn.execute("SELECT COUNT(*) FROM clarifications WHERE status='Open'").fetchone()[0]
        closed_cnt = conn.execute("SELECT COUNT(*) FROM clarifications WHERE status='Closed'").fetchone()[0]
        offshore_cnt = conn.execute("SELECT COUNT(*) FROM clarifications WHERE status='Open from Offshore'").fetchone()[0]
        p1_cnt = conn.execute("SELECT COUNT(*) FROM clarifications WHERE priority='P1'").fetchone()[0]
        p2_cnt = conn.execute("SELECT COUNT(*) FROM clarifications WHERE priority='P2'").fetchone()[0]

        # --- Per-module breakdown ---
        module_rows = conn.execute("""
            SELECT module,
                   COUNT(*) as total,
                   SUM(CASE WHEN status='Open' THEN 1 ELSE 0 END) as open,
                   SUM(CASE WHEN status='Closed' THEN 1 ELSE 0 END) as closed,
                   SUM(CASE WHEN status='Open from Offshore' THEN 1 ELSE 0 END) as offshore,
                   SUM(CASE WHEN priority='P1' THEN 1 ELSE 0 END) as p1
            FROM clarifications
            GROUP BY module
            ORDER BY total DESC
        """).fetchall()

        # --- Per-drop breakdown ---
        drop_rows = conn.execute("""
            SELECT drop_name, COUNT(*) as total
            FROM clarifications
            WHERE drop_name != ''
            GROUP BY drop_name
            ORDER BY drop_name
        """).fetchall()

        # --- Assignee breakdown ---
        assignee_rows = conn.execute("""
            SELECT assigned_to, COUNT(*) as total
            FROM clarifications
            WHERE assigned_to != ''
            GROUP BY assigned_to
            ORDER BY total DESC
            LIMIT 10
        """).fetchall()

        # --- All CN records (compact) for search/reference ---
        all_cns = conn.execute("""
            SELECT s_no, module, scenario_steps, status, priority,
                   assigned_to, drop_name, offshore_comments, onsite_comments,
                   addressed_by, date
            FROM clarifications
            ORDER BY s_no ASC
        """).fetchall()

    # Build module summary table
    module_lines = []
    for r in module_rows:
        module_lines.append(
            f"  - {r['module']}: {r['total']} total | {r['open']} Open | "
            f"{r['closed']} Closed | {r['offshore']} Offshore | {r['p1']} P1"
        )

    drop_lines = [f"  - {r['drop_name']}: {r['total']} CNs" for r in drop_rows]
    assignee_lines = [f"  - {r['assigned_to']}: {r['total']} CNs" for r in assignee_rows]

    # Build full CN list (compact format)
    cn_lines = []
    for r in all_cns:
        scenario_short = (r['scenario_steps'] or '')[:120].replace('\n', ' ')
        cn_lines.append(
            f"[CN#{r['s_no']} | {r['module']} | {r['status']} | {r['priority']} | "
            f"Assigned:{r['assigned_to']} | Drop:{r['drop_name']}]\n"
            f"  Scenario: {scenario_short}\n"
            f"  Offshore: {(r['offshore_comments'] or '')[:100].replace(chr(10),' ')}\n"
            f"  Onsite: {(r['onsite_comments'] or '')[:100].replace(chr(10),' ')}"
        )

    context = f"""
=== LIVE DATABASE SNAPSHOT (as of now) ===

OVERALL STATS:
  Total CNs: {total}
  Open: {open_cnt} | Closed: {closed_cnt} | Open from Offshore: {offshore_cnt}
  P1 (High Priority): {p1_cnt} | P2 (Medium): {p2_cnt}

BY MODULE:
{chr(10).join(module_lines)}

BY DROP:
{chr(10).join(drop_lines) if drop_lines else '  No drop data'}

TOP ASSIGNEES:
{chr(10).join(assignee_lines) if assignee_lines else '  No assignee data'}

ALL CLARIFICATION NOTICES (full detail):
{chr(10).join(cn_lines)}

=== END SNAPSHOT ===
"""
    return context


SYSTEM_PROMPT_BASE = """You are CN Bot, an AI assistant for the Railroad Clarification Portal used by Railways engineering teams.

You have DIRECT ACCESS to the live database — the snapshot below contains every CN record with full details.
Use this data to answer questions precisely and accurately.

You can help with:
- Count, filter, or list CNs by module / status / priority / drop / assignee
- Summarize or explain any CN scenario or issue
- Draft professional offshore/onsite comments and closure notes
- Identify trends (e.g. most P1s, who has most CNs, which module has most open items)
- Answer any question about the data — always use the snapshot, never say you don't have access

Rules:
- Always answer from the snapshot data first — be specific with numbers and names
- Keep answers concise and professional
- Use bullet points for lists
- If asked to draft a comment or note, write it in professional railroad engineering language

{live_context}"""


@app.route("/api/chat", methods=["POST"])
@require_auth
def chat():
    if not ANTHROPIC_API_KEY:
        return jsonify({"error": "ANTHROPIC_API_KEY not set in server environment"}), 500

    data = request.json or {}
    messages = data.get("messages", [])

    # Build system prompt with live DB context injected
    try:
        live_context = get_live_db_context()
    except Exception as e:
        live_context = f"(DB context unavailable: {e})"

    system_prompt = SYSTEM_PROMPT_BASE.format(live_context=live_context)

    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

    def generate():
        try:
            with client.messages.stream(
                model="claude-sonnet-4-20250514",
                max_tokens=2048,
                system=system_prompt,
                messages=messages,
            ) as stream:
                for text in stream.text_stream:
                    chunk = {"choices": [{"delta": {"content": text}}]}
                    yield f"data: {json.dumps(chunk)}\n\n"
                yield "data: [DONE]\n\n"
        except Exception as e:
            err_chunk = {"choices": [{"delta": {"content": f"\n\n❌ Error: {str(e)}"}}]}
            yield f"data: {json.dumps(err_chunk)}\n\n"
            yield "data: [DONE]\n\n"

    return Response(
        stream_with_context(generate()),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        }
    )

# ─────────────────────────────────────────────────
#  HEALTH
# ─────────────────────────────────────────────────

@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "time": datetime.utcnow().isoformat()})

# ─────────────────────────────────────────────────
#  MAIN
# ─────────────────────────────────────────────────

if __name__ == "__main__":
    init_db()
    seed_dummy_data()
    port = int(os.environ.get("PORT", 5000))
    print("🚂 Railroad Clarification Portal API running on http://localhost:" + str(port))
    print("📋 Demo accounts:")
    print("   admin@railroad.com  / admin123  (admin)")
    print("   editor@railroad.com / editor123 (editor)")
    print("   viewer@railroad.com / viewer123 (viewer)")
    app.run(debug=False, host="0.0.0.0", port=port, threaded=True)
