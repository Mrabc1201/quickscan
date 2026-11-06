import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:url_launcher/url_launcher.dart';

class QrScannerScreen extends StatefulWidget {
  const QrScannerScreen({super.key});
  @override
  State<QrScannerScreen> createState() => _QrScannerScreenState();
}

class _QrScannerScreenState extends State<QrScannerScreen> {
  final MobileScannerController _controller = MobileScannerController();
  bool _showing = false;
  bool _torch = false;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _onDetect(BarcodeCapture capture) async {
    if (_showing) return;
    String? value;
    for (final b in capture.barcodes) {
      final v = b.rawValue;
      if (v != null && v.isNotEmpty) {
        value = v;
        break;
      }
    }
    if (value == null) return;
    _showing = true;
    final text = value;
    final uri = Uri.tryParse(text);
    final isLink = uri != null &&
        (uri.scheme == 'http' || uri.scheme == 'https') &&
        uri.host.isNotEmpty;
    await showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(isLink ? 'Link found' : 'Code scanned',
                  style: Theme.of(ctx).textTheme.titleMedium),
              const SizedBox(height: 8),
              SelectableText(text),
              const SizedBox(height: 16),
              Row(children: [
                if (isLink)
                  Expanded(
                    child: FilledButton.icon(
                      icon: const Icon(Icons.open_in_new),
                      label: const Text('Open link'),
                      onPressed: () async {
                        try {
                          await launchUrl(uri,
                              mode: LaunchMode.externalApplication);
                        } catch (_) {}
                      },
                    ),
                  ),
                if (isLink) const SizedBox(width: 12),
                Expanded(
                  child: OutlinedButton.icon(
                    icon: const Icon(Icons.copy),
                    label: const Text('Copy'),
                    onPressed: () async {
                      await Clipboard.setData(ClipboardData(text: text));
                      if (ctx.mounted) {
                        ScaffoldMessenger.of(ctx).showSnackBar(
                            const SnackBar(content: Text('Copied')));
                      }
                    },
                  ),
                ),
              ]),
            ],
          ),
        ),
      ),
    );
    _showing = false;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Scan QR / Barcode'),
        actions: [
          IconButton(
            icon: Icon(_torch ? Icons.flash_on : Icons.flash_off),
            onPressed: () async {
              try {
                await _controller.toggleTorch();
                setState(() => _torch = !_torch);
              } catch (_) {}
            },
          ),
        ],
      ),
      body: Stack(
        children: [
          MobileScanner(controller: _controller, onDetect: _onDetect),
          Center(
            child: Container(
              width: 260,
              height: 260,
              decoration: BoxDecoration(
                border: Border.all(color: Colors.white, width: 3),
                borderRadius: BorderRadius.circular(16),
              ),
            ),
          ),
          const Positioned(
            left: 0,
            right: 0,
            bottom: 32,
            child: Text(
              'Point the camera at a QR code or barcode',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.white, fontSize: 16),
            ),
          ),
        ],
      ),
    );
  }
}
