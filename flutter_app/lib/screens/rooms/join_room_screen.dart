// Join a private room by typing its 6-letter code (guests can do this too).
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../api/api_client.dart';
import '../../api/endpoints.dart';
import '../../theme.dart';
import '../../widgets/common.dart';
import '../../widgets/gradient_button.dart';
import 'room_lobby_screen.dart';

class JoinRoomScreen extends StatefulWidget {
  final String? code;
  const JoinRoomScreen({super.key, this.code});
  @override
  State<JoinRoomScreen> createState() => _JoinRoomScreenState();
}

class _JoinRoomScreenState extends State<JoinRoomScreen> {
  static const _length = 6;
  late final _code = TextEditingController(text: (widget.code ?? '').toUpperCase());
  String? _error;
  bool _loading = false;

  @override
  void dispose() {
    _code.dispose();
    super.dispose();
  }

  Future<void> _join() async {
    if (_code.text.length != _length) return setState(() => _error = 'Room codes have 6 characters');
    setState(() {
      _error = null;
      _loading = true;
    });
    try {
      final room = await RoomApi.join(_code.text);
      if (!mounted) return;
      Navigator.of(context).pushReplacement(MaterialPageRoute(
        builder: (_) => RoomLobbyScreen(matchId: room['match_id'] as int, roomCode: room['room_code'] as String),
      ));
    } catch (err) {
      setState(() {
        _error = errorText(err);
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: AppBackground(
        child: Column(children: [
          const AppHeader(title: 'Join Room', subtitle: 'Ask the host for the room code'),
          Padding(
            padding: const EdgeInsets.all(20),
            child: GlassCard(
              child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                const Text('ROOM CODE', style: AppText.label),
                const SizedBox(height: 12),
                TextField(
                  controller: _code,
                  autofocus: true,
                  textAlign: TextAlign.center,
                  maxLength: _length,
                  textCapitalization: TextCapitalization.characters,
                  inputFormatters: [
                    FilteringTextInputFormatter.allow(RegExp('[A-Za-z0-9]')),
                    TextInputFormatter.withFunction((oldValue, newValue) => newValue.copyWith(text: newValue.text.toUpperCase())),
                  ],
                  onChanged: (_) => setState(() {}),
                  onSubmitted: (_) => _join(),
                  style: const TextStyle(color: AppColors.gold, fontSize: 36, fontWeight: FontWeight.w900, letterSpacing: 12),
                  decoration: InputDecoration(
                    counterText: '',
                    hintText: '------',
                    hintStyle: const TextStyle(color: AppColors.textMuted, letterSpacing: 12),
                    filled: true,
                    fillColor: AppColors.input,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
                    focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: const BorderSide(color: AppColors.gold, width: 2)),
                  ),
                ),
                const SizedBox(height: 18),
                if (_error != null)
                  Padding(padding: const EdgeInsets.only(bottom: 12), child: Text(_error!, style: const TextStyle(color: AppColors.danger, fontWeight: FontWeight.w700))),
                GradientButton(
                  title: 'Join',
                  icon: Icons.login,
                  variant: ButtonVariant.gold,
                  loading: _loading,
                  onPressed: _code.text.length == _length ? _join : null,
                ),
              ]),
            ),
          ),
        ]),
      ),
    );
  }
}
