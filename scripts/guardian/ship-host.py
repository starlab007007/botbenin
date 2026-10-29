"""Transfer private probe configuration as its owner, then install the fixed agent."""
import os
from pathlib import Path
import subprocess
import sys
import tempfile

REMOTE='/home/debian/waouh-guardian-install'
def main():
    host,user,port=(os.environ[k] for k in ('GUARDIAN_HOST','GUARDIAN_USER','GUARDIAN_PORT'))
    if not host or not user or not port.isdigit() or any(c in host+user for c in '\r\n\x00') or host.startswith('-') or user.startswith('-'):
        raise ValueError('invalid host configuration')
    with tempfile.TemporaryDirectory(prefix='guardian-ssh-') as tmp:
        root=Path(tmp);key=root/'key';key.write_text(os.environ['GUARDIAN_SSH_KEY']+'\n');key.chmod(0o600)
        options=['-i',str(key),'-o','IdentitiesOnly=yes','-o','BatchMode=yes','-o','ConnectTimeout=10','-o','StrictHostKeyChecking=accept-new','-o','UserKnownHostsFile='+str(root/'known_hosts')]
        destination=user+'@'+host
        def run(argv): subprocess.run(argv,check=True,capture_output=True,timeout=90)
        ssh=['ssh',*options,'-p',port,destination]
        scp=['scp',*options,'-P',port]
        try:
            run([*ssh,'umask 077; mkdir -p '+REMOTE+'/scripts/guardian; chmod 700 '+REMOTE])
            run([*scp,'scripts/guardian/agent.py','scripts/guardian/install-host.sh',destination+':'+REMOTE+'/scripts/guardian/'])
            run([*scp,'guardian-config.json',destination+':'+REMOTE+'/guardian-config.json'])
            run([*ssh,'sh '+REMOTE+'/scripts/guardian/install-host.sh '+REMOTE])
        finally:
            try: run([*ssh,'rm -f '+REMOTE+'/guardian-config.json'])
            except Exception: pass
    print('GUARDIAN: private host observer installed')
if __name__=='__main__':
    try: main()
    except Exception as error:
        print('GUARDIAN host installation: '+type(error).__name__,file=sys.stderr)
        sys.exit(1)
