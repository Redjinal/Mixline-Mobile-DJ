#!/usr/bin/env bash
set -euo pipefail
repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
if [ -f /workspace/.mixline-tools/activate.sh ]; then
    source /workspace/.mixline-tools/activate.sh
fi
cd "$repo_dir"
test -f web/index.html || { printf '%s\n' 'Missing bundled app: web/index.html'; exit 1; }
# A dedicated, ignored testing key keeps subsequent APKs installable as updates.
# This is a testing identity, not a production signing key.
mkdir -p .signing
chmod 700 .signing
if [ ! -f .signing/mixline-test.keystore ]; then
    keytool -genkeypair -noprompt -keystore .signing/mixline-test.keystore \
        -storepass android -keypass android -alias mixline-test \
        -keyalg RSA -keysize 3072 -validity 10000 \
        -dname 'CN=Mixline Testing,O=Mixline'
    chmod 600 .signing/mixline-test.keystore
fi
./gradlew --no-daemon --console=plain :app:assembleDebug :app:lintDebug
mkdir -p artifacts
cp app/build/outputs/apk/debug/app-debug.apk artifacts/Mixline-4.0.0-test2.apk
"${ANDROID_HOME:?}/build-tools/36.0.0/apksigner" verify --verbose artifacts/Mixline-4.0.0-test2.apk
"$ANDROID_HOME/build-tools/36.0.0/zipalign" -c -P 16 4 artifacts/Mixline-4.0.0-test2.apk
"$ANDROID_HOME/build-tools/36.0.0/apksigner" verify --print-certs artifacts/Mixline-4.0.0-test2.apk > artifacts/signing-certificate.txt
sha256sum artifacts/Mixline-4.0.0-test2.apk > artifacts/Mixline-4.0.0-test2.apk.sha256
printf '%s\n' "APK: $repo_dir/artifacts/Mixline-4.0.0-test2.apk"
