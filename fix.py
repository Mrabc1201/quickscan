import glob
import re


def sub(path, pairs):
    s = open(path, encoding="utf-8").read()
    for old, new in pairs:
        if old not in s:
            raise SystemExit("PATTERN NOT FOUND in " + path + ": " + old)
        s = s.replace(old, new)
    open(path, "w", encoding="utf-8").write(s)


sub("app/pubspec.yaml", [
    ("google_mlkit_document_scanner: ^0.3.0", "google_mlkit_document_scanner: ^0.5.0"),
    ("google_mobile_ads: ^5.3.0", "google_mobile_ads: ^9.2.0"),
    ("share_plus: ^10.1.4", "share_plus: ^13.0.0"),
    ("  open_filex: ^4.5.0\n", ""),
])

sub("app/lib/main.dart", [
    ("import 'package:open_filex/open_filex.dart';\n", ""),
    ("documentFormat: DocumentFormat.jpeg,", "documentFormats: {DocumentFormat.jpeg},"),
    ("onTap: () => OpenFilex.open(f.path),",
     "onTap: () => SharePlus.instance.share(ShareParams(files: [XFile(f.path)])),"),
    ("Share.shareXFiles([XFile(f.path)]);",
     "SharePlus.instance.share(ShareParams(files: [XFile(f.path)]));"),
])

# Google Mobile Ads 9.x needs minSdk 24
for g in glob.glob("app/android/app/build.gradle*"):
    s = open(g, encoding="utf-8").read()
    s = re.sub(r"minSdk\s*=\s*23", "minSdk = 24", s)
    s = re.sub(r"minSdkVersion\s+23", "minSdkVersion 24", s)
    open(g, "w", encoding="utf-8").write(s)

print("fix.py done")

# --- crash-safe startup ---
sub("app/lib/main.dart", [
    ("  await MobileAds.instance.initialize();\n  Ads.loadInterstitial();\n  runApp(const QuickScanApp());\n",
     "  runApp(const QuickScanApp());\n  try {\n    await MobileAds.instance.initialize();\n    Ads.loadInterstitial();\n  } catch (_) {}\n"),
])
sub("app/android/app/src/main/AndroidManifest.xml", [
    ("</application>",
     '    <meta-data android:name="io.flutter.embedding.android.EnableImpeller" android:value="false"/>\n    </application>'),
])
print("fix.py extra done")

# --- disable R8 minify/shrink (it strips WorkManager's WorkDatabase -> startup crash) ---
for g in glob.glob("app/android/app/build.gradle*"):
    s = open(g, encoding="utf-8").read()
    if g.endswith(".kts"):
        ins = "release {\n            isMinifyEnabled = false\n            isShrinkResources = false"
    else:
        ins = "release {\n            minifyEnabled false\n            shrinkResources false"
    s, n = re.subn(r"release\s*\{", ins, s, count=1)
    if n != 1:
        raise SystemExit("release block not found in " + g)
    open(g, "w", encoding="utf-8").write(s)
print("fix.py minify off done")
