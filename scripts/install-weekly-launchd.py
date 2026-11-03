"""Install user LaunchAgents; refuse to replace any existing job."""
from pathlib import Path
import os, plistlib, subprocess

root = Path(__file__).resolve().parent.parent
logs = root / 'data' / 'weekly' / 'logs'
logs.mkdir(parents=True, exist_ok=True)
agents = Path.home() / 'Library' / 'LaunchAgents'
agents.mkdir(parents=True, exist_ok=True)
environment = {'PATH': '/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin', 'TZ': 'Asia/Tokyo'}
engine = Path.home() / 'Applications/AivisSpeech.app/Contents/Resources/AivisSpeech-Engine/run'
if not engine.is_file():
    raise SystemExit(f'AivisSpeech Engine が見つかりません: {engine}')
jobs = {
 'local.nagara.engine': {
  'ProgramArguments': ['/bin/sh', '-c', 'while /usr/bin/curl -fsS --max-time 2 http://127.0.0.1:10101/speakers >/dev/null 2>&1; do /bin/sleep 10; done; exec "$1" --host 127.0.0.1 --port 10101', 'nagara-engine', str(engine)],
  'RunAtLoad': True, 'KeepAlive': True, 'ThrottleInterval': 30,
 },
 'local.nagara.site': {
  'ProgramArguments': ['/bin/sh', '-c', 'while /usr/bin/curl -fsS --max-time 2 http://127.0.0.1:4317/api/health >/dev/null 2>&1; do /bin/sleep 10; done; exec /opt/homebrew/bin/node "$1"', 'nagara-site', str(root / 'server.mjs')],
  'RunAtLoad': True, 'KeepAlive': True, 'ThrottleInterval': 30,
 },
 'local.nagara.weekly': {
  'ProgramArguments': ['/opt/homebrew/bin/node', str(root / 'scripts' / 'weekly-run.mjs')],
  'RunAtLoad': True, 'StartCalendarInterval': [{'Hour': hour, 'Minute': 0} for hour in range(6,24)] + [{'Hour': 7, 'Minute': 15}],
 },
}
for label in jobs:
    if (agents / (label + '.plist')).exists():
        raise SystemExit(f'既存の設定を上書きしません: {agents / (label + ".plist")}')
for label, settings in jobs.items():
    config = {'Label': label, 'WorkingDirectory': str(root), 'EnvironmentVariables': environment,
              'StandardOutPath': str(logs / (label + '.out.log')),
              'StandardErrorPath': str(logs / (label + '.err.log')), **settings}
    p = agents / (label + '.plist')
    with p.open('xb') as target:
        plistlib.dump(config, target)
    subprocess.run(['/bin/launchctl', 'bootstrap', f'gui/{os.getuid()}', str(p)], check=True)
    print('登録:', p, flush=True)
