#!/usr/bin/env python3
"""Connect your Spotify to the About page's music card (run once).

Before this:
  1. developer.spotify.com/dashboard -> Create app
       Redirect URI:  http://127.0.0.1:8888/callback
       API:           Web API
  2. In this folder:  npx wrangler login   then   npx wrangler deploy

Then run:  python3 connect-spotify.py

It asks for the app's Client ID and Client secret (the secret is hidden while you type),
opens Spotify so you can press Agree, and saves the three values as secrets on your
Cloudflare Worker. Then it asks for your Lanyard key (the one the Lanyard bot sent you
for .apikey) so the Worker can remember your last game; press Enter to skip that.
Nothing is printed or written to a file.

Only want to add or change the Lanyard key?   npx wrangler secret put LANYARD_KEY
"""
import base64
import getpass
import http.server
import json
import os
import secrets
import subprocess
import sys
import threading
import urllib.error
import urllib.parse
import urllib.request
import webbrowser

PORT = 8888
REDIRECT = f'http://127.0.0.1:{PORT}/callback'
SCOPES = 'user-read-currently-playing user-read-recently-played'
HERE = os.path.dirname(os.path.abspath(__file__))


def post_form(url, fields, auth):
    req = urllib.request.Request(
        url, data=urllib.parse.urlencode(fields).encode(),
        headers={'Authorization': auth, 'Content-Type': 'application/x-www-form-urlencoded'})
    with urllib.request.urlopen(req, timeout=20) as res:
        return json.load(res)


def main():
    client_id = input('Spotify Client ID: ').strip()
    client_secret = getpass.getpass('Spotify Client secret (hidden): ').strip()
    if not client_id or not client_secret:
        sys.exit('Both are needed. Find them on your app\'s Settings page in the Spotify dashboard.')

    state = secrets.token_urlsafe(16)
    got = {}

    class Callback(http.server.BaseHTTPRequestHandler):
        def do_GET(self):
            url = urllib.parse.urlparse(self.path)
            if url.path != '/callback':
                self.send_response(404)
                self.end_headers()
                return
            q = urllib.parse.parse_qs(url.query)
            ok = q.get('state', [''])[0] == state and 'code' in q
            got['code'] = q['code'][0] if ok else ''
            got['error'] = q.get('error', [''])[0]
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.end_headers()
            msg = 'Connected. You can close this tab and go back to the terminal.' if ok else \
                'That didn’t work. Go back to the terminal.'
            self.wfile.write(f'<p style="font:20px system-ui;padding:48px">{msg}</p>'.encode())
            threading.Thread(target=self.server.shutdown, daemon=True).start()

        def log_message(self, *args):
            pass

    try:
        server = http.server.HTTPServer(('127.0.0.1', PORT), Callback)
    except OSError:
        sys.exit(f'Port {PORT} is busy. Close whatever is using it and run this again.')

    link = 'https://accounts.spotify.com/authorize?' + urllib.parse.urlencode({
        'client_id': client_id, 'response_type': 'code', 'redirect_uri': REDIRECT,
        'scope': SCOPES, 'state': state,
    })
    print('\nOpening Spotify in your browser. Log in if asked, then press Agree.')
    print('If nothing opens, paste this link into your browser:\n' + link + '\n')
    webbrowser.open(link)
    server.serve_forever()

    if not got.get('code'):
        sys.exit(f'Spotify didn’t connect ({got.get("error") or "no code came back"}).\n'
                 f'Check the app\'s Redirect URI is exactly {REDIRECT} and try again.')

    basic = 'Basic ' + base64.b64encode(f'{client_id}:{client_secret}'.encode()).decode()
    try:
        tokens = post_form('https://accounts.spotify.com/api/token',
                           {'grant_type': 'authorization_code', 'code': got['code'], 'redirect_uri': REDIRECT}, basic)
    except urllib.error.HTTPError as e:
        try:
            why = json.loads(e.read().decode() or '{}')
        except ValueError:
            why = {}
        code, detail = why.get('error', ''), why.get('error_description', '')
        if code == 'invalid_client':
            sys.exit(f'Spotify says the Client ID or secret is wrong ({detail or code}).\n'
                     'On your app\'s Settings page, click "View client secret", copy it again (no spaces), and rerun.')
        if code == 'invalid_grant':
            sys.exit(f'Spotify didn’t accept the sign-in ({detail or code}).\n'
                     f'Check the app\'s Redirect URI is exactly {REDIRECT}, then rerun and press Agree once.')
        sys.exit(f'Spotify said no (HTTP {e.code}: {detail or code or "no reason given"}). Rerun to try again.')
    refresh = tokens.get('refresh_token', '')
    if not refresh:
        sys.exit('Spotify didn’t send a refresh token. Run this again.')

    # quick check that reading your playback works (Development Mode apps need Premium)
    req = urllib.request.Request('https://api.spotify.com/v1/me/player/recently-played?limit=1',
                                 headers={'Authorization': f'Bearer {tokens["access_token"]}'})
    try:
        urllib.request.urlopen(req, timeout=20).close()
    except urllib.error.HTTPError as e:
        sys.exit(f'Spotify connected but won’t share your playback (HTTP {e.code}).\n'
                 'Spotify only allows this for apps whose owner has Premium.')

    print('Spotify connected. Saving the secrets to your Cloudflare Worker...')
    for name, value in (('SPOTIFY_CLIENT_ID', client_id),
                        ('SPOTIFY_CLIENT_SECRET', client_secret),
                        ('SPOTIFY_REFRESH_TOKEN', refresh)):
        put_secret(name, value)
    print('Your Worker can read your Spotify now.\n')

    lanyard = getpass.getpass('Lanyard key, to remember your last game (hidden; Enter to skip): ').strip()
    if lanyard:
        put_secret('LANYARD_KEY', lanyard)
        print('Your Worker will remember your last game now.')
    print('\nAll set.')


def put_secret(name, value):
    run = subprocess.run(['npx', '--yes', 'wrangler', 'secret', 'put', name],
                         input=value, text=True, capture_output=True, cwd=HERE)
    if run.returncode != 0:
        tail = '\n'.join((run.stdout + run.stderr).strip().splitlines()[-6:])
        sys.exit(f'Couldn’t save {name}:\n{tail}\n'
                 'Did "npx wrangler login" and "npx wrangler deploy" both finish in this folder?')
    print(f'  saved {name}')


if __name__ == '__main__':
    main()
