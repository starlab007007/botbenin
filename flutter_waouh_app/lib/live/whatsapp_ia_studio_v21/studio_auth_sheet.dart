import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class StudioAuthenticationSheet extends StatefulWidget {
  const StudioAuthenticationSheet({
    super.key,
  });

  @override
  State<StudioAuthenticationSheet> createState() =>
      _StudioAuthenticationSheetState();
}

class _StudioAuthenticationSheetState extends State<StudioAuthenticationSheet>
    with SingleTickerProviderStateMixin {
  static const _primary = Color(0xFF0B7F72);
  static const _background = Color(0xFFF4FAF8);
  static const _line = Color(0xFFDCEBE7);
  static const _ink = Color(0xFF17211F);
  static const _muted = Color(0xFF667874);

  late final TabController _tabs = TabController(length: 2, vsync: this);

  final _email = TextEditingController();
  final _password = TextEditingController();
  final _phone = TextEditingController(text: '+229');
  final _otp = TextEditingController();

  bool _register = false;
  bool _otpSent = false;
  bool _busy = false;
  bool _obscure = true;
  String? _error;

  SupabaseClient get _client => Supabase.instance.client;

  @override
  void dispose() {
    _tabs.dispose();
    _email.dispose();
    _password.dispose();
    _phone.dispose();
    _otp.dispose();
    super.dispose();
  }

  Future<void> _run(
    Future<void> Function() action,
  ) async {
    if (_busy) return;

    setState(() {
      _busy = true;
      _error = null;
    });

    try {
      await action();
    } on AuthException catch (error) {
      if (!mounted) return;
      setState(() => _error = error.message);
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = '$error'
            .replaceFirst('Exception: ', '')
            .replaceFirst('Bad state: ', '');
      });
    } finally {
      if (mounted) {
        setState(() => _busy = false);
      }
    }
  }

  Future<void> _submitEmail() async {
    final email = _email.text.trim();
    final password = _password.text;

    if (email.isEmpty || password.length < 6) {
      setState(() {
        _error = 'Saisissez une adresse e-mail et un mot de passe '
            'd’au moins 6 caractères.';
      });
      return;
    }

    await _run(() async {
      if (_register) {
        final response = await _client.auth.signUp(
          email: email,
          password: password,
        );

        if (response.session == null) {
          throw StateError(
            'Compte créé. Confirmez votre adresse e-mail, '
            'puis reconnectez-vous.',
          );
        }
      } else {
        await _client.auth.signInWithPassword(
          email: email,
          password: password,
        );
      }

      if (!mounted) return;
      Navigator.of(context).pop(true);
    });
  }

  String _normalizedPhone() {
    final value = _phone.text.replaceAll(
      RegExp(r'[^\d+]'),
      '',
    );

    if (value.startsWith('+')) {
      return value;
    }

    return '+$value';
  }

  Future<void> _sendOtp() async {
    final phone = _normalizedPhone();

    if (phone.length < 9) {
      setState(() {
        _error = 'Saisissez le numéro au format international.';
      });
      return;
    }

    await _run(() async {
      await _client.auth.signInWithOtp(
        phone: phone,
      );

      if (!mounted) return;
      setState(() => _otpSent = true);
    });
  }

  Future<void> _verifyOtp() async {
    final token = _otp.text.trim();

    if (token.length < 4) {
      setState(() {
        _error = 'Saisissez le code reçu par SMS.';
      });
      return;
    }

    await _run(() async {
      await _client.auth.verifyOTP(
        phone: _normalizedPhone(),
        token: token,
        type: OtpType.sms,
      );

      if (!mounted) return;
      Navigator.of(context).pop(true);
    });
  }

  @override
  Widget build(BuildContext context) {
    final bottom = MediaQuery.viewInsetsOf(context).bottom;

    return FractionallySizedBox(
      heightFactor: 0.94,
      child: Material(
        color: _background,
        borderRadius: const BorderRadius.vertical(
          top: Radius.circular(28),
        ),
        clipBehavior: Clip.antiAlias,
        child: Padding(
          padding: EdgeInsets.only(bottom: bottom),
          child: Column(
            children: [
              _header(),
              TabBar(
                controller: _tabs,
                indicatorColor: _primary,
                labelColor: _primary,
                unselectedLabelColor: _muted,
                tabs: const [
                  Tab(
                    icon: Icon(Icons.email_outlined),
                    text: 'E-mail',
                  ),
                  Tab(
                    icon: Icon(Icons.sms_outlined),
                    text: 'Téléphone',
                  ),
                ],
              ),
              if (_error != null)
                Container(
                  width: double.infinity,
                  margin: const EdgeInsets.fromLTRB(16, 10, 16, 0),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFFF0EE),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Text(
                    _error!,
                    style: const TextStyle(
                      color: Color(0xFF9C3E36),
                    ),
                  ),
                ),
              Expanded(
                child: TabBarView(
                  controller: _tabs,
                  children: [
                    _emailForm(),
                    _phoneForm(),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _header() {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.fromLTRB(16, 12, 8, 12),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: const Color(0xFFDFF5F0),
              borderRadius: BorderRadius.circular(14),
            ),
            child: const Icon(
              Icons.lock_person_outlined,
              color: _primary,
            ),
          ),
          const SizedBox(width: 11),
          const Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Authentification requise',
                  style: TextStyle(
                    color: _ink,
                    fontSize: 18,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                SizedBox(height: 2),
                Text(
                  'Connectez-vous pour gérer vos propres ressources.',
                  style: TextStyle(
                    color: _muted,
                    fontSize: 11.5,
                  ),
                ),
              ],
            ),
          ),
          IconButton(
            onPressed: () => Navigator.pop(context, false),
            icon: const Icon(Icons.close_rounded),
          ),
        ],
      ),
    );
  }

  Widget _emailForm() {
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 20, 16, 28),
      children: [
        TextField(
          controller: _email,
          keyboardType: TextInputType.emailAddress,
          textInputAction: TextInputAction.next,
          decoration: _decoration(
            label: 'Adresse e-mail',
            icon: Icons.email_outlined,
          ),
        ),
        const SizedBox(height: 11),
        TextField(
          controller: _password,
          obscureText: _obscure,
          onSubmitted: (_) => _submitEmail(),
          decoration: _decoration(
            label: 'Mot de passe',
            icon: Icons.password_rounded,
          ).copyWith(
            suffixIcon: IconButton(
              onPressed: () {
                setState(() => _obscure = !_obscure);
              },
              icon: Icon(
                _obscure
                    ? Icons.visibility_outlined
                    : Icons.visibility_off_outlined,
              ),
            ),
          ),
        ),
        const SizedBox(height: 16),
        FilledButton.icon(
          onPressed: _busy ? null : _submitEmail,
          style: FilledButton.styleFrom(
            minimumSize: const Size.fromHeight(53),
            backgroundColor: _primary,
          ),
          icon: _busy
              ? const SizedBox.square(
                  dimension: 18,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: Colors.white,
                  ),
                )
              : Icon(
                  _register
                      ? Icons.person_add_alt_1_rounded
                      : Icons.login_rounded,
                ),
          label: Text(
            _register ? 'Créer mon compte' : 'Se connecter',
          ),
        ),
        const SizedBox(height: 8),
        TextButton(
          onPressed: _busy
              ? null
              : () {
                  setState(() {
                    _register = !_register;
                    _error = null;
                  });
                },
          child: Text(
            _register ? 'J’ai déjà un compte' : 'Créer un nouveau compte',
          ),
        ),
      ],
    );
  }

  Widget _phoneForm() {
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 20, 16, 28),
      children: [
        TextField(
          controller: _phone,
          keyboardType: TextInputType.phone,
          enabled: !_otpSent,
          decoration: _decoration(
            label: 'Numéro international',
            icon: Icons.phone_outlined,
          ),
        ),
        if (_otpSent) ...[
          const SizedBox(height: 11),
          TextField(
            controller: _otp,
            keyboardType: TextInputType.number,
            autofocus: true,
            onSubmitted: (_) => _verifyOtp(),
            decoration: _decoration(
              label: 'Code reçu par SMS',
              icon: Icons.pin_outlined,
            ),
          ),
        ],
        const SizedBox(height: 16),
        FilledButton.icon(
          onPressed: _busy ? null : (_otpSent ? _verifyOtp : _sendOtp),
          style: FilledButton.styleFrom(
            minimumSize: const Size.fromHeight(53),
            backgroundColor: _primary,
          ),
          icon: _busy
              ? const SizedBox.square(
                  dimension: 18,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: Colors.white,
                  ),
                )
              : Icon(
                  _otpSent ? Icons.verified_user_outlined : Icons.sms_outlined,
                ),
          label: Text(
            _otpSent ? 'Valider le code' : 'Recevoir un code',
          ),
        ),
        if (_otpSent)
          TextButton(
            onPressed: _busy
                ? null
                : () {
                    setState(() {
                      _otpSent = false;
                      _otp.clear();
                    });
                  },
            child: const Text('Changer de numéro'),
          ),
        const SizedBox(height: 10),
        const Text(
          'Le mode téléphone nécessite que l’envoi de SMS soit '
          'activé dans le projet Supabase.',
          textAlign: TextAlign.center,
          style: TextStyle(
            color: _muted,
            fontSize: 11.5,
          ),
        ),
      ],
    );
  }

  InputDecoration _decoration({
    required String label,
    required IconData icon,
  }) {
    return InputDecoration(
      labelText: label,
      prefixIcon: Icon(icon),
      filled: true,
      fillColor: Colors.white,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: const BorderSide(color: _line),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: const BorderSide(color: _line),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: const BorderSide(
          color: _primary,
          width: 1.5,
        ),
      ),
    );
  }
}
