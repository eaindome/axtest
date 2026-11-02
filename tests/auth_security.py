"""Live cookie/CSRF, revocation, tenant and role checks. Creates isolated authcheck users.
Run against a local Development API: python tests/auth_security.py [base-url].
Test users are intentionally retained; no existing user or project is modified.
"""
import copy
import http.cookiejar
import json
import secrets
import sys
import urllib.error
import urllib.request

BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:5000'
checks = 0
class Client:
    def __init__(self):
        self.cookies = http.cookiejar.CookieJar()
        self.csrf = None
    def call(self, method, path, body=None, expected=200, csrf=True):
        global checks
        headers = {'Content-Type': 'application/json'}
        if csrf and self.csrf: headers['X-CSRF-TOKEN'] = self.csrf
        req = urllib.request.Request(BASE + path, data=None if body is None else json.dumps(body).encode(), headers=headers, method=method)
        opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(self.cookies))
        try:
            response = opener.open(req, timeout=30)
        except urllib.error.HTTPError as error:
            response = error
        raw = response.read()
        assert response.code == expected, f'{method} {path}: expected {expected}, got {response.code}'
        checks += 1
        try: data = json.loads(raw)
        except ValueError: data = raw.decode()
        if isinstance(data, dict) and 'csrfToken' in data: self.csrf = data['csrfToken']
        return data, response.headers
    def register(self, username, password):
        self.call('GET', '/api/auth/session')
        result, headers = self.call('POST', '/api/auth/register', {'name':'Security verification', 'username':username, 'password':password})
        assert result['user']['username'] == username and 'token' not in result
        assert any('axtest.session=' in v and 'httponly' in v.lower() and 'samesite=strict' in v.lower() for v in headers.get_all('Set-Cookie'))
        return result
    def login(self, username, password, expected=200):
        self.call('GET', '/api/auth/session')
        return self.call('POST', '/api/auth/login', {'username':username,'password':password}, expected)[0]

anon = Client()
anon.call('GET', '/api/workspaces', expected=401)
anon.call('GET', '/api/dev/session', expected=404)
anon.call('POST', '/api/auth/login', {'username':'nobody','password':'wrong'}, expected=400, csrf=False)
suffix = secrets.token_hex(4)
names = ['authcheck_' + suffix + '_' + role for role in ['owner','viewer','admin','locked']]
password = secrets.token_urlsafe(18)
owner, viewer, admin, locked = [Client() for _ in names]
for client, name in zip([owner, viewer, admin, locked], names): client.register(name,password)
workspace = owner.call('GET','/api/workspaces')[0][0]['id']
path = f'/api/workspaces/{workspace}'
viewer.call('GET',path,expected=404)
owner.call('POST', path+'/projects', {'name':'CSRF failure'}, expected=400, csrf=False)
csrf_saved = owner.csrf; owner.csrf = 'tampered'
owner.call('POST',path+'/projects',{'name':'CSRF failure'},expected=400)
owner.csrf = csrf_saved
project = owner.call('POST',path+'/projects',{'name':'Auth security verification','baseUrl':'http://localhost:5173'},expected=201)[0]
pid = project['id']
try:
    viewer.call('GET',f'/api/projects/{pid}/explorer',expected=404)
    owner.call('POST',path+'/members',{'username':names[1],'role':'Owner'},expected=400)
    owner.call('POST',path+'/members',{'username':names[1],'role':'Viewer'})
    viewer.call('GET',f'/api/projects/{pid}/explorer')
    viewer.call('POST',path+'/projects',{'name':'Forbidden'},expected=404)
    viewer.call('POST',f'/api/projects/{pid}/files',{'name':'Forbidden'},expected=404)
    viewer.call('POST',f'/api/projects/{pid}/runs/file',{'fileId':'00000000-0000-0000-0000-000000000001','content':'TEST "Denied"','environment':'production'},expected=404)
    owner.call('POST',path+'/members',{'username':names[2],'role':'Admin'})
    admin.call('POST',path+'/members',{'username':names[3],'role':'Admin'},expected=403)
    second = Client(); second.login(names[0].upper(),password)
    replay = Client()
    for cookie in second.cookies: replay.cookies.set_cookie(copy.copy(cookie))
    second.call('POST','/api/auth/logout',{})
    replay.call('GET','/api/workspaces',expected=401)
    second.login(names[0],password)
    new_password = secrets.token_urlsafe(18)
    owner.call('POST','/api/auth/change-password',{'currentPassword':'incorrect','newPassword':new_password},expected=400)
    owner.call('POST','/api/auth/change-password',{'currentPassword':password,'newPassword':new_password})
    second.call('GET','/api/workspaces',expected=401)
    second.login(names[0],password,expected=401)
    second.login(names[0],new_password)
    for _ in range(5): locked.login(names[3],'incorrect',expected=401)
    locked.login(names[3],password,expected=401)
    print(f'PASS {checks} live HTTP checks: cookies, CSRF, logout/password revocation, username normalization, tenant isolation, roles and lockout')
finally:
    owner.call('POST',path+f'/projects/{pid}/archive',expected=204)
    owner.call('DELETE',path+f'/projects/{pid}',expected=204)
