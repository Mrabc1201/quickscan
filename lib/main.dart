import 'dart:io';

import 'package:flutter/material.dart';
import 'package:google_mlkit_document_scanner/google_mlkit_document_scanner.dart';
import 'package:google_mobile_ads/google_mobile_ads.dart';
import 'package:open_filex/open_filex.dart';
import 'package:path_provider/path_provider.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:share_plus/share_plus.dart';

// Abhi Google ki TEST IDs hain. Play Store se pehle asli AdMob IDs lagayein.
class Ads {
  static const bannerId = 'ca-app-pub-3940256099942544/6300978111';
  static const interstitialId = 'ca-app-pub-3940256099942544/1033173712';

  static InterstitialAd? _inter;
  static int _saves = 0;
  static DateTime _lastShown = DateTime.fromMillisecondsSinceEpoch(0);

  static void loadInterstitial() {
    InterstitialAd.load(
      adUnitId: interstitialId,
      request: const AdRequest(),
      adLoadCallback: InterstitialAdLoadCallback(
        onAdLoaded: (ad) => _inter = ad,
        onAdFailedToLoad: (e) => _inter = null,
      ),
    );
  }

  static void maybeShowAfterSave() {
    _saves++;
    final ad = _inter;
    if (ad == null) return;
    if (_saves % 3 != 0) return;
    if (DateTime.now().difference(_lastShown).inMinutes < 2) return;
    ad.fullScreenContentCallback = FullScreenContentCallback(
      onAdDismissedFullScreenContent: (a) {
        a.dispose();
        _inter = null;
        loadInterstitial();
      },
      onAdFailedToShowFullScreenContent: (a, e) {
        a.dispose();
        _inter = null;
        loadInterstitial();
      },
    );
    ad.show();
    _lastShown = DateTime.now();
  }
}

class BannerBox extends StatefulWidget {
  const BannerBox({super.key});
  @override
  State<BannerBox> createState() => _BannerBoxState();
}

class _BannerBoxState extends State<BannerBox> {
  BannerAd? _ad;
  bool _loaded = false;

  @override
  void initState() {
    super.initState();
    _ad = BannerAd(
      adUnitId: Ads.bannerId,
      size: AdSize.banner,
      request: const AdRequest(),
      listener: BannerAdListener(
        onAdLoaded: (_) => setState(() => _loaded = true),
        onAdFailedToLoad: (ad, e) => ad.dispose(),
      ),
    )..load();
  }

  @override
  void dispose() {
    _ad?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (!_loaded || _ad == null) return const SizedBox(height: 0);
    return SizedBox(
      width: _ad!.size.width.toDouble(),
      height: _ad!.size.height.toDouble(),
      child: AdWidget(ad: _ad!),
    );
  }
}

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await MobileAds.instance.initialize();
  Ads.loadInterstitial();
  runApp(const QuickScanApp());
}

class QuickScanApp extends StatelessWidget {
  const QuickScanApp({super.key});
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Quick Scan',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorSchemeSeed: const Color(0xFF2F6FED),
      ),
      home: const HomeScreen(),
    );
  }
}

Future<Directory> scansDir() async {
  final base = await getApplicationDocumentsDirectory();
  final d = Directory('${base.path}/scans');
  if (!await d.exists()) await d.create(recursive: true);
  return d;
}

String prettySize(int b) {
  if (b > 1048576) return '${(b / 1048576).toStringAsFixed(1)} MB';
  return '${(b / 1024).toStringAsFixed(0)} KB';
}

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});
  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  List<FileSystemEntity> _files = [];
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _refresh();
  }

  Future<void> _refresh() async {
    final d = await scansDir();
    final list = d
        .listSync()
        .where((e) => e.path.toLowerCase().endsWith('.pdf'))
        .toList()
      ..sort((a, b) => b.statSync().modified.compareTo(a.statSync().modified));
    if (mounted) setState(() => _files = list);
  }

  Future<void> _scan() async {
    if (_busy) return;
    setState(() => _busy = true);
    final scanner = DocumentScanner(
      options: DocumentScannerOptions(
        documentFormat: DocumentFormat.jpeg,
        mode: ScannerMode.full,
        pageLimit: 20,
        isGalleryImport: true,
      ),
    );
    try {
      final result = await scanner.scanDocument();
      final images = (result.images ?? <String>[])
          .map((e) => e.replaceFirst('file://', ''))
          .toList();
      if (images.isNotEmpty && mounted) {
        final saved = await Navigator.push<bool>(
          context,
          MaterialPageRoute(builder: (_) => ResultScreen(images: images)),
        );
        if (saved == true) await _refresh();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Scan cancel ya fail hua: $e')),
        );
      }
    } finally {
      scanner.close();
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _delete(File f) async {
    await f.delete();
    await _refresh();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Quick Scan'),
        actions: [
          IconButton(
            icon: const Icon(Icons.settings),
            onPressed: () => Navigator.push(context,
                MaterialPageRoute(builder: (_) => const SettingsScreen())),
          ),
        ],
      ),
      body: _files.isEmpty
          ? const Center(
              child: Padding(
                padding: EdgeInsets.all(24),
                child: Text(
                  'No scans yet.\nTap "Scan" to scan your first document.\nFree, no watermark.',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 16),
                ),
              ),
            )
          : ListView.builder(
              itemCount: _files.length,
              itemBuilder: (_, i) {
                final f = File(_files[i].path);
                final name = f.path.split('/').last;
                final st = f.statSync();
                return ListTile(
                  leading: const Icon(Icons.picture_as_pdf, color: Colors.red),
                  title: Text(name, maxLines: 1, overflow: TextOverflow.ellipsis),
                  subtitle: Text(
                      '${prettySize(st.size)}  -  ${st.modified.toString().substring(0, 16)}'),
                  onTap: () => OpenFilex.open(f.path),
                  trailing: PopupMenuButton<String>(
                    onSelected: (v) {
                      if (v == 'share') {
                        Share.shareXFiles([XFile(f.path)]);
                      } else if (v == 'delete') {
                        _delete(f);
                      }
                    },
                    itemBuilder: (_) => const [
                      PopupMenuItem(value: 'share', child: Text('Share')),
                      PopupMenuItem(value: 'delete', child: Text('Delete')),
                    ],
                  ),
                );
              },
            ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _scan,
        icon: _busy
            ? const SizedBox(
                width: 18,
                height: 18,
                child: CircularProgressIndicator(strokeWidth: 2))
            : const Icon(Icons.document_scanner),
        label: const Text('Scan'),
      ),
      bottomNavigationBar: const SafeArea(
        child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [BannerBox()]),
      ),
    );
  }
}

class ResultScreen extends StatefulWidget {
  final List<String> images;
  const ResultScreen({super.key, required this.images});
  @override
  State<ResultScreen> createState() => _ResultScreenState();
}

class _ResultScreenState extends State<ResultScreen> {
  late final TextEditingController _name;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    final n = DateTime.now();
    String two(int x) => x.toString().padLeft(2, '0');
    _name = TextEditingController(
        text: 'Scan_${n.year}${two(n.month)}${two(n.day)}_${two(n.hour)}${two(n.minute)}');
  }

  @override
  void dispose() {
    _name.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    setState(() => _saving = true);
    try {
      final doc = pw.Document();
      for (final p in widget.images) {
        final bytes = await File(p).readAsBytes();
        final img = pw.MemoryImage(bytes);
        doc.addPage(pw.Page(
          pageFormat: PdfPageFormat.a4,
          margin: pw.EdgeInsets.zero,
          build: (_) => pw.Center(child: pw.Image(img, fit: pw.BoxFit.contain)),
        ));
      }
      final d = await scansDir();
      var base = _name.text.trim().isEmpty ? 'Scan' : _name.text.trim();
      base = base.replaceAll(RegExp(r'[\\/:*?"<>|]'), '_');
      final out = File('${d.path}/$base.pdf');
      await out.writeAsBytes(await doc.save());
      Ads.maybeShowAfterSave();
      if (mounted) Navigator.pop(context, true);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('Save fail hua: $e')));
        setState(() => _saving = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('${widget.images.length} page(s)')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(12),
            child: TextField(
              controller: _name,
              decoration: const InputDecoration(
                  labelText: 'File name', border: OutlineInputBorder()),
            ),
          ),
          Expanded(
            child: ListView.builder(
              itemCount: widget.images.length,
              itemBuilder: (_, i) => Padding(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                child: Image.file(File(widget.images[i])),
              ),
            ),
          ),
        ],
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: FilledButton.icon(
            onPressed: _saving ? null : _save,
            icon: const Icon(Icons.save),
            label: Text(_saving ? 'Saving...' : 'Save as PDF'),
          ),
        ),
      ),
    );
  }
}

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Settings')),
      body: ListView(
        children: const [
          ListTile(
            leading: Icon(Icons.lock_outline),
            title: Text('Privacy'),
            subtitle: Text(
                'Your scans stay on your phone. We never upload your documents.'),
          ),
          ListTile(
            leading: Icon(Icons.ads_click),
            title: Text('About ads'),
            subtitle: Text(
                'This app is free. A small banner is shown, and an occasional ad appears after saving a scan.'),
          ),
          ListTile(
            leading: Icon(Icons.info_outline),
            title: Text('Quick Scan 1.0'),
            subtitle: Text('Free document scanner. No watermark. No signup.'),
          ),
        ],
      ),
    );
  }
}
