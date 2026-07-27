import 'package:flutter/material.dart';

import 'waouh_presence_models.dart';
import 'waouh_presence_repository.dart';

class WaouhPresenceTeamSheet extends StatefulWidget {
  const WaouhPresenceTeamSheet({
    super.key,
    required this.repository,
    required this.site,
  });

  final WaouhPresenceRepository repository;
  final WaouhPresenceSite site;

  @override
  State<WaouhPresenceTeamSheet> createState() => _WaouhPresenceTeamSheetState();
}

class _WaouhPresenceTeamSheetState extends State<WaouhPresenceTeamSheet> {
  static const green = Color(0xFF076B5D);
  static const muted = Color(0xFF66736F);
  static const line = Color(0xFFDDE9E5);

  List<WaouhPresenceMember> _members = const [];
  bool _loading = true;
  Object? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final members = await widget.repository.fetchMembers(widget.site.id);
      if (!mounted) return;
      setState(() => _members = members);
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = error);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _edit([WaouhPresenceMember? member]) async {
    final changed = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => _MemberForm(
        repository: widget.repository,
        site: widget.site,
        member: member,
      ),
    );
    if (changed == true) await _load();
  }

  Future<void> _toggle(WaouhPresenceMember member) async {
    try {
      await widget.repository.setMemberStatus(
        memberId: member.id,
        status: member.isActive ? 'inactive' : 'active',
      );
      await _load();
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('$error')));
    }
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: MediaQuery.sizeOf(context).height * .90,
      child: Material(
        color: const Color(0xFFF3F8F6),
        borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.fromLTRB(18, 16, 12, 14),
              decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Équipe',
                          style: TextStyle(
                            fontSize: 26,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                        Text(
                          widget.site.name,
                          style: const TextStyle(color: muted),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    tooltip: 'Actualiser',
                    onPressed: _loading ? null : _load,
                    icon: const Icon(Icons.refresh_rounded),
                  ),
                  IconButton.filled(
                    tooltip: 'Ajouter un membre',
                    onPressed: () => _edit(),
                    icon: const Icon(Icons.person_add_alt_1_rounded),
                  ),
                ],
              ),
            ),
            Expanded(
              child: _loading
                  ? const Center(child: CircularProgressIndicator())
                  : _error != null
                  ? Center(
                      child: Padding(
                        padding: const EdgeInsets.all(24),
                        child: Text('$_error', textAlign: TextAlign.center),
                      ),
                    )
                  : _members.isEmpty
                  ? Center(
                      child: Padding(
                        padding: const EdgeInsets.all(26),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(
                              Icons.groups_2_outlined,
                              size: 54,
                              color: green,
                            ),
                            const SizedBox(height: 12),
                            const Text(
                              'Ajoutez les employés et responsables du site.',
                              textAlign: TextAlign.center,
                              style: TextStyle(fontWeight: FontWeight.w700),
                            ),
                            const SizedBox(height: 12),
                            FilledButton.icon(
                              onPressed: () => _edit(),
                              icon: const Icon(Icons.add_rounded),
                              label: const Text('Ajouter un membre'),
                            ),
                          ],
                        ),
                      ),
                    )
                  : ListView.separated(
                      padding: const EdgeInsets.all(14),
                      itemCount: _members.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 8),
                      itemBuilder: (_, index) {
                        final member = _members[index];
                        return Container(
                          padding: const EdgeInsets.all(13),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(18),
                            border: Border.all(color: line),
                          ),
                          child: Row(
                            children: [
                              CircleAvatar(
                                radius: 24,
                                backgroundColor: member.isManager
                                    ? const Color(0xFFE9E2FF)
                                    : const Color(0xFFE5F5F1),
                                foregroundColor: member.isManager
                                    ? const Color(0xFF6E49C9)
                                    : green,
                                child: Icon(
                                  member.isManager
                                      ? Icons.admin_panel_settings_outlined
                                      : Icons.badge_outlined,
                                ),
                              ),
                              const SizedBox(width: 11),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      children: [
                                        Expanded(
                                          child: Text(
                                            member.displayName,
                                            style: const TextStyle(
                                              fontWeight: FontWeight.w900,
                                            ),
                                          ),
                                        ),
                                        _Pill(
                                          label: member.isActive
                                              ? 'Actif'
                                              : 'Inactif',
                                          color: member.isActive
                                              ? green
                                              : Colors.grey,
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      '${member.employeeCode} · ${member.isManager ? 'Responsable' : 'Employé'}',
                                      style: const TextStyle(color: muted),
                                    ),
                                    if (member.phone != null &&
                                        member.phone!.isNotEmpty)
                                      Text(
                                        member.phone!,
                                        style: const TextStyle(
                                          color: muted,
                                          fontSize: 12,
                                        ),
                                      ),
                                    if (member.email != null &&
                                        member.email!.isNotEmpty)
                                      Text(
                                        member.email!,
                                        style: const TextStyle(
                                          color: muted,
                                          fontSize: 12,
                                        ),
                                      ),
                                  ],
                                ),
                              ),
                              PopupMenuButton<String>(
                                onSelected: (value) {
                                  if (value == 'edit') {
                                    _edit(member);
                                  }
                                  if (value == 'toggle') {
                                    _toggle(member);
                                  }
                                },
                                itemBuilder: (_) => [
                                  const PopupMenuItem(
                                    value: 'edit',
                                    child: ListTile(
                                      leading: Icon(Icons.edit_outlined),
                                      title: Text('Modifier'),
                                    ),
                                  ),
                                  PopupMenuItem(
                                    value: 'toggle',
                                    child: ListTile(
                                      leading: Icon(
                                        member.isActive
                                            ? Icons.block_outlined
                                            : Icons.check_circle_outline,
                                      ),
                                      title: Text(
                                        member.isActive
                                            ? 'Désactiver'
                                            : 'Réactiver',
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        );
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }
}

class _MemberForm extends StatefulWidget {
  const _MemberForm({
    required this.repository,
    required this.site,
    this.member,
  });

  final WaouhPresenceRepository repository;
  final WaouhPresenceSite site;
  final WaouhPresenceMember? member;

  @override
  State<_MemberForm> createState() => _MemberFormState();
}

class _MemberFormState extends State<_MemberForm> {
  static const countryCodes = [
    ('BJ', '+229'),
    ('TG', '+228'),
    ('CI', '+225'),
    ('SN', '+221'),
    ('CM', '+237'),
    ('FR', '+33'),
  ];

  late final _name = TextEditingController(
    text: widget.member?.displayName ?? '',
  );
  late final _code = TextEditingController(
    text: widget.member?.employeeCode ?? '',
  );
  late final _email = TextEditingController(text: widget.member?.email ?? '');
  late final _phone = TextEditingController(
    text: _localPhone(widget.member?.phone),
  );
  final _pin = TextEditingController();
  late String _role = widget.member?.role ?? 'employee';
  String _countryCode = '+229';
  bool _saving = false;
  String? _error;

  static String _digits(String? value) =>
      (value ?? '').replaceAll(RegExp(r'\D'), '');
  static String _localPhone(String? value) {
    final digits = _digits(value);
    for (final entry in countryCodes) {
      final code = entry.$2.replaceAll('+', '');
      if (digits.startsWith(code) && digits.length > code.length) {
        return digits.substring(code.length);
      }
    }
    return digits;
  }

  @override
  void initState() {
    super.initState();
    final raw = _digits(widget.member?.phone);
    for (final entry in countryCodes) {
      final code = entry.$2.replaceAll('+', '');
      if (raw.startsWith(code) && raw.length > code.length) {
        _countryCode = entry.$2;
        break;
      }
    }
    _name.addListener(_suggestCode);
  }

  void _suggestCode() {
    if (widget.member != null) return;
    if (_code.text.trim().isNotEmpty) return;
    final words = _name.text
        .trim()
        .split(RegExp(r'\s+'))
        .where((part) => part.isNotEmpty)
        .toList();
    if (words.isEmpty) return;
    final initials = words
        .take(2)
        .map((value) => value[0].toUpperCase())
        .join();
    final suffix = DateTime.now().millisecondsSinceEpoch.toString().substring(
      7,
    );
    _code.text = 'EMP-$initials$suffix';
    _code.selection = TextSelection.collapsed(offset: _code.text.length);
  }

  @override
  void dispose() {
    _name.removeListener(_suggestCode);
    for (final controller in [_name, _code, _email, _phone, _pin]) {
      controller.dispose();
    }
    super.dispose();
  }

  String _composePhone() {
    final local = _digits(_phone.text);
    if (local.isEmpty) return '';
    return '${_countryCode.replaceAll('+', '')}$local';
  }

  Future<void> _save() async {
    if (_name.text.trim().isEmpty) {
      setState(() => _error = 'Le nom complet est obligatoire.');
      return;
    }
    if (_pin.text.trim().isNotEmpty &&
        !RegExp(r'^\d{4}$').hasMatch(_pin.text.trim())) {
      setState(() => _error = 'Le PIN doit contenir exactement 4 chiffres.');
      return;
    }
    try {
      setState(() {
        _saving = true;
        _error = null;
      });
      await widget.repository.saveMember(
        siteId: widget.site.id,
        memberId: widget.member?.id,
        displayName: _name.text,
        employeeCode: _code.text,
        email: _email.text,
        phone: _composePhone(),
        role: _role,
        pin: _pin.text,
      );
      if (!mounted) return;
      Navigator.pop(context, true);
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = '$error'
            .replaceAll('StateError:', '')
            .replaceAll('Exception:', '')
            .trim();
      });
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final inset = MediaQuery.viewInsetsOf(context).bottom;
    return Padding(
      padding: EdgeInsets.fromLTRB(18, 16, 18, 18 + inset),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              widget.member == null
                  ? 'Ajouter un membre'
                  : 'Modifier le membre',
              style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w900),
            ),
            const SizedBox(height: 6),
            Text(
              widget.member == null
                  ? 'Créez un profil intelligent pour le pointage QR.'
                  : 'Mettez à jour les informations du membre.',
              style: const TextStyle(color: Color(0xFF66736F)),
            ),
            const SizedBox(height: 14),
            if (_error != null)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                margin: const EdgeInsets.only(bottom: 12),
                decoration: BoxDecoration(
                  color: const Color(0xFFFFECEC),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Text(_error!),
              ),
            TextField(
              controller: _name,
              autofocus: true,
              textCapitalization: TextCapitalization.words,
              decoration: const InputDecoration(
                labelText: 'Nom complet',
                hintText: 'Ex: Trésor Zime',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: _code,
              textCapitalization: TextCapitalization.characters,
              decoration: const InputDecoration(
                labelText: 'Matricule',
                hintText: 'Ex: EMP-TZ12345',
                helperText:
                    'Si vous laissez vide, un code intelligent sera proposé.',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 10),
            LayoutBuilder(
              builder: (context, constraints) {
                final compact = constraints.maxWidth < 430;
                final emailField = TextField(
                  controller: _email,
                  keyboardType: TextInputType.emailAddress,
                  decoration: const InputDecoration(
                    labelText: 'Email',
                    hintText: 'nom@entreprise.com',
                    border: OutlineInputBorder(),
                  ),
                );
                final roleField = DropdownButtonFormField<String>(
                  initialValue: _role,
                  decoration: const InputDecoration(
                    labelText: 'Rôle',
                    border: OutlineInputBorder(),
                  ),
                  items: const [
                    DropdownMenuItem(value: 'employee', child: Text('Employé')),
                    DropdownMenuItem(
                      value: 'manager',
                      child: Text('Responsable'),
                    ),
                  ],
                  onChanged: (value) =>
                      setState(() => _role = value ?? 'employee'),
                );
                if (compact) {
                  return Column(
                    children: [
                      emailField,
                      const SizedBox(height: 10),
                      roleField,
                    ],
                  );
                }
                return Row(
                  children: [
                    Expanded(child: emailField),
                    const SizedBox(width: 10),
                    Expanded(child: roleField),
                  ],
                );
              },
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                SizedBox(
                  width: 120,
                  child: DropdownButtonFormField<String>(
                    initialValue: _countryCode,
                    decoration: const InputDecoration(
                      labelText: 'Pays',
                      border: OutlineInputBorder(),
                    ),
                    items: countryCodes
                        .map(
                          (entry) => DropdownMenuItem(
                            value: entry.$2,
                            child: Text('${entry.$1} ${entry.$2}'),
                          ),
                        )
                        .toList(),
                    onChanged: (value) =>
                        setState(() => _countryCode = value ?? '+229'),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: TextField(
                    controller: _phone,
                    keyboardType: TextInputType.phone,
                    decoration: InputDecoration(
                      labelText: 'Téléphone',
                      hintText: '99129919',
                      helperText: 'Indicatif $_countryCode',
                      prefixIcon: const Icon(Icons.phone_rounded),
                      border: const OutlineInputBorder(),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            TextField(
              controller: _pin,
              keyboardType: TextInputType.number,
              maxLength: 4,
              obscureText: true,
              decoration: InputDecoration(
                labelText: widget.member == null
                    ? 'PIN 4 chiffres'
                    : 'Nouveau PIN',
                hintText: '1234',
                helperText: 'Utilisé pour sécuriser le pointage QR.',
                counterText: '',
                prefixIcon: const Icon(Icons.lock_outline_rounded),
                border: const OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 14),
            SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                onPressed: _saving ? null : _save,
                icon: _saving
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : const Icon(Icons.save_outlined),
                label: const Text('Enregistrer le membre'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Pill extends StatelessWidget {
  const _Pill({required this.label, required this.color});

  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.10),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: color,
          fontSize: 10,
          fontWeight: FontWeight.w800,
        ),
      ),
    );
  }
}
