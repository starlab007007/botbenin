import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../main.dart' as legacy;
import 'live_theme.dart';

/// Parcours Partner canonique (parité Web `PartnerHomeScreen`) :
/// candidature → validation → espace opérationnel. Rien n'est activé
/// automatiquement côté application.
class LivePartnerHomeScreen extends StatefulWidget {
  const LivePartnerHomeScreen({super.key});

  @override
  State<LivePartnerHomeScreen> createState() => _LivePartnerHomeScreenState();
}

class _LivePartnerHomeScreenState extends State<LivePartnerHomeScreen> {
  final _nom = TextEditingController();
  final _tel = TextEditingController();
  final _wa = TextEditingController();
  final _ville = TextEditingController();
  final _mm = TextEditingController();
  String _operator = 'MTN';
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      final partner = context.read<legacy.PartnerController>();
      await partner.ensurePartner();
      if (!mounted) return;
      if (partner.partner?.status == 'active') {
        context.go('/app/partner/businesses');
      }
    });
    final auth = context.read<legacy.AuthController>();
    _nom.text = auth.profile?.fullName ?? auth.user?.email ?? '';
  }

  @override
  void dispose() {
    for (final c in [_nom, _tel, _wa, _ville, _mm]) {
      c.dispose();
    }
    super.dispose();
  }

  void _toast(String text) => ScaffoldMessenger.of(context)
      .showSnackBar(SnackBar(content: Text(text)));

  Future<void> _submit() async {
    if (_nom.text.trim().isEmpty ||
        _tel.text.trim().isEmpty ||
        _ville.text.trim().isEmpty) {
      _toast('Nom, téléphone et ville sont obligatoires.');
      return;
    }
    setState(() => _submitting = true);
    try {
      await context.read<legacy.PartnerController>().applyPartner(
            nom: _nom.text.trim(),
            telephone: _tel.text.trim(),
            whatsapp: _wa.text.trim(),
            ville: _ville.text.trim(),
            mobileMoneyNumber: _mm.text.trim(),
            mobileMoneyOperator: _operator,
          );
      _toast('Candidature envoyée. Vous serez notifié dès la validation.');
    } catch (_) {
      _toast('Candidature non envoyée. Réessayez dans un instant.');
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final controller = context.watch<legacy.PartnerController>();
    final partner = controller.partner;
    if (!controller.checked || controller.loading || partner?.status == 'active') {
      return const Scaffold(
        backgroundColor: WaouhPalette.pearl,
        body: Center(child: CircularProgressIndicator()),
      );
    }
    return Scaffold(
      backgroundColor: WaouhPalette.pearl,
      appBar: AppBar(title: const Text('Partenaire')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 110),
        children: [
          _Hero(
            title: partner == null
                ? 'Créer mon espace commerce'
                : (partner.name ?? 'Mon commerce'),
            subtitle: partner == null
                ? 'Catalogue, stock, ventes et versements au même endroit.'
                : null,
          ),
          const SizedBox(height: 14),
          if (partner != null) _Status(status: partner.status ?? 'pending') else _form(),
        ],
      ),
    );
  }

  Widget _form() => Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: WaouhPalette.line),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            TextField(
                controller: _nom,
                decoration: const InputDecoration(labelText: 'Nom / commerce')),
            const SizedBox(height: 10),
            TextField(
                controller: _tel,
                keyboardType: TextInputType.phone,
                decoration: const InputDecoration(labelText: 'Téléphone')),
            const SizedBox(height: 10),
            TextField(
                controller: _wa,
                keyboardType: TextInputType.phone,
                decoration: const InputDecoration(
                    labelText: 'WhatsApp (facultatif)')),
            const SizedBox(height: 10),
            TextField(
                controller: _ville,
                decoration: const InputDecoration(labelText: 'Ville')),
            const SizedBox(height: 10),
            Row(children: [
              SizedBox(
                width: 120,
                child: DropdownButtonFormField<String>(
                  value: _operator,
                  decoration: const InputDecoration(labelText: 'Opérateur'),
                  items: const [
                    DropdownMenuItem(value: 'MTN', child: Text('MTN')),
                    DropdownMenuItem(value: 'Moov', child: Text('Moov')),
                    DropdownMenuItem(value: 'Celtiis', child: Text('Celtiis')),
                  ],
                  onChanged: (v) => setState(() => _operator = v ?? 'MTN'),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: TextField(
                    controller: _mm,
                    keyboardType: TextInputType.phone,
                    decoration: const InputDecoration(
                        labelText: 'Numéro Mobile Money')),
              ),
            ]),
            const SizedBox(height: 16),
            SizedBox(
              height: 50,
              child: FilledButton(
                onPressed: _submitting ? null : _submit,
                style: FilledButton.styleFrom(
                  backgroundColor: WaouhPalette.blue,
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(18)),
                ),
                child: _submitting
                    ? const SizedBox.square(
                        dimension: 18,
                        child: CircularProgressIndicator(strokeWidth: 2))
                    : const Text('Envoyer pour validation',
                        style: TextStyle(fontWeight: FontWeight.w900)),
              ),
            ),
          ],
        ),
      );
}

class _Hero extends StatelessWidget {
  const _Hero({required this.title, this.subtitle});
  final String title;
  final String? subtitle;
  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
              colors: [Color(0xFF0F1E3D), Color(0xFF1E3A8A)]),
          borderRadius: BorderRadius.circular(26),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(children: [
              Icon(Icons.storefront_rounded, color: Color(0xFF55DDF2)),
              SizedBox(width: 8),
              Text('WAOUH PARTNER',
                  style: TextStyle(
                      color: Color(0xFF55DDF2),
                      fontSize: 11,
                      letterSpacing: 1.2,
                      fontWeight: FontWeight.w900)),
            ]),
            const SizedBox(height: 8),
            Text(title,
                style: const TextStyle(
                    color: Colors.white,
                    fontSize: 21,
                    fontWeight: FontWeight.w900)),
            if (subtitle != null) ...[
              const SizedBox(height: 6),
              Text(subtitle!,
                  style: const TextStyle(color: Color(0xFFCBD5E1), height: 1.35)),
            ],
          ],
        ),
      );
}

class _Status extends StatelessWidget {
  const _Status({required this.status});
  final String status;
  @override
  Widget build(BuildContext context) {
    final pending = status == 'pending';
    final suspended = status == 'suspended';
    final title = pending
        ? 'Validation en cours'
        : suspended
            ? 'Compte suspendu'
            : 'Candidature non validée';
    final text = pending
        ? 'Votre candidature est enregistrée. Vous serez notifié dès l’activation.'
        : suspended
            ? 'L’accès Partner est suspendu. Contactez le support WAOUH.'
            : 'Votre candidature doit être corrigée ou réexaminée.';
    final color = pending ? const Color(0xFFFFFBEB) : const Color(0xFFFEF2F2);
    final border = pending ? const Color(0xFFFDE68A) : const Color(0xFFFECACA);
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: border),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(pending ? Icons.schedule_rounded : Icons.shield_outlined),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title,
                    style: const TextStyle(
                        fontWeight: FontWeight.w900, fontSize: 15)),
                const SizedBox(height: 4),
                Text(text, style: const TextStyle(height: 1.35)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
