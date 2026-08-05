// Modern auth flow for WaouhApp: onboarding, email (login/register/reset),
// WhatsApp OTP with the real magic-link handshake, and the "complete your
// profile" step for brand-new WhatsApp accounts. Replaces the legacy
// OnboardingScreen / EmailAuthScreen / WhatsAppOtpScreen from main.dart with
// on-brand visuals while keeping the exact same AuthController contract.
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../main.dart' as legacy;
import 'live_theme.dart';
import 'live_visuals.dart';

String? _nextRoute(BuildContext context) {
  try {
    return GoRouterState.of(context).uri.queryParameters['next'];
  } catch (_) {
    return null;
  }
}

/// Welcome screen: the brand's signature gradient, the three value props
/// (Vendre / Acheter / Negocier), and the two entry points (WhatsApp, Email).
class LiveOnboardingScreen extends StatelessWidget {
  const LiveOnboardingScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final next = _nextRoute(context);
    String authPath(String path) =>
        next == null ? path : '$path?next=${Uri.encodeComponent(next)}';

    final items = [
      (
        Icons.shopping_bag_rounded,
        'Vendre',
        'Publiez un article en 30s',
        WaouhPalette.neon
      ),
      (
        Icons.search_rounded,
        'Acheter',
        'Trouvez pres de vous',
        WaouhPalette.blue
      ),
      (
        Icons.handshake_rounded,
        'Negocier',
        'Proposez votre prix',
        WaouhPalette.orange
      ),
    ];

    return Scaffold(
      body: DecoratedBox(
        decoration: const BoxDecoration(gradient: WaouhGradients.brand),
        child: SafeArea(
          child: LayoutBuilder(
            builder: (context, constraints) => SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(
                WaouhSpace.xl,
                WaouhSpace.lg,
                WaouhSpace.xl,
                WaouhSpace.lg,
              ),
              child: ConstrainedBox(
                constraints:
                    BoxConstraints(minHeight: constraints.maxHeight - 32),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      children: [
                        const SizedBox(height: 12),
                        Container(
                          width: 88,
                          height: 88,
                          decoration: BoxDecoration(
                            color: WaouhPalette.onDarkSurface,
                            borderRadius: BorderRadius.circular(28),
                            border:
                                Border.all(color: WaouhPalette.onDarkBorder),
                            boxShadow: WaouhShadows.brandGlow,
                          ),
                          child: const Icon(Icons.chat_bubble_rounded,
                              color: Colors.white, size: 42),
                        ),
                        const SizedBox(height: WaouhSpace.lg),
                        Text('WaouhApp',
                            style: WaouhText.onDark(WaouhText.display)),
                        const SizedBox(height: WaouhSpace.md),
                        Text(
                          'Envoyez un message.',
                          textAlign: TextAlign.center,
                          style: WaouhText.onDark(
                              WaouhText.h1.copyWith(fontSize: 26)),
                        ),
                        Text(
                          'Le monde achete.',
                          textAlign: TextAlign.center,
                          style: WaouhText.h1.copyWith(
                            fontSize: 26,
                            fontStyle: FontStyle.italic,
                            color: WaouhPalette.neon,
                          ),
                        ),
                        const SizedBox(height: WaouhSpace.xl),
                        ...items.map((item) => Padding(
                              padding:
                                  const EdgeInsets.only(bottom: WaouhSpace.sm),
                              child: Container(
                                padding: const EdgeInsets.all(WaouhSpace.md),
                                decoration: BoxDecoration(
                                  color: WaouhPalette.onDarkSurface,
                                  borderRadius: BorderRadius.circular(20),
                                  border: Border.all(
                                      color: WaouhPalette.onDarkBorder),
                                ),
                                child: Row(
                                  children: [
                                    Container(
                                      width: 46,
                                      height: 46,
                                      decoration: BoxDecoration(
                                          color: item.$4,
                                          shape: BoxShape.circle),
                                      child: Icon(
                                        item.$1,
                                        color: item.$4 == WaouhPalette.neon
                                            ? WaouhPalette.ink
                                            : Colors.white,
                                        size: 22,
                                      ),
                                    ),
                                    const SizedBox(width: WaouhSpace.md),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          Text(item.$2,
                                              style: WaouhText.onDark(WaouhText
                                                  .h3
                                                  .copyWith(fontSize: 17))),
                                          Text(item.$3,
                                              style: WaouhText.onDarkMuted(
                                                  WaouhText.caption)),
                                        ],
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            )),
                      ],
                    ),
                    Padding(
                      padding: const EdgeInsets.only(top: WaouhSpace.lg),
                      child: Column(
                        children: [
                          SizedBox(
                            width: double.infinity,
                            height: 54,
                            child: FilledButton(
                              style: FilledButton.styleFrom(
                                backgroundColor: const Color(0xFF25D366),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(
                                      WaouhRadius.control),
                                ),
                              ),
                              onPressed: () =>
                                  context.go(authPath('/app/auth/whatsapp')),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: const [
                                  Icon(Icons.chat_bubble_rounded, size: 19),
                                  SizedBox(width: 10),
                                  Text('Continuer avec WhatsApp'),
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(height: WaouhSpace.sm),
                          SizedBox(
                            width: double.infinity,
                            height: 54,
                            child: FilledButton(
                              style: FilledButton.styleFrom(
                                backgroundColor: Colors.white,
                                foregroundColor: WaouhPalette.green,
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(
                                      WaouhRadius.control),
                                ),
                              ),
                              onPressed: () =>
                                  context.go(authPath('/app/auth/email')),
                              child: const Text('Continuer avec Email'),
                            ),
                          ),
                          const SizedBox(height: WaouhSpace.md),
                          Text(
                            'En continuant, vous acceptez nos conditions d\'utilisation.',
                            textAlign: TextAlign.center,
                            style: WaouhText.onDarkMuted(WaouhText.caption),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Shared header used by every auth sub-screen: brand gradient, back button,
/// title + subtitle. Keeps the visual language identical to [LiveHeader]
/// without depending on it (auth screens render before LiveWaouhController
/// exists).
class _AuthHeader extends StatelessWidget implements PreferredSizeWidget {
  const _AuthHeader({required this.title, this.subtitle});
  final String title;
  final String? subtitle;

  @override
  Size get preferredSize => const Size.fromHeight(92);

  @override
  Widget build(BuildContext context) {
    return AppBar(
      toolbarHeight: 92,
      leading: IconButton(
        icon: const Icon(Icons.arrow_back_rounded),
        onPressed: () =>
            context.canPop() ? context.pop() : context.go('/app/auth'),
      ),
      title: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(title,
              style: WaouhText.onDark(WaouhText.h1.copyWith(fontSize: 21))),
          if (subtitle != null)
            Text(subtitle!, style: WaouhText.onDarkMuted(WaouhText.caption)),
        ],
      ),
      flexibleSpace: const DecoratedBox(
          decoration: BoxDecoration(gradient: WaouhGradients.brand)),
    );
  }
}

/// Email/password screen: login, register, reset — three states behind one
/// segmented control, Google sign-in surfaced with the real multicolour mark.
class LiveEmailAuthScreen extends StatefulWidget {
  const LiveEmailAuthScreen({super.key});
  @override
  State<LiveEmailAuthScreen> createState() => _LiveEmailAuthScreenState();
}

class _LiveEmailAuthScreenState extends State<LiveEmailAuthScreen> {
  int tab = 0;
  bool obscure = true;
  final name = TextEditingController();
  final email = TextEditingController();
  final password = TextEditingController();
  final confirm = TextEditingController();

  @override
  void dispose() {
    name.dispose();
    email.dispose();
    password.dispose();
    confirm.dispose();
    super.dispose();
  }

  Future<void> _submit(legacy.AuthController auth) async {
    try {
      if (tab == 0) {
        await auth.signInWithEmail(email.text, password.text);
      } else if (tab == 1) {
        if (password.text != confirm.text) {
          throw StateError('Les mots de passe ne correspondent pas.');
        }
        await auth.signUpWithEmail(name.text, email.text, password.text);
      } else {
        await auth.resetPassword(email.text);
      }
      if (!mounted) return;
      if (tab == 2) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Email de reinitialisation envoye.')),
        );
        setState(() => tab = 0);
        return;
      }
      context.go(_nextRoute(context) ?? '/app/ia');
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(error.toString())));
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<legacy.AuthController>();
    final title = switch (tab) {
      0 => 'Se connecter',
      1 => 'Creer un compte',
      _ => 'Mot de passe oublie',
    };
    final cta = switch (tab) {
      0 => 'Se connecter',
      1 => 'Creer le compte',
      _ => 'Envoyer le lien',
    };
    return Scaffold(
      backgroundColor: WaouhPalette.pearl,
      appBar: _AuthHeader(title: title, subtitle: 'WaouhApp'),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(
            WaouhSpace.lg, WaouhSpace.lg, WaouhSpace.lg, WaouhSpace.xxl),
        children: [
          Container(
            padding: const EdgeInsets.all(4),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(WaouhRadius.control),
              border: Border.all(color: WaouhPalette.line),
            ),
            child: Row(
              children: [
                _segment('Connexion', 0),
                _segment('Inscription', 1),
                _segment('Mdp oublie', 2),
              ],
            ),
          ),
          const SizedBox(height: WaouhSpace.lg),
          if (tab != 2) ...[
            SocialSignInButton(
              label:
                  tab == 1 ? "S'inscrire avec Google" : 'Continuer avec Google',
              icon: const GoogleMark(),
              loading: auth.loading,
              onPressed: () async {
                try {
                  await auth.signInWithGoogle();
                } catch (error) {
                  if (!mounted) return;
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text(error.toString())),
                  );
                }
              },
            ),
            const SizedBox(height: WaouhSpace.lg),
            Row(
              children: [
                const Expanded(child: Divider(color: WaouhPalette.line)),
                Padding(
                  padding:
                      const EdgeInsets.symmetric(horizontal: WaouhSpace.sm),
                  child: Text('OU PAR EMAIL', style: WaouhText.eyebrow),
                ),
                const Expanded(child: Divider(color: WaouhPalette.line)),
              ],
            ),
            const SizedBox(height: WaouhSpace.lg),
          ],
          if (tab == 1) ...[
            _field(
                controller: name,
                label: 'Nom complet',
                icon: Icons.person_outline_rounded),
            const SizedBox(height: WaouhSpace.md),
          ],
          _field(
            controller: email,
            label: 'Email',
            icon: Icons.mail_outline_rounded,
            keyboardType: TextInputType.emailAddress,
          ),
          if (tab != 2) ...[
            const SizedBox(height: WaouhSpace.md),
            _field(
              controller: password,
              label: 'Mot de passe',
              icon: Icons.lock_outline_rounded,
              obscure: obscure,
              suffix: IconButton(
                icon: Icon(
                    obscure
                        ? Icons.visibility_outlined
                        : Icons.visibility_off_outlined,
                    size: 20),
                onPressed: () => setState(() => obscure = !obscure),
              ),
            ),
          ],
          if (tab == 1) ...[
            const SizedBox(height: WaouhSpace.md),
            _field(
              controller: confirm,
              label: 'Confirmer le mot de passe',
              icon: Icons.lock_outline_rounded,
              obscure: obscure,
            ),
          ],
          if (auth.error != null) ...[
            const SizedBox(height: WaouhSpace.md),
            Container(
              padding: const EdgeInsets.all(WaouhSpace.md),
              decoration: BoxDecoration(
                color: WaouhPalette.redTint,
                borderRadius: BorderRadius.circular(WaouhRadius.control),
              ),
              child: Row(
                children: [
                  const Icon(Icons.error_outline_rounded,
                      color: WaouhPalette.red, size: 18),
                  const SizedBox(width: WaouhSpace.sm),
                  Expanded(
                    child: Text(auth.error!,
                        style: WaouhText.bodyStrong
                            .copyWith(color: WaouhPalette.red)),
                  ),
                ],
              ),
            ),
          ],
          const SizedBox(height: WaouhSpace.xl),
          SizedBox(
            height: 54,
            child: FilledButton(
              onPressed: auth.loading ? null : () => _submit(auth),
              child: auth.loading
                  ? const SizedBox(
                      width: 22,
                      height: 22,
                      child: CircularProgressIndicator(
                          strokeWidth: 2.4, color: Colors.white),
                    )
                  : Text(cta, style: WaouhText.button),
            ),
          ),
          if (tab == 0)
            Padding(
              padding: const EdgeInsets.only(top: WaouhSpace.sm),
              child: TextButton(
                onPressed: () => setState(() => tab = 2),
                child: const Text('Mot de passe oublie ?'),
              ),
            ),
        ],
      ),
    );
  }

  Widget _segment(String label, int value) {
    final selected = tab == value;
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => tab = value),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          padding: const EdgeInsets.symmetric(vertical: 11),
          decoration: BoxDecoration(
            color: selected ? WaouhPalette.green : Colors.transparent,
            borderRadius: BorderRadius.circular(12),
          ),
          alignment: Alignment.center,
          child: Text(
            label,
            style: WaouhText.caption.copyWith(
              color: selected ? Colors.white : WaouhPalette.muted,
              fontWeight: FontWeight.w800,
            ),
          ),
        ),
      ),
    );
  }

  Widget _field({
    required TextEditingController controller,
    required String label,
    required IconData icon,
    TextInputType? keyboardType,
    bool obscure = false,
    Widget? suffix,
  }) {
    return TextField(
      controller: controller,
      keyboardType: keyboardType,
      obscureText: obscure,
      decoration: InputDecoration(
        labelText: label,
        prefixIcon: Icon(icon, size: 20),
        suffixIcon: suffix,
      ),
    );
  }
}

/// WhatsApp OTP flow: phone -> 6-digit code -> (new account) profile
/// completion -> chat. The verification step now actually creates a Supabase
/// session (see [legacy.AuthController.verifyWhatsappOtp]).
class LiveWhatsAppOtpScreen extends StatefulWidget {
  const LiveWhatsAppOtpScreen({super.key});
  @override
  State<LiveWhatsAppOtpScreen> createState() => _LiveWhatsAppOtpScreenState();
}

class _LiveWhatsAppOtpScreenState extends State<LiveWhatsAppOtpScreen> {
  final phone = TextEditingController(text: '+229');
  final code = TextEditingController();
  final fullName = TextEditingController();
  final recoveryEmail = TextEditingController();
  bool sent = false;
  bool verified = false;

  @override
  void dispose() {
    phone.dispose();
    code.dispose();
    fullName.dispose();
    recoveryEmail.dispose();
    super.dispose();
  }

  Future<void> _send(legacy.AuthController auth) async {
    try {
      await auth.requestWhatsappOtp(phone.text);
      if (mounted) setState(() => sent = true);
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(error.toString())));
      }
    }
  }

  Future<void> _verify(legacy.AuthController auth) async {
    try {
      await auth.verifyWhatsappOtp(phone.text, code.text);
      if (!mounted) return;
      if (auth.whatsappIsNewUser) {
        setState(() => verified = true);
      } else {
        context.go(_nextRoute(context) ?? '/app/ia');
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(error.toString())));
      }
    }
  }

  Future<void> _completeProfile(legacy.AuthController auth) async {
    if (fullName.text.trim().length < 2) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Indiquez votre nom complet.')),
      );
      return;
    }
    try {
      await auth.completeWhatsappProfile(
        fullName: fullName.text,
        email: recoveryEmail.text,
      );
      if (mounted) context.go(_nextRoute(context) ?? '/app/ia');
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(error.toString())));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<legacy.AuthController>();
    final step = verified ? 'profile' : (sent ? 'otp' : 'phone');
    return Scaffold(
      backgroundColor: WaouhPalette.pearl,
      appBar: _AuthHeader(
        title: 'WhatsApp',
        subtitle: switch (step) {
          'profile' => 'Bienvenue sur WaouhApp',
          'otp' => 'Verification du code',
          _ => 'Connexion +229',
        },
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(
            WaouhSpace.xl, WaouhSpace.xl, WaouhSpace.xl, WaouhSpace.xxl),
        children: [
          Center(
            child: Container(
              width: 84,
              height: 84,
              decoration: const BoxDecoration(
                  color: Color(0xFFE6FBEF), shape: BoxShape.circle),
              child: const Icon(Icons.chat_bubble_rounded,
                  size: 40, color: Color(0xFF25D366)),
            ),
          ),
          const SizedBox(height: WaouhSpace.xl),
          if (step == 'phone') ...[
            const Text('Numero WhatsApp', style: WaouhText.h3),
            const SizedBox(height: WaouhSpace.sm),
            TextField(
              controller: phone,
              keyboardType: TextInputType.phone,
              decoration: const InputDecoration(hintText: '+22997000000'),
            ),
            const SizedBox(height: WaouhSpace.sm),
            Text(
              'Le code sera envoye directement sur WhatsApp. Assurez-vous que ce numero possede un compte WhatsApp actif.',
              style: WaouhText.caption,
            ),
            const SizedBox(height: WaouhSpace.xl),
            SizedBox(
              height: 54,
              child: FilledButton(
                style: FilledButton.styleFrom(
                    backgroundColor: const Color(0xFF25D366)),
                onPressed: auth.loading ? null : () => _send(auth),
                child: auth.loading
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                            strokeWidth: 2, color: Colors.white))
                    : const Text('Envoyer le code'),
              ),
            ),
          ] else if (step == 'otp') ...[
            Text('Code recu sur ${phone.text}',
                textAlign: TextAlign.center, style: WaouhText.h3),
            const SizedBox(height: WaouhSpace.lg),
            TextField(
              controller: code,
              maxLength: 6,
              keyboardType: TextInputType.number,
              textAlign: TextAlign.center,
              style: const TextStyle(
                  fontSize: 26, fontWeight: FontWeight.w900, letterSpacing: 10),
              decoration:
                  const InputDecoration(counterText: '', hintText: '------'),
            ),
            const SizedBox(height: WaouhSpace.lg),
            SizedBox(
              height: 54,
              child: FilledButton(
                style: FilledButton.styleFrom(
                    backgroundColor: const Color(0xFF25D366)),
                onPressed: auth.loading || code.text.length != 6
                    ? null
                    : () => _verify(auth),
                child: auth.loading
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                            strokeWidth: 2, color: Colors.white))
                    : const Text('Verifier'),
              ),
            ),
            Center(
              child: TextButton(
                onPressed: () => setState(() => sent = false),
                child: const Text('Modifier le numero'),
              ),
            ),
          ] else ...[
            const Text('Completez votre profil',
                style: WaouhText.h1, textAlign: TextAlign.center),
            const SizedBox(height: WaouhSpace.xs),
            Text(
              'Pour finaliser votre compte WaouhApp',
              textAlign: TextAlign.center,
              style: WaouhText.body.copyWith(color: WaouhPalette.muted),
            ),
            const SizedBox(height: WaouhSpace.xl),
            _profileField(
                controller: fullName,
                label: 'Nom complet *',
                icon: Icons.person_outline_rounded),
            const SizedBox(height: WaouhSpace.md),
            _profileField(
              controller: recoveryEmail,
              label: 'Email (optionnel)',
              icon: Icons.mail_outline_rounded,
              keyboardType: TextInputType.emailAddress,
            ),
            const SizedBox(height: WaouhSpace.sm),
            Text('Utile pour recuperer votre compte.',
                style: WaouhText.caption),
            const SizedBox(height: WaouhSpace.xl),
            SizedBox(
              height: 54,
              child: FilledButton(
                onPressed: auth.loading ? null : () => _completeProfile(auth),
                child: auth.loading
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                            strokeWidth: 2, color: Colors.white))
                    : const Text('Terminer'),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _profileField({
    required TextEditingController controller,
    required String label,
    required IconData icon,
    TextInputType? keyboardType,
  }) {
    return TextField(
      controller: controller,
      keyboardType: keyboardType,
      decoration:
          InputDecoration(labelText: label, prefixIcon: Icon(icon, size: 20)),
    );
  }
}
