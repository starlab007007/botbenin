"""Copy the private token as its owner; Docker-based SCP cannot read mode 0600."""
import os
from pathlib import Path
import subprocess
import tempfile


def main():
    host,user,port,sha=(os.environ[key] for key in ('RUNTIME_HOST','RUNTIME_USER','RUNTIME_PORT','RUNTIME_SHA'))
    if not host or not user or not port.isdigit() or any(c in host+user for c in '\r\n\x00') or host.startswith('-') or user.startswith('-'):
        raise ValueError('invalid runtime destination')
    if len(sha)!=40 or any(c not in '0123456789abcdef' for c in sha):raise ValueError('invalid release commit')
    prefix=os.environ.get('RUNTIME_TRANSFER_PREFIX','botbj-ci')
    if prefix not in ('botbj-ci','waouh-engines-ci'):raise ValueError('invalid runtime transfer prefix')
    remote='/tmp/'+prefix+'-'+sha
    with tempfile.TemporaryDirectory(prefix='waouh-runtime-ssh-') as tmp:
        root=Path(tmp);key=root/'key';key.write_text(os.environ['RUNTIME_SSH_KEY']+'\n');key.chmod(0o600)
        known=root/'known_hosts'; pinned=os.environ.get('RUNTIME_KNOWN_HOSTS','')
        known.write_text(pinned+'\n' if pinned else '')
        options=['-i',str(key),'-o','IdentitiesOnly=yes','-o','BatchMode=yes','-o','ConnectTimeout=10',
                 '-o','StrictHostKeyChecking='+('yes' if pinned else 'accept-new'),'-o','UserKnownHostsFile='+str(root/'known_hosts')]
        destination=user+'@'+host
        subprocess.run(['ssh',*options,'-p',port,destination,'umask 077; mkdir -p '+remote],check=True,capture_output=True,timeout=30)
        subprocess.run(['scp',*options,'-P',port,'collection-runtime-token',destination+':'+remote+'/collection-runtime-token'],check=True,capture_output=True,timeout=60)
    print('Dedicated runtime credential transferred privately')


if __name__=='__main__':main()
