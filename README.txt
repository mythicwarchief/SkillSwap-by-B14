╔══════════════════════════════════════════════════════════════╗
║              SkillSwap — Setup & Run Instructions            ║
╚══════════════════════════════════════════════════════════════╝

IMPORTANT: Do NOT open index.html by double-clicking it.
The app uses ES Modules which require a local web server.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 OPTION 1 — VS Code (Easiest)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Open the extracted folder in VS Code
2. Install the "Live Server" extension (by Ritwick Dey)
   - Click Extensions icon → search "Live Server" → Install
3. Right-click index.html → "Open with Live Server"
4. Browser opens automatically at http://127.0.0.1:5500

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 OPTION 2 — Python (No install needed on most systems)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Open a terminal / command prompt
2. Navigate to the extracted folder:
   cd path\to\End Term Project
3. Run:
   python -m http.server 8000
4. Open browser → http://localhost:8000

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 LOGGING IN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Register with your Amrita college email:
  Format: yourname@am.students.amrita.edu

Demo credentials (pre-registered):
  Email:    demo@am.students.amrita.edu
  Password: Demo@1234

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 ABOUT THE DATA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
All data is stored in Firebase (cloud database).
No local database setup is required.
Any skills, requests, or messages submitted will
be visible to all users in real-time, on any device.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 PROJECT INFO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Platform  : SkillSwap — Peer Skill Exchange
Built with: HTML, CSS, Vanilla JavaScript, Firebase
Backend   : Firebase Auth + Firestore (cloud)
SDG Goals : SDG 4 (Quality Education), SDG 8 (Decent Work)
