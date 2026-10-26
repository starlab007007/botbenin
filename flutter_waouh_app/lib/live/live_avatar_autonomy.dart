import 'package:flutter/material.dart';
import '../main.dart' as legacy;

const avatarPremiumBlue = Color(0xFF4168F3),
    avatarPremiumInk = Color(0xFF17233B),
    avatarPremiumMuted = Color(0xFF65738B),
    avatarPremiumLine = Color(0xFFE5EAF3),
    avatarPremiumBg = Color(0xFFF5F7FC);
const defaultAvatarAutonomy = <String, dynamic>{
  'mode': 'autonomous',
  'goal': '',
  'city': '',
  'budget_max': null,
  'price_floor': null,
  'radius_km': 25,
  'active_start': '08:00',
  'active_end': '20:00',
  'start': 'now',
  'duration_hours': 24,
  'scan_interval_minutes': 30,
  'followup_hours': 24,
  'max_followups': 1,
  'max_contacts': 5,
  'allow_contact': false,
  'allow_negotiate': false,
  'allow_whatsapp': false,
  'notify_reply': true,
  'notify_offer': true,
  'digest_only': false,
  'no_match': 'ask',
  'agreement': 'confirm',
};
Future<Map<String, dynamic>> loadLiveAvatarAutonomy() async {
  final response = await legacy.supabase.functions.invoke(
    'waouh-avatar-briefing',
    body: {'action': 'get_prefs'},
  );
  final data = response.data;
  if (data is! Map || data['ok'] != true) throw StateError('rules_unavailable');
  final prefs = data['prefs'];
  final raw = prefs is Map ? prefs['autonomy_settings'] : null;
  return {
    ...defaultAvatarAutonomy,
    if (raw is Map) ...Map<String, dynamic>.from(raw),
  };
}

Future<Map<String, dynamic>> saveLiveAvatarAutonomy(
  Map<String, dynamic> rules,
) async {
  final response = await legacy.supabase.functions.invoke(
    'waouh-avatar-briefing',
    body: {
      'action': 'set_prefs',
      'prefs': {'autonomy_settings': rules},
    },
  );
  final data = response.data;
  if (data is! Map ||
      data['ok'] != true ||
      data['prefs'] is! Map ||
      (data['prefs'] as Map)['autonomy_settings'] is! Map)
    throw StateError('rules_save_failed');
  return Map<String, dynamic>.from(
    (data['prefs'] as Map)['autonomy_settings'] as Map,
  );
}

String? liveAvatarAutonomyError(Map<String, dynamic> rules) {
  if ('${rules['active_start']}'.compareTo('${rules['active_end']}') >= 0)
    return 'Choisissez une heure de fin après l’heure de début.';
  if (rules['allow_negotiate'] == true && rules['allow_contact'] != true)
    return 'Autorisez le contact pour permettre la négociation.';
  return null;
}

class LiveAvatarAutonomyScreen extends StatefulWidget {
  const LiveAvatarAutonomyScreen({super.key, this.onAppearance});
  final VoidCallback? onAppearance;
  @override
  State<LiveAvatarAutonomyScreen> createState() =>
      _LiveAvatarAutonomyScreenState();
}

class _LiveAvatarAutonomyScreenState extends State<LiveAvatarAutonomyScreen> {
  Map<String, dynamic> rules = {...defaultAvatarAutonomy};
  bool loading = true, saving = false, saved = false, loadFailed = false;
  String? error;
  String section = '';
  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      loading = true;
      error = null;
    });
    try {
      final value = await loadLiveAvatarAutonomy();
      if (mounted)
        setState(() {
          rules = value;
          loadFailed = false;
        });
    } catch (_) {
      if (mounted)
        setState(() {
          error = 'Chargement impossible. Réessayez.';
          loadFailed = true;
        });
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  void patch(String key, dynamic value) => setState(() {
    rules = {...rules, key: value};
    saved = false;
  });
  Future<void> _save() async {
    final message = liveAvatarAutonomyError(rules);
    if (message != null) {
      setState(() => error = message);
      return;
    }
    setState(() {
      saving = true;
      error = null;
    });
    try {
      final next = await saveLiveAvatarAutonomy(rules);
      if (mounted)
        setState(() {
          rules = next;
          saved = true;
        });
    } catch (_) {
      if (mounted)
        setState(() => error = 'Enregistrement impossible. Réessayez.');
    } finally {
      if (mounted) setState(() => saving = false);
    }
  }

  Widget field(String key, String label, {bool money = false}) => Padding(
    padding: const EdgeInsets.only(top: 12),
    child: TextFormField(
      initialValue: '${rules[key] ?? ''}',
      keyboardType: money ? TextInputType.number : TextInputType.text,
      onChanged: (v) => patch(key, money ? (num.tryParse(v)) : v),
      decoration: InputDecoration(
        labelText: label,
        filled: true,
        fillColor: avatarPremiumBg,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: avatarPremiumLine),
        ),
      ),
      style: const TextStyle(fontSize: 15),
    ),
  );
  Widget select(String key, String label, List<(dynamic, String)> options) =>
      Padding(
        padding: const EdgeInsets.only(top: 12),
        child: DropdownButtonFormField<dynamic>(
          initialValue: options.any((o) => o.$1 == rules[key])
              ? rules[key]
              : options.first.$1,
          isExpanded: true,
          items: options
              .map(
                (o) => DropdownMenuItem<dynamic>(
                  value: o.$1,
                  child: Text(o.$2, overflow: TextOverflow.ellipsis),
                ),
              )
              .toList(),
          onChanged: (v) => patch(key, v),
          decoration: InputDecoration(
            labelText: label,
            filled: true,
            fillColor: avatarPremiumBg,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: avatarPremiumLine),
            ),
          ),
          style: const TextStyle(fontSize: 13, color: avatarPremiumInk),
        ),
      );
  Widget toggle(String key, String label, [String? hint]) =>
      SwitchListTile.adaptive(
        contentPadding: EdgeInsets.zero,
        dense: true,
        title: Text(label, style: const TextStyle(fontSize: 12)),
        subtitle: hint == null
            ? null
            : Text(
                hint,
                style: const TextStyle(fontSize: 11, color: avatarPremiumMuted),
              ),
        value: rules[key] == true,
        activeTrackColor: avatarPremiumBlue,
        onChanged: (v) => patch(key, v),
      );
  Widget time(String key, String label) => Expanded(
    child: Padding(
      padding: const EdgeInsets.only(top: 12),
      child: OutlinedButton(
        onPressed: () async {
          final parts = '${rules[key]}'.split(':');
          final picked = await showTimePicker(
            context: context,
            initialTime: TimeOfDay(
              hour: int.tryParse(parts.first) ?? 8,
              minute: int.tryParse(parts.last) ?? 0,
            ),
          );
          if (picked != null)
            patch(
              key,
              '${picked.hour.toString().padLeft(2, '0')}:${picked.minute.toString().padLeft(2, '0')}',
            );
        },
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 12),
          child: Column(
            children: [
              Text(
                label,
                style: const TextStyle(fontSize: 11, color: avatarPremiumMuted),
              ),
              const SizedBox(height: 5),
              Text('${rules[key]}'),
            ],
          ),
        ),
      ),
    ),
  );
  Widget group(
    String id,
    String title,
    String subtitle,
    IconData icon,
    List<Widget> children,
  ) => Container(
    margin: const EdgeInsets.only(top: 10),
    decoration: BoxDecoration(
      color: Colors.white,
      border: Border.all(color: avatarPremiumLine),
      borderRadius: BorderRadius.circular(19),
    ),
    child: Column(
      children: [
        ListTile(
          dense: true,
          minVerticalPadding: 14,
          leading: Icon(icon, color: avatarPremiumBlue, size: 20),
          title: Text(
            title,
            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700),
          ),
          subtitle: Padding(
            padding: const EdgeInsets.only(top: 4),
            child: Text(
              subtitle,
              style: const TextStyle(fontSize: 11, color: avatarPremiumMuted),
            ),
          ),
          trailing: Icon(
            section == id ? Icons.expand_less : Icons.expand_more,
            size: 18,
          ),
          onTap: () => setState(() => section = section == id ? '' : id),
        ),
        if (section == id)
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 0, 14, 15),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: children,
            ),
          ),
      ],
    ),
  );
  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: avatarPremiumBg,
    appBar: AppBar(
      backgroundColor: avatarPremiumBg,
      title: const Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Mon Avatar, mes règles',
            style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700),
          ),
          Text(
            'Par défaut pour mes prochaines missions',
            style: TextStyle(fontSize: 11, color: avatarPremiumMuted),
          ),
        ],
      ),
      actions: const [
        Padding(
          padding: EdgeInsets.only(right: 16),
          child: Icon(Icons.verified_user_outlined, size: 20),
        ),
      ],
    ),
    body: loading
        ? const Center(child: CircularProgressIndicator())
        : ListView(
            padding: const EdgeInsets.fromLTRB(18, 10, 18, 120),
            children: [
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFFEDF1FF),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: const Row(
                  children: [
                    Icon(Icons.auto_awesome_outlined, color: avatarPremiumBlue),
                    SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Il agit. Vous gardez la main.',
                            style: TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          SizedBox(height: 5),
                          Text(
                            'Des limites claires, un suivi discret.',
                            style: TextStyle(
                              fontSize: 12,
                              color: avatarPremiumMuted,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 18),
              const Text(
                'Niveau d’autonomie',
                style: TextStyle(fontSize: 12, color: avatarPremiumMuted),
              ),
              const SizedBox(height: 9),
              Row(
                children: [
                  for (final option in [
                    ('assisted', 'Assistance'),
                    ('semi_autonomous', 'Délégation'),
                    ('autonomous', 'Autonome'),
                  ])
                    Expanded(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 3),
                        child: OutlinedButton(
                          style: OutlinedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(
                              vertical: 12,
                              horizontal: 3,
                            ),
                            backgroundColor: rules['mode'] == option.$1
                                ? avatarPremiumBlue
                                : Colors.white,
                            foregroundColor: rules['mode'] == option.$1
                                ? Colors.white
                                : avatarPremiumInk,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(13),
                            ),
                          ),
                          onPressed: () => patch('mode', option.$1),
                          child: Text(
                            option.$2,
                            style: const TextStyle(fontSize: 12),
                          ),
                        ),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 9),
              Text(
                rules['mode'] == 'assisted'
                    ? 'Bot vous conseille. Vous validez les actions à lancer.'
                    : rules['mode'] == 'semi_autonomous'
                    ? 'Vous validez un plan. Bot l’exécute dans vos limites.'
                    : 'Bot recherche, compare et suit seul. Vous définissez ses droits de contact et de négociation.',
                style: const TextStyle(
                  fontSize: 12,
                  height: 1.5,
                  color: avatarPremiumMuted,
                ),
              ),
              group(
                'limits',
                'Mission et limites',
                '${rules['goal'] == '' ? 'Besoin, ville et plafond' : rules['goal']}',
                Icons.track_changes,
                [
                  field('goal', 'Mon besoin habituel'),
                  field('city', 'Ville'),
                  field(
                    'budget_max',
                    'Budget total maximum · FCFA',
                    money: true,
                  ),
                  field(
                    'price_floor',
                    'Prix plancher de vente · FCFA',
                    money: true,
                  ),
                  select('radius_km', 'Rayon autorisé', [
                    (10, '10 km'),
                    (25, '25 km'),
                    (50, '50 km'),
                    (0, 'Tout le Bénin'),
                  ]),
                  const Padding(
                    padding: EdgeInsets.only(top: 8),
                    child: Text(
                      'Sans position précise, Bot reste dans la ville choisie.',
                      style: TextStyle(fontSize: 11, color: avatarPremiumMuted),
                    ),
                  ),
                  select('no_match', 'Si aucune piste ne convient', [
                    ('ask', 'Me demander avant d’élargir'),
                    ('stop', 'Arrêter et me faire le point'),
                  ]),
                ],
              ),
              group(
                'timing',
                'Quand agir et relancer',
                '${rules['active_start']}–${rules['active_end']} · ${rules['duration_hours']} h',
                Icons.schedule,
                [
                  select('start', 'Démarrage', [
                    ('now', 'Dès maintenant'),
                    ('tomorrow', 'Demain à l’ouverture'),
                  ]),
                  select('duration_hours', 'Durée de mission', [
                    (24, '24 heures'),
                    (48, '48 heures'),
                    (168, '7 jours'),
                  ]),
                  Row(
                    children: [
                      time('active_start', 'Intervenir de'),
                      const SizedBox(width: 10),
                      time('active_end', 'Jusqu’à'),
                    ],
                  ),
                  const Padding(
                    padding: EdgeInsets.only(top: 8),
                    child: Text(
                      'Heure du Bénin · Arrêt à l’échéance.',
                      style: TextStyle(fontSize: 11, color: avatarPremiumMuted),
                    ),
                  ),
                  select('scan_interval_minutes', 'Vérifier les opportunités', [
                    (30, 'Intelligent · selon les nouveautés'),
                    (60, 'Toutes les heures'),
                    (360, 'Toutes les 6 heures'),
                  ]),
                  select('followup_hours', 'Relancer après', [
                    (6, '6 heures'),
                    (24, '24 heures'),
                  ]),
                  select('max_followups', 'Maximum par personne', [
                    (0, 'Aucune relance'),
                    (1, '1 relance'),
                    (2, '2 relances'),
                  ]),
                ],
              ),
              group(
                'permissions',
                'Ce qu’il peut faire seul',
                rules['allow_contact'] == true
                    ? 'Contacts selon mon mandat'
                    : 'Rechercher, comparer et suivre',
                Icons.key_outlined,
                [
                  toggle(
                    'allow_contact',
                    'Contacter en mon nom',
                    'Dans les canaux que j’autorise',
                  ),
                  toggle(
                    'allow_negotiate',
                    'Négocier dans mes limites',
                    'Budget maximum ou prix plancher',
                  ),
                  select('max_contacts', 'Personnes à contacter', [
                    (3, '3 maximum par mission'),
                    (5, '5 maximum par mission'),
                    (10, '10 maximum par mission'),
                  ]),
                  toggle(
                    'allow_whatsapp',
                    'Autoriser aussi WhatsApp',
                    'Un canal indisponible reste signalé.',
                  ),
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 12),
                    child: Text(
                      'Accord, paiement et coordonnées privées : confirmation séparée.',
                      style: TextStyle(fontSize: 12, color: avatarPremiumMuted),
                    ),
                  ),
                ],
              ),
              group(
                'follow',
                'Suivi et alertes',
                'Réponses, meilleures offres et décisions',
                Icons.notifications_active_outlined,
                [
                  toggle('notify_reply', 'Une réponse arrive'),
                  toggle('notify_offer', 'Une meilleure offre apparaît'),
                  toggle('digest_only', 'Un récapitulatif chaque jour'),
                  const Text(
                    'Sans réponse à l’échéance, Bot arrête la mission et vous fait le point.',
                    style: TextStyle(fontSize: 12, color: avatarPremiumMuted),
                  ),
                ],
              ),
              if (widget.onAppearance != null)
                group(
                  'appearance',
                  'Apparence et personnalité',
                  'Nom et présence de mon Avatar',
                  Icons.face_outlined,
                  [
                    OutlinedButton(
                      onPressed: widget.onAppearance,
                      child: const Text('Personnaliser mon Avatar'),
                    ),
                  ],
                ),
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 18),
                child: Text(
                  'Votre mandat : agir pendant ${rules['duration_hours']} h entre ${rules['active_start']} et ${rules['active_end']}. ${rules['allow_contact'] == true ? 'Jusqu’à ${rules['max_contacts']} contacts autorisés.' : 'Contact soumis à votre confirmation.'} Accord soumis à votre confirmation.',
                  style: const TextStyle(
                    fontSize: 12,
                    height: 1.65,
                    color: avatarPremiumMuted,
                  ),
                ),
              ),
              if (error != null)
                Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Text(
                    error!,
                    style: const TextStyle(fontSize: 12, color: Colors.red),
                  ),
                ),
              if (loadFailed)
                OutlinedButton(onPressed: _load, child: const Text('Réessayer'))
              else
                FilledButton.icon(
                  style: FilledButton.styleFrom(
                    backgroundColor: avatarPremiumBlue,
                    padding: const EdgeInsets.all(15),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(15),
                    ),
                  ),
                  onPressed: saving ? null : _save,
                  icon: const Icon(Icons.check, size: 18),
                  label: Text(
                    saving ? 'Enregistrement…' : 'Enregistrer mes règles',
                  ),
                ),
              if (saved)
                const Padding(
                  padding: EdgeInsets.only(top: 12),
                  child: Text(
                    'Vos règles sont enregistrées sur votre compte.',
                    style: TextStyle(fontSize: 12, color: Color(0xFF008B87)),
                  ),
                ),
            ],
          ),
  );
}
