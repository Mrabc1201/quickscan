import re, sys
mode, root = sys.argv[1], sys.argv[2]
mp, pp = root + "/lib/main.dart", root + "/pubspec.yaml"
m = open(mp, encoding="utf-8").read()
p = open(pp, encoding="utf-8").read()

def cut(s, old, new=""):
    if old not in s:
        raise SystemExit("NOT FOUND: " + old[:50])
    return s.replace(old, new)

if mode == "noads":
    m = cut(m, "import 'package:google_mobile_ads/google_mobile_ads.dart';\n")
    stub = (
        "class Ads {\n  static void loadInterstitial() {}\n  static void maybeShowAfterSave() {}\n}\n\n"
        "class BannerBox extends StatelessWidget {\n  const BannerBox({super.key});\n"
        "  @override\n  Widget build(BuildContext context) => const SizedBox.shrink();\n}\n\n"
    )
    a, b = m.index("// Abhi Google ki TEST IDs"), m.index("Future<void> main()")
    m = m[:a] + stub + m[b:]
    m = cut(m, "  try {\n    await MobileAds.instance.initialize();\n    Ads.loadInterstitial();\n  } catch (_) {}\n")
    p = cut(p, "  google_mobile_ads: ^9.2.0\n")
elif mode == "noml":
    m = cut(m, "import 'package:google_mlkit_document_scanner/google_mlkit_document_scanner.dart';\n")
    a, b = m.index("  Future<void> _scan() async {"), m.index("  Future<void> _delete(File f)")
    m = m[:a] + "  Future<void> _scan() async {}\n\n" + m[b:]
    p = cut(p, "  google_mlkit_document_scanner: ^0.5.0\n")
elif mode == "adsA":
    # ads plugin + manifest present natively, but NO ads code runs
    stub = (
        "class Ads {\n  static void loadInterstitial() {}\n  static void maybeShowAfterSave() {}\n}\n\n"
        "class BannerBox extends StatelessWidget {\n  const BannerBox({super.key});\n"
        "  @override\n  Widget build(BuildContext context) => const SizedBox.shrink();\n}\n\n"
    )
    a, b = m.index("// Abhi Google ki TEST IDs"), m.index("Future<void> main()")
    m = m[:a] + stub + m[b:]
    m = cut(m, "  try {\n    await MobileAds.instance.initialize();\n    Ads.loadInterstitial();\n  } catch (_) {}\n")
elif mode == "adsB":
    # only MobileAds.initialize() after 3s; no banner, no interstitial
    stub = (
        "class BannerBox extends StatelessWidget {\n  const BannerBox({super.key});\n"
        "  @override\n  Widget build(BuildContext context) => const SizedBox.shrink();\n}\n\n"
    )
    a, b = m.index("class BannerBox extends StatefulWidget"), m.index("Future<void> main()")
    m = m[:a] + stub + m[b:]
    m = cut(m, "  try {\n    await MobileAds.instance.initialize();\n    Ads.loadInterstitial();\n  } catch (_) {}\n",
            "  Future.delayed(const Duration(seconds: 3), () async {\n    try {\n      await MobileAds.instance.initialize();\n    } catch (_) {}\n  });\n")
else:
    raise SystemExit("bad mode")
open(mp, "w", encoding="utf-8").write(m)
open(pp, "w", encoding="utf-8").write(p)
print("variant", mode, "ok")
