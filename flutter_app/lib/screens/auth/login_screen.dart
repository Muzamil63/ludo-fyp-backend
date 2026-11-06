// Log in with username (or email) and password.
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../api/api_client.dart';
import '../../state/auth_state.dart';
import '../../theme.dart';
import '../../widgets/common.dart';
import '../../widgets/form_widgets.dart';
import '../../widgets/gradient_button.dart';
import 'register_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});
  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _name = TextEditingController();
  final _password = TextEditingController();
  String? _error;
  bool _loading = false;

  @override
  void dispose() {
    _name.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_name.text.trim().isEmpty || _password.text.isEmpty) return setState(() => _error = 'Enter your username and password');
    setState(() {
      _error = null;
      _loading = true;
    });
    try {
      await context.read<AuthState>().login(_name.text.trim(), _password.text);
      // logged in: the root screen switches to the main tabs, so close this screen
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
          const AppHeader(title: 'Welcome back', subtitle: 'Log in to your account'),
          Expanded(
            child: ListView(padding: const EdgeInsets.all(20), children: [
              GlassCard(
                child: Column(children: [
                  AppTextField(label: 'Username or email', hint: 'demo1', icon: Icons.alternate_email, controller: _name),
                  AppTextField(label: 'Password', hint: '••••••••', icon: Icons.lock, controller: _password, obscure: true, onSubmitted: (_) => _submit()),
                  if (_error != null)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: Text(_error!, style: const TextStyle(color: AppColors.danger, fontWeight: FontWeight.w700)),
                    ),
                  GradientButton(title: 'Log In', icon: Icons.login, loading: _loading, onPressed: _submit),
                ]),
              ),
              const SizedBox(height: 22),
              Center(
                child: GestureDetector(
                  onTap: () => Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (_) => const RegisterScreen())),
                  child: const Text.rich(TextSpan(text: 'New here? ', style: TextStyle(color: AppColors.textDim, fontSize: 15), children: [
                    TextSpan(text: 'Create an account', style: TextStyle(color: AppColors.gold, fontWeight: FontWeight.w900)),
                  ])),
                ),
              ),
              const SizedBox(height: 14),
              const Center(child: Text('Demo accounts: demo1 … demo4, password: password123', style: AppText.small)),
            ]),
          ),
        ]),
      ),
    );
  }
}
