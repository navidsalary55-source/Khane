#!/usr/bin/env bash
# امضای APK. کلید را به این ترتیب پیدا می‌کند:
#   1) secret به اسم KEYSTORE_BASE64 (اگر ساخته شده باشد)
#   2) فایل .jks داخل مخزن (کنار package.json یا داخل پوشه‌ی keys)
#   3) اگر هیچ کلیدی نبود، همین‌جا یک کلید جدید با رمز تصادفی می‌سازد و داخل پوشه‌ی keys ذخیره می‌کند
#      (workflow آن را خودکار در مخزن خصوصی نگه می‌دارد تا دفعه‌ی بعد با همان کلید امضا شود).
# رمزها: از secretها (KEYSTORE_PASSWORD, KEY_ALIAS, KEY_PASSWORD) یا از فایل signing.properties.
set -euo pipefail

: "${ANDROID_HOME:?ANDROID_HOME تنظیم نشده}"
OUT_REAL="khaneyab-release.apk"

BT=$(ls -d "$ANDROID_HOME"/build-tools/* | sort -V | tail -1)
UNSIGNED=$(ls android/app/build/outputs/apk/release/*.apk | head -1)
echo "build-tools: $BT"
echo "unsigned apk: $UNSIGNED"

WORK=$(mktemp -d)
KS=""
SRC=""

if [ -n "${KEYSTORE_BASE64:-}" ]; then
  echo "$KEYSTORE_BASE64" | base64 -d > "$WORK/release.jks" || { echo "::error::secret KEYSTORE_BASE64 معتبر نیست (متن کلید ناقص کپی شده)"; exit 1; }
  KS="$WORK/release.jks"; SRC="secret KEYSTORE_BASE64"
else
  F=$(find . -maxdepth 2 \( -name '*.jks' -o -name '*.keystore' \) -not -path './node_modules/*' -not -path './android/*' 2>/dev/null | head -1 || true)
  if [ -n "$F" ]; then cp "$F" "$WORK/release.jks"; KS="$WORK/release.jks"; SRC="فایل $F"; fi
fi

prop() { # prop <file> <key>
  grep -E "^[[:space:]]*$2[[:space:]]*=" "$1" 2>/dev/null | head -1 | cut -d= -f2- | tr -d '\r' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//' || true
}

if [ -n "$KS" ]; then
  echo "کلید امضا: $SRC"
  P=$(find . -maxdepth 2 -name 'signing.properties' -not -path './node_modules/*' -not -path './android/*' 2>/dev/null | head -1 || true)
  STOREPASS="${KEYSTORE_PASSWORD:-}"
  [ -z "$STOREPASS" ] && [ -n "$P" ] && STOREPASS=$(prop "$P" storePassword)
  ALIAS="${KEY_ALIAS:-}"
  [ -z "$ALIAS" ] && [ -n "$P" ] && ALIAS=$(prop "$P" keyAlias)
  ALIAS="${ALIAS:-divarmelki}"
  KEYPASS="${KEY_PASSWORD:-}"
  [ -z "$KEYPASS" ] && [ -n "$P" ] && KEYPASS=$(prop "$P" keyPassword)
  KEYPASS="${KEYPASS:-$STOREPASS}"
  if [ -z "$STOREPASS" ]; then
    echo "::error::رمز کلید پیدا نشد. فایل signing.properties بساز (storePassword=...) یا secret به اسم KEYSTORE_PASSWORD."
    exit 1
  fi
  if ! keytool -list -keystore "$KS" -storepass "$STOREPASS" > "$WORK/list.txt" 2>&1; then
    echo "::error::رمز فایل کلید اشتباه است یا فایل کلید خراب است."; cat "$WORK/list.txt" | head -5; exit 1
  fi
  if ! keytool -list -keystore "$KS" -storepass "$STOREPASS" -alias "$ALIAS" > /dev/null 2>&1; then
    echo "::error::نام کلید (alias) '$ALIAS' داخل فایل کلید نیست. نام‌های موجود:"; grep -E "PrivateKeyEntry|trustedCertEntry" "$WORK/list.txt" | cut -d, -f1 || true; exit 1
  fi
  OUT="$OUT_REAL"
else
  echo "هیچ کلیدی پیدا نشد؛ یک کلید امضای جدید ساخته می‌شود و در پوشه‌ی keys ذخیره می‌شود."
  mkdir -p keys
  STOREPASS=$(openssl rand -hex 16); KEYPASS="$STOREPASS"; ALIAS="khaneyab"
  keytool -genkeypair -keystore keys/khaneyab.jks -storepass "$STOREPASS" -keypass "$KEYPASS" -alias "$ALIAS" \
    -keyalg RSA -keysize 2048 -validity 9999 -dname "CN=Khaneyab, O=Khaneyab, C=IR" > /dev/null 2>&1
  printf 'storePassword=%s\nkeyAlias=%s\nkeyPassword=%s\n' "$STOREPASS" "$ALIAS" "$KEYPASS" > keys/signing.properties
  KS="keys/khaneyab.jks"
  OUT="$OUT_REAL"
  if [ -n "${GITHUB_OUTPUT:-}" ]; then echo "new_key=true" >> "$GITHUB_OUTPUT"; fi
fi

export STOREPASS KEYPASS
"$BT/zipalign" -p -f 4 "$UNSIGNED" "$WORK/aligned.apk"
"$BT/apksigner" sign --ks "$KS" --ks-key-alias "$ALIAS" \
  --ks-pass env:STOREPASS --key-pass env:KEYPASS \
  --out "$OUT" "$WORK/aligned.apk"
"$BT/apksigner" verify --verbose "$OUT"
rm -rf "$WORK"
ls -l "$OUT"
echo "APK آماده شد: $OUT"
