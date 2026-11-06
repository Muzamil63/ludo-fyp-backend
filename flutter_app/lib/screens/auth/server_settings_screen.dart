// Change the backend address (emulator / USB phone / Wi-Fi phone) and test the connection.
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:provider/provider.dart';
import '../../config.dart';
import '../../state/auth_state.dart';
import '../../state/notifications.dart';
import '../../theme.dart';
import '../../widgets/common.dart';
import '../../widgets/form_widgets.dart';
import '../../widgets/gradient_button.dart';

class ServerSettingsScreen extends StatefulWidget {
  const ServerSettingsScreen({super.key});
  @override
  State<ServerSettingsScreen> createState() => _ServerSettingsScreenState();
}

class _ServerSettingsScreenState extends State<ServerSettingsScreen> {
  late final _url = TextEditingController(text: context.read<AuthState>().serverUrl);
  String? _status;
  bool _ok = false;
  bool _testing = false;

  @override
  void dispose() {
    _url.dispose();
    super.dispose();
  }

  // Calls /api/health on the typed address (without saving it yet).
  Future<void> _test() async {
    setState(() {
      _testing = true;
      _status = null;
    });
    try {
      final base = _url.text.trim().replaceAll(RegExp(r'/+$'), '');
      final res = await http.get(Uri.parse('$base/api/health')).timeout(const Duration(seconds: 6));
      final json = jsonDecode(res.body) as Map<String, dynamic>;
      _ok = json['success'] == true;
      _status = _ok ? 'Connected! Server and database are OK.' : '${json['message'] ?? 'Server answered with an error'}';
    } catch (_) {
      _ok = false;
      _status = 'No answer. Is the backend running and the address correct?';
    }
    setState(() => _testing = false);
  }

  Future<void> _save() async {
    final auth = context.read<AuthState>();
    await auth.changeServerUrl(_url.text);
    showToast('Server address saved', kind: ToastKind.success);
    if (auth.player != null) await auth.logout(); // a session belongs to one server
    if (mounted) Navigator.of(context).popUntil((r) => r.isFirst);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: AppBackground(
        child: Column(children: [
          const AppHeader(title: 'Server', subtitle: 'Where the Ludo backend is running'),
          Expanded(
            child: ListView(padding: const EdgeInsets.all(20), children: [
              GlassCard(
                child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                  OptionPicker<String>(
                    label: 'Quick pick',
                    value: _url.text,
                    options: const [Option('Emulator', defaultServerUrl, hint: '10.0.2.2'), Option('USB phone', 'http://localhost:3000', hint: 'adb reverse')],
                    onChanged: (v) => setState(() => _url.text = v),
                  ),
                  AppTextField(label: 'Server address', icon: Icons.public, controller: _url, keyboardType: TextInputType.url, onChanged: (_) => setState(() {})),
                  if (_status != null)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: Text(_status!, style: TextStyle(color: _ok ? AppColors.success : AppColors.danger, fontWeight: FontWeight.w700)),
                    ),
                  Row(children: [
                    Expanded(child: GradientButton(title: 'Test', icon: Icons.wifi, variant: ButtonVariant.ghost, size: ButtonSize.md, loading: _testing, onPressed: _test)),
                    const SizedBox(width: 10),
                    Expanded(child: GradientButton(title: 'Save', icon: Icons.save, variant: ButtonVariant.gold, size: ButtonSize.md, onPressed: _save)),
                  ]),
                ]),
              ),
              const SizedBox(height: 16),
              const GlassCard(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text('Which address?', style: AppText.heading),
                  SizedBox(height: 8),
                  Text('• Android emulator: http://10.0.2.2:3000', style: AppText.dim),
                  Text('• Phone on the same Wi-Fi: http://YOUR-PC-IP:3000 (run ipconfig on the PC)', style: AppText.dim),
                  Text('• Phone on USB: run "adb reverse tcp:3000 tcp:3000", then use http://localhost:3000', style: AppText.dim),
                  Text('• Change 3000 if the backend uses another PORT.', style: AppText.dim),
                ]),
              ),
            ]),
          ),
        ]),
      ),
    );
  }
}
