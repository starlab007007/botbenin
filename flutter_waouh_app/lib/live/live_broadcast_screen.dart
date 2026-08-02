import 'package:flutter/material.dart';

import '../main.dart' as legacy;
import 'live_diffusion_data.dart';
import 'live_diffusion_models.dart';
import 'live_guest_action_gate.dart';
import 'live_theme.dart';

class LiveBroadcastScreen extends StatefulWidget {
  const LiveBroadcastScreen({super.key});

  @override
  State<LiveBroadcastScreen> createState() => _LiveBroadcastScreenState();
}

class _LiveBroadcastScreenState extends State<LiveBroadcastScreen> {
  late final LiveDiffusionData _data = LiveDiffusionData(legacy.supabase);
  late Future<List<LiveAiDiffusionRequest>> _requestsFuture;
  int _tab = 0;

  @override
  void initState() {
    super.initState();
    _requestsFuture = _loadRequests();
  }

  Future<List<LiveAiDiffusionRequest>> _loadRequests() => _data.aiRequests();

  Future<void> _refresh() async {
    setState(() => _requestsFuture = _loadRequests());
    await _requestsFuture;
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        backgroundColor: WaouhPalette.pearl,
        appBar: AppBar(
          toolbarHeight: 68,
          titleSpacing: 18,
          title: const Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('Diffusion IA', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 23)),
              SizedBox(height: 2),
              Text('Audience ciblée · validation requise', style: TextStyle(fontSize: 11.5, color: Color(0xFFD1F5E6), fontWeight: FontWeight.w700)),
            ],
          ),
          actions: [
            IconButton(onPressed: _refresh, tooltip: 'Actualiser', icon: const Icon(Icons.refresh_rounded)),
            const SizedBox(width: 4),
          ],
          bottom: PreferredSize(
            preferredSize: const Size.fromHeight(60),
            child: _DiffusionTabs(value: _tab, onChanged: (value) => setState(() => _tab = value)),
          ),
        ),
        body: Column(
          children: [
            _DiffusionSmartCards(
              value: _tab,
              onChanged: (value) => setState(() => _tab = value),
            ),
            Expanded(child: FutureBuilder<List<LiveAiDiffusionRequest>>(
          future: _requestsFuture,
          builder: (_, snapshot) {
            final requests = snapshot.data ?? const <LiveAiDiffusionRequest>[];
            if (snapshot.connectionState == ConnectionState.waiting && !snapshot.hasData) {
              return const Center(child: CircularProgressIndicator());
            }
            if (snapshot.hasError) {
              return _LoadFailure(onRetry: _refresh, error: snapshot.error.toString());
            }
            return switch (_tab) {
              0 => _CreateAiDiffusion(data: _data, onSubmitted: () async {
                  await _refresh();
                  if (mounted) setState(() => _tab = 1);
                }),
              1 => _RequestsTab(data: _data, requests: requests, onChanged: _refresh),
              _ => _TrackingTab(requests: requests),
            };
          },
        )),
          ],
        ),
      );
}

class _DiffusionSmartCards extends StatelessWidget {
  const _DiffusionSmartCards({required this.value, required this.onChanged});

  final int value;
  final ValueChanged<int> onChanged;

  static const items = [
    (
      'Créer une diffusion',
      'Ciblage, audience et message assistés',
      Icons.auto_awesome_rounded,
      Color(0xFF08756A),
    ),
    (
      'Demandes',
      'Validation et état de chaque campagne',
      Icons.pending_actions_rounded,
      Color(0xFFE59016),
    ),
    (
      'Suivi intelligent',
      'Progression et performance en temps réel',
      Icons.analytics_outlined,
      Color(0xFF2563EB),
    ),
  ];

  @override
  Widget build(BuildContext context) => SizedBox(
        height: 116,
        child: ListView.separated(
          padding: const EdgeInsets.fromLTRB(14, 10, 14, 10),
          scrollDirection: Axis.horizontal,
          itemCount: items.length,
          separatorBuilder: (_, __) => const SizedBox(width: 10),
          itemBuilder: (_, index) {
            final item = items[index];
            final selected = index == value;
            return SizedBox(
              width: 210,
              child: Material(
                color: selected ? item.$4.withValues(alpha: .10) : Colors.white,
                borderRadius: BorderRadius.circular(18),
                clipBehavior: Clip.antiAlias,
                child: InkWell(
                  onTap: () => onChanged(index),
                  child: Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(
                        color: selected ? item.$4 : const Color(0xFFDCE7E3),
                        width: selected ? 1.5 : 1,
                      ),
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 42,
                          height: 42,
                          decoration: BoxDecoration(
                            color: item.$4.withValues(alpha: .12),
                            borderRadius: BorderRadius.circular(14),
                          ),
                          child: Icon(item.$3, color: item.$4, size: 21),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                item.$1,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  fontWeight: FontWeight.w900,
                                  fontSize: 13,
                                ),
                              ),
                              const SizedBox(height: 3),
                              Text(
                                item.$2,
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  color: Color(0xFF667A73),
                                  fontSize: 10.5,
                                  height: 1.2,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            );
          },
        ),
      );
}

class _DiffusionTabs extends StatelessWidget {
  const _DiffusionTabs({required this.value, required this.onChanged});
  final int value;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) {
    const tabs = [
      ('Créer', Icons.auto_awesome_rounded),
      ('Demandes', Icons.pending_actions_rounded),
      ('Suivi', Icons.analytics_outlined),
    ];
    return Container(
      color: WaouhPalette.deep,
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 10),
      child: Container(
        height: 42,
        clipBehavior: Clip.antiAlias,
        decoration: BoxDecoration(
          color: const Color(0xFF075E54),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: const Color(0xFF57A998)),
        ),
        child: Row(
          children: List.generate(tabs.length, (index) {
            final selected = index == value;
            return Expanded(
              child: Material(
                color: selected ? const Color(0xFFE7FFF4) : Colors.transparent,
                child: InkWell(
                  onTap: () => onChanged(index),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(tabs[index].$2, size: 17, color: selected ? WaouhPalette.deep : const Color(0xFFD4F5E9)),
                      const SizedBox(width: 6),
                      Text(
                        tabs[index].$1,
                        style: TextStyle(
                          color: selected ? WaouhPalette.deep : const Color(0xFFD4F5E9),
                          fontWeight: FontWeight.w900,
                          fontSize: 13,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            );
          }),
        ),
      ),
    );
  }
}

class _CreateAiDiffusion extends StatefulWidget {
  const _CreateAiDiffusion({required this.data, required this.onSubmitted});
  final LiveDiffusionData data;
  final Future<void> Function() onSubmitted;

  @override
  State<_CreateAiDiffusion> createState() => _CreateAiDiffusionState();
}

class _CreateAiDiffusionState extends State<_CreateAiDiffusion> {
  final _name = TextEditingController();
  final _message = TextEditingController(text: 'Bonjour {{display_name}} 👋\nDécouvrez notre nouvelle offre disponible à {{ville}}.');
  final _quota = TextEditingController(text: '100');
  final _city = TextEditingController();
  final _mediaUrl = TextEditingController();

  int _step = 0;
  bool _busy = false;
  LiveDiffusionAudiencePreview? _preview;
  Set<String> _sources = {'radar', 'catalog'};
  Set<String> _sectors = {};
  Set<String> _cities = {};
  Set<String> _classes = {'A', 'B'};
  double _quality = 50;
  double _intent = 0;

  @override
  void dispose() {
    _name.dispose();
    _message.dispose();
    _quota.dispose();
    _city.dispose();
    _mediaUrl.dispose();
    super.dispose();
  }

  Map<String, dynamic> get _filters => {
        'sources': _sources.toList(),
        'secteurs': _sectors.toList(),
        'sous_categories': const [],
        'keywords': '',
        'villes': _cities.toList(),
        'classes': _classes.toList(),
        'min_freshness_days': 30,
        'min_qualite': _quality.round(),
        'min_intent': _intent.round(),
      };

  void _invalidatePreview() {
    if (_preview != null) setState(() => _preview = null);
  }

  void _toggle(Set<String> values, String value) {
    setState(() {
      if (values.contains(value)) {
        values.remove(value);
      } else {
        values.add(value);
      }
      _preview = null;
    });
  }

  Future<void> _previewAudience() async {
    if (_sources.isEmpty) {
      _notice('Choisissez au moins une source de contacts.');
      return;
    }
    setState(() => _busy = true);
    try {
      final result = await widget.data.preview(_filters);
      if (!mounted) return;
      setState(() {
        _preview = result;
        final current = int.tryParse(_quota.text.trim()) ?? 0;
        if (current <= 0 || current > result.total) _quota.text = '${result.total}';
      });
    } catch (error) {
      _notice(error.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _submit() async {
    if (!await requireLiveAuthentication(
      context,
      next: '/app/diffusion',
      actionLabel: 'soumettre cette diffusion',
    )) return;
    final preview = _preview;
    if (preview == null || preview.total <= 0) {
      _notice('Prévisualisez une audience non vide avant de soumettre.');
      return;
    }
    if (_message.text.trim().isEmpty) {
      _notice('Renseignez le message à diffuser.');
      return;
    }
    final requested = int.tryParse(_quota.text.trim()) ?? 0;
    if (requested <= 0) {
      _notice('Le quota demandé doit être supérieur à zéro.');
      return;
    }
    final quota = requested.clamp(1, preview.total);
    final confirmed = await _confirmSubmit(quota, preview.total);
    if (!confirmed) return;
    setState(() => _busy = true);
    try {
      await widget.data.submitAiRequest(
        name: _name.text,
        messageTemplate: _message.text,
        mediaUrl: _mediaUrl.text,
        filters: _filters,
        quotaRequested: quota,
        audience: preview,
      );
      if (!mounted) return;
      _notice('Demande soumise à validation. Aucun message n’est envoyé avant approbation.', success: true);
      await widget.onSubmitted();
    } catch (error) {
      if (mounted) _notice(error.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<bool> _confirmSubmit(int quota, int audience) async {
    final answer = await showModalBottomSheet<bool>(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (_) => SafeArea(
        top: false,
        child: Container(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 22),
          decoration: const BoxDecoration(color: Colors.white, borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
          child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
            Center(child: Container(width: 42, height: 4, decoration: BoxDecoration(color: const Color(0xFFCDDBD6), borderRadius: BorderRadius.circular(99)))),
            const SizedBox(height: 18),
            const Text('Vérifier la demande', style: TextStyle(fontSize: 21, fontWeight: FontWeight.w900)),
            const SizedBox(height: 10),
            _ReviewRow(label: 'Audience estimée', value: '$audience contacts'),
            _ReviewRow(label: 'Quota demandé', value: '$quota messages'),
            _ReviewRow(label: 'Envoi', value: 'Après validation administrateur'),
            const SizedBox(height: 12),
            const Text('La diffusion respecte les désinscriptions et aucun message ne part avant approbation.', style: TextStyle(color: WaouhPalette.muted, height: 1.35)),
            const SizedBox(height: 18),
            Row(children: [
              Expanded(child: OutlinedButton(onPressed: () => Navigator.pop(context, false), child: const Text('Modifier'))),
              const SizedBox(width: 10),
              Expanded(child: FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Soumettre'))),
            ]),
          ]),
        ),
      ),
    );
    return answer == true;
  }

  void _notice(String value, {bool success = false}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(backgroundColor: success ? WaouhPalette.jade : null, content: Text(value.replaceFirst('Bad state: ', ''))),
    );
  }

  @override
  Widget build(BuildContext context) => Column(
        children: [
          Expanded(
            child: ListView(
              keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 116),
              children: [
                _StepIndicator(step: _step),
                const SizedBox(height: 14),
                if (_step == 0) _buildAudienceStep(),
                if (_step == 1) _buildQualificationStep(),
                if (_step == 2) _buildMessageStep(),
              ],
            ),
          ),
          _ComposerFooter(
            step: _step,
            busy: _busy,
            previewReady: _preview != null && _preview!.total > 0,
            onBack: _step == 0 ? null : () => setState(() => _step--),
            onNext: _step == 0
                ? () => setState(() => _step = 1)
                : _step == 1
                    ? (_preview == null || _preview!.total == 0 ? _previewAudience : () => setState(() => _step = 2))
                    : _submit,
          ),
        ],
      );

  Widget _buildAudienceStep() => _SurfaceCard(
        title: 'Choisir les cibles',
        subtitle: 'Le moteur ne retient que les contacts WhatsApp autorisés.',
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const _FieldTitle('Sources'),
          const SizedBox(height: 8),
          Wrap(spacing: 8, runSpacing: 8, children: [
            _FilterChoice(label: 'Radar', icon: Icons.radar_rounded, selected: _sources.contains('radar'), onTap: () => _toggle(_sources, 'radar')),
            _FilterChoice(label: 'Catalogue', icon: Icons.inventory_2_outlined, selected: _sources.contains('catalog'), onTap: () => _toggle(_sources, 'catalog')),
            _FilterChoice(label: 'Signaux', icon: Icons.notifications_active_outlined, selected: _sources.contains('signal'), onTap: () => _toggle(_sources, 'signal')),
            _FilterChoice(label: 'Contacts', icon: Icons.people_outline_rounded, selected: _sources.contains('wa_contact'), onTap: () => _toggle(_sources, 'wa_contact')),
          ]),
          const SizedBox(height: 20),
          const _FieldTitle('Secteurs'),
          const SizedBox(height: 8),
          Wrap(spacing: 8, runSpacing: 8, children: [
            'Mode & Beauté', 'Tech & Électronique', 'Auto & Moto', 'Immobilier', 'Alimentaire', 'Services',
          ].map((value) => _FilterChoice(label: value, selected: _sectors.contains(value), onTap: () => _toggle(_sectors, value))).toList()),
          const SizedBox(height: 20),
          const _FieldTitle('Villes'),
          const SizedBox(height: 8),
          Row(children: [
            Expanded(child: TextField(controller: _city, textCapitalization: TextCapitalization.words, decoration: const InputDecoration(hintText: 'Ex. Cotonou'))),
            const SizedBox(width: 8),
            FilledButton(
              onPressed: () {
                final value = _city.text.trim();
                if (value.isEmpty) return;
                setState(() {
                  _cities.add(value);
                  _city.clear();
                  _preview = null;
                });
              },
              style: FilledButton.styleFrom(minimumSize: const Size(0, 48)),
              child: const Text('Ajouter'),
            ),
          ]),
          if (_cities.isNotEmpty) ...[
            const SizedBox(height: 8),
            Wrap(spacing: 7, runSpacing: 7, children: _cities.map((value) => InputChip(label: Text(value), onDeleted: () { setState(() { _cities.remove(value); _preview = null; }); })).toList()),
          ],
        ]),
      );

  Widget _buildQualificationStep() => Column(children: [
        _SurfaceCard(
          title: 'Qualité de l’audience',
          subtitle: 'Ajustez la maturité des contacts avant de demander une validation.',
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const _FieldTitle('Maturité'),
            const SizedBox(height: 8),
            Wrap(spacing: 8, runSpacing: 8, children: [
              _FilterChoice(label: 'A · Chaud', selected: _classes.contains('A'), onTap: () => _toggle(_classes, 'A')),
              _FilterChoice(label: 'B · Tiède', selected: _classes.contains('B'), onTap: () => _toggle(_classes, 'B')),
              _FilterChoice(label: 'C · Froid', selected: _classes.contains('C'), onTap: () => _toggle(_classes, 'C')),
              _FilterChoice(label: 'D · Dormant', selected: _classes.contains('D'), onTap: () => _toggle(_classes, 'D')),
            ]),
            const SizedBox(height: 18),
            _ScoreSlider(label: 'Qualité minimale', value: _quality, onChanged: (value) => setState(() { _quality = value; _preview = null; })),
            const SizedBox(height: 12),
            _ScoreSlider(label: 'Intention minimale', value: _intent, onChanged: (value) => setState(() { _intent = value; _preview = null; })),
          ]),
        ),
        if (_preview != null) ...[
          const SizedBox(height: 12),
          _AudiencePreviewCard(preview: _preview!),
        ],
      ]);

  Widget _buildMessageStep() => Column(children: [
        if (_preview != null) _AudiencePreviewCard(preview: _preview!),
        if (_preview != null) const SizedBox(height: 12),
        _SurfaceCard(
          title: 'Préparer le message',
          subtitle: 'Le message sera contrôlé par un administrateur avant envoi.',
          child: Column(children: [
            TextField(controller: _name, textCapitalization: TextCapitalization.sentences, decoration: const InputDecoration(labelText: 'Nom de la diffusion', hintText: 'Promotion de juillet')),
            const SizedBox(height: 12),
            TextField(controller: _message, minLines: 4, maxLines: 6, textCapitalization: TextCapitalization.sentences, decoration: const InputDecoration(labelText: 'Message *', alignLabelWithHint: true)),
            const SizedBox(height: 6),
            const Align(alignment: Alignment.centerLeft, child: Text('Variables : {{display_name}}, {{ville}}, {{categorie_top}}', style: TextStyle(fontSize: 11.5, color: WaouhPalette.muted))),
            const SizedBox(height: 12),
            TextField(controller: _quota, keyboardType: TextInputType.number, decoration: InputDecoration(labelText: 'Quota demandé', helperText: _preview == null ? null : 'Maximum disponible : ${_preview!.total}')),
            const SizedBox(height: 12),
            ExpansionTile(
              tilePadding: EdgeInsets.zero,
              title: const Text('Média facultatif', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14)),
              subtitle: const Text('Ajoutez une URL image ou vidéo si nécessaire.', style: TextStyle(fontSize: 11.5)),
              children: [TextField(controller: _mediaUrl, keyboardType: TextInputType.url, decoration: const InputDecoration(labelText: 'URL du média'))],
            ),
          ]),
        ),
      ]);
}

class _ComposerFooter extends StatelessWidget {
  const _ComposerFooter({required this.step, required this.busy, required this.previewReady, required this.onBack, required this.onNext});
  final int step;
  final bool busy;
  final bool previewReady;
  final VoidCallback? onBack;
  final VoidCallback onNext;

  @override
  Widget build(BuildContext context) {
    final label = switch (step) {
      0 => 'Continuer',
      1 => previewReady ? 'Préparer le message' : 'Prévisualiser l’audience',
      _ => 'Soumettre à validation',
    };
    final icon = switch (step) {
      0 => Icons.arrow_forward_rounded,
      1 => previewReady ? Icons.arrow_forward_rounded : Icons.visibility_outlined,
      _ => Icons.send_rounded,
    };
    return SafeArea(
      top: false,
      child: Container(
        padding: const EdgeInsets.fromLTRB(16, 10, 16, 12),
        decoration: const BoxDecoration(color: Colors.white, border: Border(top: BorderSide(color: Color(0xFFE0EAE6)))),
        child: Row(children: [
          if (onBack != null) ...[
            OutlinedButton.icon(onPressed: busy ? null : onBack, icon: const Icon(Icons.arrow_back_rounded, size: 18), label: const Text('Retour')),
            const SizedBox(width: 10),
          ],
          Expanded(
            child: FilledButton.icon(
              onPressed: busy ? null : onNext,
              icon: busy ? const SizedBox(width: 17, height: 17, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : Icon(icon, size: 18),
              label: Text(label),
              style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(52)),
            ),
          ),
        ]),
      ),
    );
  }
}

class _RequestsTab extends StatelessWidget {
  const _RequestsTab({required this.data, required this.requests, required this.onChanged});
  final LiveDiffusionData data;
  final List<LiveAiDiffusionRequest> requests;
  final Future<void> Function() onChanged;

  Future<void> _cancel(BuildContext context, LiveAiDiffusionRequest request) async {
    final accepted = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Annuler la demande ?'),
        content: const Text('La demande restera visible dans votre historique mais ne pourra plus être approuvée.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Conserver')),
          FilledButton(onPressed: () => Navigator.pop(context, true), style: FilledButton.styleFrom(backgroundColor: WaouhPalette.red), child: const Text('Annuler')),
        ],
      ),
    );
    if (accepted != true) return;
    try {
      await data.cancelAiRequest(request.id);
      await onChanged();
      if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Demande annulée.')));
    } catch (error) {
      if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error.toString().replaceFirst('Bad state: ', ''))));
    }
  }

  @override
  Widget build(BuildContext context) => RefreshIndicator(
        onRefresh: onChanged,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 28),
          children: [
            const _InfoBanner(
              icon: Icons.verified_user_outlined,
              title: 'Validation avant diffusion',
              body: 'Chaque demande est contrôlée avant la création des envois. Les contacts désinscrits restent exclus.',
            ),
            const SizedBox(height: 16),
            if (requests.isEmpty)
              const _EmptyState(icon: Icons.pending_actions_rounded, title: 'Aucune demande', body: 'Vos demandes de diffusion apparaîtront ici après soumission.')
            else
              ...requests.map((request) => _RequestCard(request: request, onCancel: request.pending ? () => _cancel(context, request) : null)),
          ],
        ),
      );
}

class _RequestCard extends StatelessWidget {
  const _RequestCard({required this.request, this.onCancel});
  final LiveAiDiffusionRequest request;
  final VoidCallback? onCancel;

  @override
  Widget build(BuildContext context) {
    final color = _requestColor(request.status);
    final status = _requestLabel(request.status);
    final audience = request.audienceTotal > 0 ? request.audienceTotal : request.quotaRequested;
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Expanded(child: Text(request.campaignName?.isNotEmpty == true ? request.campaignName! : 'Diffusion IA', maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16))),
            _StatusTag(label: status, color: color),
          ]),
          const SizedBox(height: 7),
          Text(request.messageTemplate, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(color: WaouhPalette.muted, height: 1.3)),
          const SizedBox(height: 12),
          Row(children: [
            _Metric(icon: Icons.people_outline_rounded, value: '$audience', label: 'audience'),
            const SizedBox(width: 15),
            _Metric(icon: Icons.send_outlined, value: '${request.effectiveQuota}', label: 'quota'),
            const Spacer(),
            Text(_shortDate(request.createdAt), style: const TextStyle(fontSize: 11.5, color: WaouhPalette.muted)),
          ]),
          if (request.approved || request.completed) ...[
            const SizedBox(height: 12),
            LinearProgressIndicator(value: request.progress, minHeight: 7, borderRadius: BorderRadius.circular(99)),
            const SizedBox(height: 5),
            Text('${request.quotaConsumed}/${request.effectiveQuota} messages traités', style: const TextStyle(fontSize: 11.5, color: WaouhPalette.muted)),
          ],
          if ((request.reason ?? '').trim().isNotEmpty) ...[
            const SizedBox(height: 9),
            Text('Note : ${request.reason}', style: const TextStyle(fontSize: 11.5, color: WaouhPalette.muted, fontStyle: FontStyle.italic)),
          ],
          if (onCancel != null) ...[
            const SizedBox(height: 10),
            Align(alignment: Alignment.centerRight, child: TextButton.icon(onPressed: onCancel, icon: const Icon(Icons.close_rounded, size: 17), label: const Text('Annuler la demande'), style: TextButton.styleFrom(foregroundColor: WaouhPalette.red))),
          ],
        ]),
      ),
    );
  }
}

class _TrackingTab extends StatelessWidget {
  const _TrackingTab({required this.requests});
  final List<LiveAiDiffusionRequest> requests;

  @override
  Widget build(BuildContext context) {
    final waiting = requests.where((item) => item.pending).length;
    final approved = requests.where((item) => item.approved || item.completed).length;
    final sent = requests.fold<int>(0, (sum, item) => sum + item.quotaConsumed);
    final audience = requests.fold<int>(0, (sum, item) => sum + item.audienceTotal);
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 28),
      children: [
        _MetricsGrid(values: [
          ('En attente', waiting, Icons.pending_actions_rounded, WaouhPalette.orange),
          ('Autorisées', approved, Icons.verified_outlined, WaouhPalette.jade),
          ('Audience', audience, Icons.people_outline_rounded, WaouhPalette.deep),
          ('Traitées', sent, Icons.send_rounded, WaouhPalette.green),
        ]),
        const SizedBox(height: 18),
        const Text('État des dernières diffusions', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w900)),
        const SizedBox(height: 9),
        if (requests.isEmpty)
          const _EmptyState(icon: Icons.analytics_outlined, title: 'Aucune donnée à suivre', body: 'Les indicateurs apparaîtront après la première demande.')
        else
          ...requests.take(8).map((item) => Card(
                margin: const EdgeInsets.only(bottom: 8),
                child: ListTile(
                  leading: CircleAvatar(backgroundColor: _requestColor(item.status).withOpacity(.12), child: Icon(_statusIcon(item.status), color: _requestColor(item.status))),
                  title: Text(item.campaignName?.isNotEmpty == true ? item.campaignName! : 'Diffusion IA', maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w800)),
                  subtitle: Text('${_requestLabel(item.status)} · ${item.quotaConsumed}/${item.effectiveQuota} traités'),
                  trailing: Text(_shortDate(item.createdAt), style: const TextStyle(fontSize: 11.5, color: WaouhPalette.muted)),
                ),
              )),
      ],
    );
  }
}

class _StepIndicator extends StatelessWidget {
  const _StepIndicator({required this.step});
  final int step;

  @override
  Widget build(BuildContext context) {
    const labels = ['Ciblage', 'Qualité', 'Message'];
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text('Étape ${step + 1}/3', style: const TextStyle(fontWeight: FontWeight.w900, color: WaouhPalette.deep)),
      const SizedBox(height: 8),
      Row(children: List.generate(3, (index) => Expanded(child: Row(children: [
        Expanded(child: Container(height: 5, decoration: BoxDecoration(color: index <= step ? WaouhPalette.jade : WaouhPalette.line, borderRadius: BorderRadius.circular(99)))),
        if (index < 2) const SizedBox(width: 5),
      ])))),
      const SizedBox(height: 8),
      Row(children: labels.map((label) => Expanded(child: Text(label, textAlign: TextAlign.center, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: labels.indexOf(label) <= step ? WaouhPalette.jade : WaouhPalette.muted)))).toList()),
    ]);
  }
}

class _SurfaceCard extends StatelessWidget {
  const _SurfaceCard({required this.title, required this.subtitle, required this.child});
  final String title;
  final String subtitle;
  final Widget child;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(22), border: Border.all(color: const Color(0xFFD8E8E1))),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(title, style: const TextStyle(fontSize: 21, fontWeight: FontWeight.w900)),
          const SizedBox(height: 5),
          Text(subtitle, style: const TextStyle(color: WaouhPalette.muted, height: 1.35)),
          const SizedBox(height: 18),
          child,
        ]),
      );
}

class _FieldTitle extends StatelessWidget {
  const _FieldTitle(this.value);
  final String value;
  @override
  Widget build(BuildContext context) => Text(value.toUpperCase(), style: const TextStyle(fontSize: 11.5, letterSpacing: .5, fontWeight: FontWeight.w900, color: WaouhPalette.muted));
}

class _FilterChoice extends StatelessWidget {
  const _FilterChoice({required this.label, required this.selected, required this.onTap, this.icon});
  final String label;
  final bool selected;
  final VoidCallback onTap;
  final IconData? icon;

  @override
  Widget build(BuildContext context) => FilterChip(
        selected: selected,
        showCheckmark: false,
        onSelected: (_) => onTap(),
        avatar: selected ? const Icon(Icons.check_rounded, size: 16, color: WaouhPalette.jade) : (icon == null ? null : Icon(icon, size: 16, color: WaouhPalette.muted)),
        label: Text(label),
        selectedColor: const Color(0xFFE2F6EE),
        backgroundColor: Colors.white,
        side: BorderSide(color: selected ? const Color(0xFF97D9C3) : const Color(0xFFCCDAD5)),
        labelStyle: TextStyle(color: selected ? WaouhPalette.deep : const Color(0xFF40514B), fontWeight: FontWeight.w800, fontSize: 13),
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 6),
      );
}

class _ScoreSlider extends StatelessWidget {
  const _ScoreSlider({required this.label, required this.value, required this.onChanged});
  final String label;
  final double value;
  final ValueChanged<double> onChanged;

  @override
  Widget build(BuildContext context) => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [Text(label, style: const TextStyle(fontWeight: FontWeight.w900)), const Spacer(), Text('${value.round()}', style: const TextStyle(fontWeight: FontWeight.w900, color: WaouhPalette.jade))]),
        Slider(value: value, min: 0, max: 100, divisions: 20, label: '${value.round()}', onChanged: onChanged),
      ]);
}

class _AudiencePreviewCard extends StatelessWidget {
  const _AudiencePreviewCard({required this.preview});
  final LiveDiffusionAudiencePreview preview;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(color: const Color(0xFFEAF9F2), border: Border.all(color: const Color(0xFFC5EAD8)), borderRadius: BorderRadius.circular(18)),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Container(width: 42, height: 42, decoration: const BoxDecoration(color: Color(0xFF08756A), shape: BoxShape.circle), child: const Icon(Icons.people_alt_outlined, color: Colors.white)),
            const SizedBox(width: 10),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('${preview.total} contacts estimés', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: WaouhPalette.deep)),
              const Text('Aucun numéro complet n’est exposé.', style: TextStyle(fontSize: 11.5, color: WaouhPalette.muted)),
            ])),
          ]),
          if (preview.breakdown.isNotEmpty) ...[
            const SizedBox(height: 14),
            Wrap(spacing: 8, runSpacing: 8, children: preview.breakdown.entries.map((entry) => _BreakdownPill(label: '${entry.key} · ${entry.value}')).toList()),
          ],
          if (preview.sample.isNotEmpty) ...[
            const SizedBox(height: 12),
            Text('Exemple masqué : ${preview.sample.first['phone_masked'] ?? '—'}', style: const TextStyle(fontSize: 11.5, color: WaouhPalette.muted, fontWeight: FontWeight.w700)),
          ],
        ]),
      );
}

class _BreakdownPill extends StatelessWidget {
  const _BreakdownPill({required this.label});
  final String label;
  @override
  Widget build(BuildContext context) => Container(padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5), decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(99), border: Border.all(color: const Color(0xFFC9E8DB))), child: Text(label, style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w800, color: WaouhPalette.jade)));
}

class _ReviewRow extends StatelessWidget {
  const _ReviewRow({required this.label, required this.value});
  final String label;
  final String value;
  @override
  Widget build(BuildContext context) => Padding(padding: const EdgeInsets.symmetric(vertical: 5), child: Row(children: [Text(label, style: const TextStyle(color: WaouhPalette.muted)), const Spacer(), Text(value, style: const TextStyle(fontWeight: FontWeight.w900))]));
}

class _InfoBanner extends StatelessWidget {
  const _InfoBanner({required this.icon, required this.title, required this.body});
  final IconData icon;
  final String title;
  final String body;
  @override
  Widget build(BuildContext context) => Container(padding: const EdgeInsets.all(14), decoration: BoxDecoration(color: const Color(0xFFFFF7E5), border: Border.all(color: const Color(0xFFF1DCAB)), borderRadius: BorderRadius.circular(16)), child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [Icon(icon, color: WaouhPalette.orange), const SizedBox(width: 10), Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(title, style: const TextStyle(fontWeight: FontWeight.w900)), const SizedBox(height: 3), Text(body, style: const TextStyle(fontSize: 12, color: WaouhPalette.muted, height: 1.3))]))]));
}

class _StatusTag extends StatelessWidget {
  const _StatusTag({required this.label, required this.color});
  final String label;
  final Color color;
  @override
  Widget build(BuildContext context) => Container(padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5), decoration: BoxDecoration(color: color.withOpacity(.12), borderRadius: BorderRadius.circular(99)), child: Text(label, style: TextStyle(fontSize: 10.5, color: color, fontWeight: FontWeight.w900)));
}

class _Metric extends StatelessWidget {
  const _Metric({required this.icon, required this.value, required this.label});
  final IconData icon;
  final String value;
  final String label;
  @override
  Widget build(BuildContext context) => Row(mainAxisSize: MainAxisSize.min, children: [Icon(icon, size: 15, color: WaouhPalette.jade), const SizedBox(width: 4), Text('$value ', style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 12)), Text(label, style: const TextStyle(fontSize: 11.5, color: WaouhPalette.muted))]);
}

class _MetricsGrid extends StatelessWidget {
  const _MetricsGrid({required this.values});
  final List<(String, int, IconData, Color)> values;
  @override
  Widget build(BuildContext context) => GridView.count(
        shrinkWrap: true,
        crossAxisCount: 2,
        childAspectRatio: 1.75,
        crossAxisSpacing: 10,
        mainAxisSpacing: 10,
        physics: const NeverScrollableScrollPhysics(),
        children: values.map((item) => Container(padding: const EdgeInsets.all(13), decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), border: Border.all(color: const Color(0xFFE0EAE6))), child: Row(children: [Container(width: 34, height: 34, decoration: BoxDecoration(color: item.$4.withOpacity(.12), shape: BoxShape.circle), child: Icon(item.$3, color: item.$4, size: 18)), const SizedBox(width: 9), Expanded(child: Column(mainAxisAlignment: MainAxisAlignment.center, crossAxisAlignment: CrossAxisAlignment.start, children: [Text('${item.$2}', style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 20)), Text(item.$1, style: const TextStyle(fontSize: 11.5, color: WaouhPalette.muted))]))]))).toList(),
      );
}

class _EmptyState extends StatelessWidget {
  const _EmptyState({required this.icon, required this.title, required this.body});
  final IconData icon;
  final String title;
  final String body;
  @override
  Widget build(BuildContext context) => Padding(padding: const EdgeInsets.only(top: 56), child: Column(children: [Icon(icon, size: 52, color: WaouhPalette.muted), const SizedBox(height: 13), Text(title, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900)), const SizedBox(height: 7), Text(body, textAlign: TextAlign.center, style: const TextStyle(color: WaouhPalette.muted, height: 1.35))]));
}

class _LoadFailure extends StatelessWidget {
  const _LoadFailure({required this.onRetry, required this.error});
  final VoidCallback onRetry;
  final String error;
  @override
  Widget build(BuildContext context) => Center(child: Padding(padding: const EdgeInsets.all(24), child: Column(mainAxisSize: MainAxisSize.min, children: [const Icon(Icons.cloud_off_rounded, size: 52, color: WaouhPalette.muted), const SizedBox(height: 12), const Text('Diffusion indisponible', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900)), const SizedBox(height: 7), Text(error.replaceFirst('Bad state: ', ''), maxLines: 3, overflow: TextOverflow.ellipsis, textAlign: TextAlign.center, style: const TextStyle(color: WaouhPalette.muted)), const SizedBox(height: 15), FilledButton.icon(onPressed: onRetry, icon: const Icon(Icons.refresh_rounded), label: const Text('Réessayer'))])));
}

Color _requestColor(String status) => switch (status) {
      'approved' => WaouhPalette.jade,
      'done' => WaouhPalette.green,
      'rejected' => WaouhPalette.red,
      'cancelled' => WaouhPalette.muted,
      _ => WaouhPalette.orange,
    };

String _requestLabel(String status) => switch (status) {
      'approved' => 'Approuvée',
      'done' => 'Terminée',
      'rejected' => 'Rejetée',
      'cancelled' => 'Annulée',
      _ => 'En attente',
    };

IconData _statusIcon(String status) => switch (status) {
      'approved' => Icons.verified_outlined,
      'done' => Icons.check_circle_outline_rounded,
      'rejected' => Icons.cancel_outlined,
      'cancelled' => Icons.remove_circle_outline_rounded,
      _ => Icons.pending_actions_rounded,
    };

String _shortDate(DateTime value) {
  final local = value.toLocal();
  final now = DateTime.now();
  if (local.year == now.year && local.month == now.month && local.day == now.day) {
    return '${local.hour.toString().padLeft(2, '0')}:${local.minute.toString().padLeft(2, '0')}';
  }
  return '${local.day.toString().padLeft(2, '0')}/${local.month.toString().padLeft(2, '0')}';
}
