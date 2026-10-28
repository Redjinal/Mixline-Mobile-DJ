#!/usr/bin/env bash
# Builds the signed Mixline test APK. Needs JDK 17+, ANDROID_HOME with platform 36 and build-tools 36.0.0.
set -euo pipefail
repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
if [ -f /workspace/.mixline-tools/activate.sh ]; then
    # shellcheck disable=SC1091
    source /workspace/.mixline-tools/activate.sh
fi
cd "$repo_dir"
version="$(sed -n "s/.*versionName '\(.*\)'.*/\1/p" app/build.gradle)"
test -f web/index.html || { printf '%s\n' 'Missing bundled app: web/index.html'; exit 1; }
# A dedicated, ignored testing key keeps subsequent APKs installable as updates.
# Supply the same keystore in CI through MIXLINE_KEYSTORE_BASE64 to keep that identity.
mkdir -p .signing
chmod 700 .signing
if [ -n "${MIXLINE_KEYSTORE_BASE64:-}" ] && [ ! -f .signing/mixline-test.keystore ]; then
    printf '%s' "$MIXLINE_KEYSTORE_BASE64" | base64 -d > .signing/mixline-test.keystore
fi
if [ ! -f .signing/mixline-test.keystore ]; then
    keytool -genkeypair -noprompt -keystore .signing/mixline-test.keystore \
        -storepass android -keypass android -alias mixline-test \
        -keyalg RSA -keysize 3072 -validity 10000 \
        -dname 'CN=Mixline Testing,O=Mixline'
    chmod 600 .signing/mixline-test.keystore
    printf '%s\n' 'Generated a NEW testing keystore: installing over a build signed with a different key requires uninstalling first.'
fi
./gradlew --no-daemon --console=plain :app:assembleDebug :app:lintDebug
mkdir -p artifacts
out="artifacts/Mixline-${version}.apk"
cp app/build/outputs/apk/debug/app-debug.apk "$out"
tools="${ANDROID_HOME:?}/build-tools/36.0.0"
"$tools/apksigner" verify --verbose "$out"
"$tools/zipalign" -c -P 16 4 "$out"
"$tools/apksigner" verify --print-certs "$out" > artifacts/signing-certificate.txt
sha256sum "$out" > "$out.sha256"
printf '%s\n' "APK: $repo_dir/$out"
