"""Install self-test specs into your workspace. Existing file edits are preserved."""
import getpass
import http.cookiejar
import json
from pathlib import Path
import urllib.request
import urllib.error

API = 'http://localhost:5000'
ROOT = Path(__file__).resolve().parent
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
csrf = None
def call(method, path, body=None):
    global csrf
    headers = {'Content-Type':'application/json'}
    if csrf: headers['X-CSRF-TOKEN'] = csrf
    req = urllib.request.Request(API + path, method=method, headers=headers, data=None if body is None else json.dumps(body).encode())
    with opener.open(req,timeout=60) as response:
        result = json.load(response) if response.status != 204 else None
        if isinstance(result,dict) and 'csrfToken' in result: csrf = result['csrfToken']
        return result

def main():
    username = input('Workspace username [eaindome]: ').strip() or 'eaindome'
    password = getpass.getpass('Workspace password: ')
    call('GET','/api/auth/session')
    call('POST','/api/auth/login',{'username':username,'password':password})
    password = None
    workspace = call('GET','/api/workspaces')[0]['id']
    projects = call('GET',f'/api/workspaces/{workspace}/projects')
    project = next((p for p in projects if p['name'] == 'axtest Self Test'), None)
    if project is None:
        project = call('POST',f'/api/workspaces/{workspace}/projects',{'name':'axtest Self Test','baseUrl':'http://localhost:5173','description':'Authentication, project/file creation, settings and evidence. See tests/self/README.md.'})
        call('PUT',f'/api/projects/{project["id"]}/environments/staging',{'baseUrl':'http://localhost:5173','useProductionFallback':False})
    path = f'/api/projects/{project["id"]}'
    existing = {f['path']:f for f in call('GET',path+'/explorer')['files']}
    for source in sorted(ROOT.rglob('*.axtest')):
        target = source.relative_to(ROOT).as_posix().replace('controls/','modules/',1)
        if target in existing:
            print('Kept existing file:',target)
            continue
        folder, filename = target.rsplit('/',1)
        file = call('POST',path+'/files',{'name':filename,'folder':folder})
        call('PUT',path+f'/files/{file["id"]}',{'content':source.read_text(encoding='utf-8')})
        print('Installed:',target)
    call('POST','/api/auth/logout',{})
    print(f'Ready: http://localhost:5173/projects/{project["id"]}/suites')

if __name__ == '__main__':
    try: main()
    except urllib.error.HTTPError as error:
        raise SystemExit(f'Setup failed with HTTP {error.code}; check API mode, credentials and workspace permissions.')
