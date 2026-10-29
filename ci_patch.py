import re, sys, os

root = sys.argv[1] if len(sys.argv) > 1 else "app"

# ---- AndroidManifest ----
mf = os.path.join(root, "android/app/src/main/AndroidManifest.xml")
s = open(mf, encoding="utf-8").read()
if "com.google.android.gms.ads.APPLICATION_ID" not in s:
    s = s.replace(
        "<application",
        '<uses-permission android:name="android.permission.INTERNET"/>\n'
        '    <uses-permission android:name="com.google.android.gms.permission.AD_ID"/>\n'
        "    <application",
        1,
    )
    s = s.replace(
        "</application>",
        '    <meta-data android:name="com.google.android.gms.ads.APPLICATION_ID" '
        'android:value="ca-app-pub-3940256099942544~3347511713"/>\n    </application>',
        1,
    )
s = re.sub(r'android:label="[^"]*"', 'android:label="Quick Scan"', s, count=1)
open(mf, "w", encoding="utf-8").write(s)

# ---- minSdk 23 (ML Kit / ads ke liye) ----
for name in ("build.gradle.kts", "build.gradle"):
    p = os.path.join(root, "android/app", name)
    if os.path.exists(p):
        g = open(p, encoding="utf-8").read()
        g = re.sub(r"minSdk\s*=\s*flutter\.minSdkVersion", "minSdk = 23", g)
        g = re.sub(r"minSdkVersion\s+flutter\.minSdkVersion", "minSdkVersion 23", g)
        open(p, "w", encoding="utf-8").write(g)
print("patched")
