#!/usr/bin/env bash
set -euo pipefail
OUT_DIR="${OUT_DIR:-emulator-out}"
mkdir -p "$OUT_DIR"
# A fresh hosted runner may still be processing the udev event.
echo 'KERNEL=="kvm", GROUP="kvm", MODE="0666", OPTIONS+="static_node=kvm"' | sudo tee /etc/udev/rules.d/99-kvm4all.rules
sudo udevadm control --reload-rules
sudo udevadm trigger --name-match=kvm
sudo udevadm settle --timeout=30
for i in $(seq 1 10); do
  if [ -c /dev/kvm ]; then
    sudo chmod a+rw /dev/kvm
    break
  fi
  sleep 2
done
{
  uname -a
  id
  ls -l /dev/kvm || true
  grep -m1 -oE 'vmx|svm' /proc/cpuinfo || true
} > "$OUT_DIR/kvm-host.txt"
cat "$OUT_DIR/kvm-host.txt"
if [ ! -c /dev/kvm ] || [ ! -r /dev/kvm ] || [ ! -w /dev/kvm ]; then
  echo "::error::Hosted runner has no accessible KVM device"
  exit 1
fi
# libpulse.so.0 was missing in a prior production recipe.
sudo apt-get update -qq
sudo apt-get install -y --no-install-recommends libpulse0
ldconfig -p | grep 'libpulse.so.0' > "$OUT_DIR/native-libraries.txt"
cat "$OUT_DIR/native-libraries.txt"

