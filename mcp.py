import hashlib
import base64
import secrets
import urllib.parse
import requests
import webbrowser
from http.server import HTTPServer, BaseHTTPRequestHandler
import threading

# ── Config ──────────────────────────────────────────────────────────────────
CLIENT_ID    = "NWRX1otQ-c1XUBEgpV2kzboEr_dvR4Q75G_yzChmSto"
AUTH_URL     = "https://selfdecode.com/service/health-analysis/accounts/user/openid/authorize/"
TOKEN_URL    = "https://selfdecode.com/service/health-analysis/accounts/user/openid/token/"
REDIRECT_URI = "http://localhost:8765/callback"   # your own local redirect
SCOPES       = "openid email profile mcp"

# ── PKCE helpers ─────────────────────────────────────────────────────────────
def generate_pkce():
    verifier  = base64.urlsafe_b64encode(secrets.token_bytes(32)).rstrip(b"=").decode()
    challenge = base64.urlsafe_b64encode(
        hashlib.sha256(verifier.encode()).digest()
    ).rstrip(b"=").decode()
    return verifier, challenge

# ── Local callback server ─────────────────────────────────────────────────────
auth_code = None

class CallbackHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        global auth_code
        params = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
        auth_code = params.get("code", [None])[0]
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b"<h2>Auth complete! You can close this tab.</h2>")

    def log_message(self, *args):  # silence request logs
        pass

def start_server():
    server = HTTPServer(("localhost", 8765), CallbackHandler)
    server.handle_request()   # handle exactly one request then stop

# ── Main flow ─────────────────────────────────────────────────────────────────
def get_token():
    verifier, challenge = generate_pkce()
    state = secrets.token_urlsafe(16)

    params = {
        "response_type":         "code",
        "client_id":             CLIENT_ID,
        "redirect_uri":          REDIRECT_URI,
        "scope":                 SCOPES,
        "code_challenge":        challenge,
        "code_challenge_method": "S256",
        "state":                 state,
    }
    url = AUTH_URL + "?" + urllib.parse.urlencode(params)

    # Start local server in background, then open browser
    t = threading.Thread(target=start_server, daemon=True)
    t.start()
    print("Opening browser for login…")
    webbrowser.open(url)
    t.join(timeout=120)   # wait up to 2 min for the user to log in

    if not auth_code:
        raise RuntimeError("No auth code received (timed out?)")

    # Exchange code for tokens
    resp = requests.post(TOKEN_URL, data={
        "grant_type":    "authorization_code",
        "code":          auth_code,
        "redirect_uri":  REDIRECT_URI,
        "client_id":     CLIENT_ID,
        "code_verifier": verifier,
    })
    resp.raise_for_status()
    tokens = resp.json()

    print("\n✅ Access token:", tokens.get("access_token"))
    print("🔄 Refresh token:", tokens.get("refresh_token"))
    print("🆔 ID token:", tokens.get("id_token"))
    return tokens

if __name__ == "__main__":
    get_token()