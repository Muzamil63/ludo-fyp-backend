// Create an account: username, display name, email, password.
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../api/api_client.dart';
import '../../state/auth_state.dart';
import '../../theme.dart';
import '../../widgets/common.dart';
import '../../widgets/form_widgets.dart';
import '../../widgets/gradient_button.dart';
import 'login_screen.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});
  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _username = TextEditingController();
  final _displayName = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _confirm = TextEditingController();
  String? _error;
  bool _loading = false;

  @override
  void dispose() {
    for (final c in [_username, _displayName, _email, _password, _confirm]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _submit() async {
    // Same rules as the backend, checked here first for a quicker answer
    String? problem;
    if (!RegExp(r'^[A-Za-z0-9_]{3,30}$').hasMatch(_username.text)) problem = 'Username: 3-30 letters, numbers or _';
    if (problem == null && !_email.text.contains('@')) problem = 'Enter a valid email';
    if (problem == null && _password.text.length < 6) problem = 'Password must be at least 6 characters';
    if (problem == null && _password.text != _confirm.text) problem = 'Passwords do not match';
    if (problem != null) return setState(() => _error = problem);

    setState(() {
      _error = null;
      _loading = true;
    });
    try {
      await context.read<AuthState>().register(
            username: _username.text,
            email: _email.text.trim(),
            password: _password.text,
            displayName: _displayName.text.trim(),
          );
      if (mounted) Navigator.of(context).popUntil((r) => r.isFirst);
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
          const AppHeader(title: 'Create account', subtitle: 'Unlock friends, rooms & tournaments'),
          Expanded(
            child: ListView(padding: const EdgeInsets.fromLTRB(20, 20, 20, 40), children: [
              GlassCard(
                child: Column(children: [
                  AppTextField(label: 'Username', hint: 'ludo_king', icon: Icons.alternate_email, controller: _username),
                  AppTextField(label: 'Display name', hint: 'Shown to other players', icon: Icons.emoji_emotions, controller: _displayName, maxLength: 50),
                  AppTextField(label: 'Email', hint: 'you@example.com', icon: Icons.mail, controller: _email, keyboardType: TextInputType.emailAddress),
                  AppTextField(label: 'Password', hint: 'At least 6 characters', icon: Icons.lock, controller: _password, obscure: true),
                  AppTextField(label: 'Confirm password', hint: 'Type it again', icon: Icons.lock, controller: _confirm, obscure: true),
                  if (_error != null)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: Text(_error!, style: const TextStyle(color: AppColors.danger, fontWeight: FontWeight.w700)),
                    ),
                  GradientButton(title: 'Create Account', icon: Icons.person_add, variant: ButtonVariant.gold, loading: _loading, onPressed: _submit),
                ]),
              ),
              const SizedBox(height: 22),
              Center(
                child: GestureDetector(
                  onTap: () => Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (_) => const LoginScreen())),
                  child: const Text.rich(TextSpan(text: 'Already have an account? ', style: TextStyle(color: AppColors.textDim, fontSize: 15), children: [
                    TextSpan(text: 'Log in', style: TextStyle(color: AppColors.gold, fontWeight: FontWeight.w900)),
                  ])),
                ),
              ),
            ]),
          ),
        ]),
      ),
    );
  }
}
