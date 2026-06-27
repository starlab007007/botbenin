// Modernized versions of the Diffusion, WhatsApp IA (WAHA sessions), and
// Bots (knowledge bases) screens. Same business logic/Edge Functions as the
// legacy main.dart screens, but with the WAOUH design system and — for
// Diffusion — a real campaign list backed by `wa_campaigns.stats` instead of
// the previous hard-coded bar chart.
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../main.dart' as legacy;
import 'live_theme.dart';
import 'live_visuals.dart';
import 'live_widgets.dart';

class LiveDiffusionScreen extends StatefulWidget {
  const LiveDiffusionScreen({super.key});
  @override
  State<LiveDiffusionScreen> createState() => _LiveDiffusionScreenState();
}

class _LiveDiffusionScreenState extends State<LiveDiffusionScreen> {
  final name = TextEditingController();
  final message = TextEditingController();
  final audience = TextEditingController(text: 'clients');
  bool aiVariants = true;
  bool launching = false;

  @override
  void dispose() {
    name.dispose();
    message.dispose();
    audience.dispose();
    super.dispose();
  }

  Stream<List<Map<String, dynamic>>> _campaigns() {
    return legacy.supabase
        .from('wa_campaigns')
        .stream(primaryKey: ['id'])
        .order('created_at', ascending: false)
        .limit(20)
        .map((rows) => rows.cast<Map<String, dynamic>>());
  }

  Future<void> _launch() async {
    if (name.text.trim().isEmpty || message.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Nom et message requis.')),
      );
      return;
    }
    setState(() => launching = true);
    try {
      await legacy.supabase.functions.invoke('whatsapp-diffusion-enqueue', body: {
        'name': name.text.trim(),
        'message': message.text.trim(),
        'audience': audience.text.trim(),
        'ai_variants': aiVariants,
        'source': 'flutter_native',
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('🚀 Campagne envoyée à la file de diffusion.')),
        );
        name.clear();
        message.clear();
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erreur : $error')));
      }
    } finally {
      if (mounted) setState(() => launching = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: WaouhPalette.pearl,
      appBar: const LiveHeader(title: 'Diffusion WhatsApp', subtitle: 'Campagnes & suivi en direct'),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(WaouhSpace.lg, WaouhSpace.lg, WaouhSpace.lg, WaouhSpace.xxl),
        children: [
          Container(
            padding: const EdgeInsets.all(WaouhSpace.lg),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(WaouhRadius.card),
              boxShadow: WaouhShadows.card,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Nouvelle campagne', style: WaouhText.h1),
                const SizedBox(height: WaouhSpace.lg),
                _label('Nom de la campagne'),
                TextField(controller: name, decoration: const InputDecoration(hintText: 'Promo Tabaski')),
                const SizedBox(height: WaouhSpace.md),
                _label('Message'),
                TextField(
                  controller: message,
                  minLines: 4,
                  maxLines: 6,
                  decoration: const InputDecoration(hintText: 'Bonjour {prenom}, ...'),
                ),
                const SizedBox(height: WaouhSpace.md),
                _label('Audience / tag'),
                TextField(controller: audience, decoration: const InputDecoration(hintText: 'clients, prospects...')),
                const SizedBox(height: WaouhSpace.sm),
                Container(
                  decoration: BoxDecoration(
                    color: WaouhPalette.pearl,
                    borderRadius: BorderRadius.circular(WaouhRadius.control),
                  ),
                  child: SwitchListTile(
                    value: aiVariants,
                    onChanged: (value) => setState(() => aiVariants = value),
                    title: const Text('Variantes IA anti-spam', style: WaouhText.bodyStrong),
                    subtitle: const Text('Reformule chaque message pour éviter les blocages', style: WaouhText.caption),
                  ),
                ),
                const SizedBox(height: WaouhSpace.lg),
                SizedBox(
                  height: 52,
                  width: double.infinity,
                  child: FilledButton.icon(
                    onPressed: launching ? null : _launch,
                    icon: launching
                        ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : const Icon(Icons.play_arrow_rounded),
                    label: Text(launching ? 'Lancement...' : 'Créer & lancer maintenant'),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: WaouhSpace.xl),
          const SectionEyebrow(label: 'Campagnes récentes'),
          StreamBuilder<List<Map<String, dynamic>>>(
            stream: _campaigns(),
            builder: (context, snapshot) {
              final campaigns = snapshot.data ?? const [];
              if (campaigns.isEmpty) {
                return const WaouhEmptyPanel(
                  icon: Icons.campaign_outlined,
                  title: 'Aucune campagne',
                  message: 'Vos campagnes envoyées apparaîtront ici avec leur progression en direct.',
                );
              }
              return Column(
                children: campaigns.map((row) => _CampaignCard(row: row)).toList(),
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _label(String text) => Padding(
        padding: const EdgeInsets.only(bottom: WaouhSpace.xs),
        child: Text(text, style: WaouhText.bodyStrong.copyWith(fontSize: 13.5)),
      );
}

class _CampaignCard extends StatelessWidget {
  const _CampaignCard({required this.row});
  final Map<String, dynamic> row;

  @override
  Widget build(BuildContext context) {
    final status = (row['status'] ?? 'draft').toString();
    final stats = row['stats'] is Map ? Map<String, dynamic>.from(row['stats'] as Map) : <String, dynamic>{};
    final total = (stats['total'] as num?)?.toInt() ?? 0;
    final sent = (stats['sent'] as num?)?.toInt() ?? 0;
    final failed = (stats['failed'] as num?)?.toInt() ?? 0;
    final progress = total == 0 ? 0.0 : (sent / total).clamp(0, 1).toDouble();
    final statusColor = switch (status) {
      'running' => WaouhPalette.jade,
      'completed' => WaouhPalette.green,
      'failed' => WaouhPalette.red,
      'paused' => WaouhPalette.orange,
      _ => WaouhPalette.muted,
    };

    return Container(
      margin: const EdgeInsets.only(bottom: WaouhSpace.md),
      padding: const EdgeInsets.all(WaouhSpace.md),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(WaouhRadius.card),
        boxShadow: WaouhShadows.card,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [
            Expanded(child: Text((row['name'] ?? 'Sans nom').toString(), style: WaouhText.h3, overflow: TextOverflow.ellipsis)),
            WaouhPill(label: status, background: statusColor.withOpacity(0.14), foreground: statusColor),
          ]),
          const SizedBox(height: WaouhSpace.sm),
          ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: LinearProgressIndicator(
              value: progress,
              minHeight: 7,
              backgroundColor: WaouhPalette.line,
              color: WaouhPalette.green,
            ),
          ),
          const SizedBox(height: WaouhSpace.xs),
          Text(
            total == 0 ? 'En préparation...' : '$sent envoyés sur $total${failed > 0 ? ' · $failed échecs' : ''}',
            style: WaouhText.caption,
          ),
        ],
      ),
    );
  }
}

class LiveWhatsAppIaScreen extends StatefulWidget {
  const LiveWhatsAppIaScreen({super.key});
  @override
  State<LiveWhatsAppIaScreen> createState() => _LiveWhatsAppIaScreenState();
}

class _LiveWhatsAppIaScreenState extends State<LiveWhatsAppIaScreen> {
  Future<List<legacy.WaSession>>? future;
  bool refreshing = false;

  @override
  void initState() {
    super.initState();
    future = _loadSessions();
  }

  Future<List<legacy.WaSession>> _loadSessions() async {
    try {
      final result = await legacy.supabase.functions
          .invoke('waha-dashboard-proxy', body: {'action': 'sessions'});
      final data = result.data;
      final list = data is List
          ? data
          : (data is Map ? (data['sessions'] as List? ?? const []) : const []);
      return list
          .map((e) => legacy.WaSession.fromJson(Map<String, dynamic>.from(e as Map)))
          .toList();
    } catch (_) {
      return const [legacy.WaSession(id: 'default', name: 'default', status: 'DISCONNECTED')];
    }
  }

  Future<void> _refresh() async {
    setState(() => refreshing = true);
    final next = _loadSessions();
    setState(() => future = next);
    await next;
    if (mounted) setState(() => refreshing = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: WaouhPalette.pearl,
      appBar: const LiveHeader(title: 'WhatsApp IA', subtitle: 'WAHA · Sessions connectées'),
      body: FutureBuilder<List<legacy.WaSession>>(
        future: future,
        builder: (_, snapshot) {
          final sessions = snapshot.data ?? const <legacy.WaSession>[];
          return ListView(
            padding: const EdgeInsets.fromLTRB(WaouhSpace.lg, WaouhSpace.lg, WaouhSpace.lg, WaouhSpace.xxl),
            children: [
              BrandHeroCard(
                child: Row(
                  children: [
                    Container(
                      width: 52,
                      height: 52,
                      decoration: BoxDecoration(color: WaouhPalette.onDarkSurface, shape: BoxShape.circle),
                      child: const Icon(Icons.dns_rounded, color: Colors.white, size: 24),
                    ),
                    const SizedBox(width: WaouhSpace.md),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Gestion serveur WAHA', style: WaouhText.onDark(WaouhText.h3)),
                          Text(
                            'Connectez une session QR, surveillez l\'état et associez-la aux bots.',
                            style: WaouhText.onDarkMuted(WaouhText.caption),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: WaouhSpace.lg),
              ...sessions.map((session) => Container(
                    margin: const EdgeInsets.only(bottom: WaouhSpace.sm),
                    padding: const EdgeInsets.all(WaouhSpace.md),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(WaouhRadius.card),
                      boxShadow: WaouhShadows.card,
                    ),
                    child: Row(children: [
                      Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                          color: session.status == 'WORKING' ? WaouhPalette.mint : WaouhPalette.orangeTint,
                          shape: BoxShape.circle,
                        ),
                        child: Icon(
                          Icons.phone_iphone_rounded,
                          color: session.status == 'WORKING' ? WaouhPalette.jade : WaouhPalette.orange,
                        ),
                      ),
                      const SizedBox(width: WaouhSpace.md),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(session.name, style: WaouhText.bodyStrong),
                            Text(
                              session.phone ?? 'Scan depuis WhatsApp > Appareils connectés',
                              style: WaouhText.caption,
                            ),
                          ],
                        ),
                      ),
                      WaouhPill(
                        label: session.status ?? 'UNKNOWN',
                        background: session.status == 'WORKING' ? WaouhPalette.mint : WaouhPalette.line,
                        foreground: session.status == 'WORKING' ? WaouhPalette.jade : WaouhPalette.muted,
                      ),
                    ]),
                  )),
              const SizedBox(height: WaouhSpace.sm),
              SizedBox(
                height: 50,
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: refreshing ? null : _refresh,
                  icon: refreshing
                      ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Icon(Icons.qr_code_rounded),
                  label: Text(refreshing ? 'Actualisation...' : 'Actualiser / afficher QR'),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

class LiveBotsScreen extends StatelessWidget {
  const LiveBotsScreen({super.key});

  Future<void> _createBase(BuildContext context) async {
    try {
      await legacy.supabase.from('knowledge_bases').insert({
        'name': 'Nouvelle base Flutter',
        'description': 'Base créée depuis l\'application Flutter native.',
        'completion': 0,
      });
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('✅ Base de connaissances créée.')),
        );
      }
    } catch (error) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Création impossible : $error')));
      }
    }
  }

  Stream<List<legacy.KnowledgeBase>> _bases() {
    return legacy.supabase
        .from('knowledge_bases')
        .stream(primaryKey: ['id'])
        .order('updated_at', ascending: false)
        .map((rows) => rows.map(legacy.KnowledgeBase.fromJson).toList());
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: WaouhPalette.pearl,
      appBar: const LiveHeader(title: 'Bots', subtitle: 'Bases de connaissances'),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: WaouhPalette.green,
        onPressed: () => _createBase(context),
        icon: const Icon(Icons.add_rounded),
        label: const Text('Nouvelle base'),
      ),
      body: StreamBuilder<List<legacy.KnowledgeBase>>(
        stream: _bases(),
        builder: (_, snapshot) {
          final list = snapshot.data ?? const <legacy.KnowledgeBase>[];
          return ListView(
            padding: const EdgeInsets.fromLTRB(WaouhSpace.lg, WaouhSpace.lg, WaouhSpace.lg, 100),
            children: [
              BrandHeroCard(
                gradient: WaouhGradients.announce,
                child: Row(
                  children: [
                    Container(
                      width: 52,
                      height: 52,
                      decoration: BoxDecoration(color: Colors.white.withOpacity(0.22), shape: BoxShape.circle),
                      child: const Icon(Icons.school_rounded, color: Colors.white, size: 24),
                    ),
                    const SizedBox(width: WaouhSpace.md),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Assistant pas à pas', style: WaouhText.onDark(WaouhText.h3)),
                          Text(
                            'Créez une base, ajoutez tables/champs, puis connectez-la à WhatsApp IA.',
                            style: WaouhText.onDarkMuted(WaouhText.caption),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: WaouhSpace.lg),
              if (list.isEmpty)
                const WaouhEmptyPanel(
                  icon: Icons.smart_toy_outlined,
                  title: 'Aucune base',
                  message: 'Créez votre première base de connaissances pour entraîner votre bot.',
                )
              else
                ...list.map((kb) => Container(
                      margin: const EdgeInsets.only(bottom: WaouhSpace.md),
                      padding: const EdgeInsets.all(WaouhSpace.md),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(WaouhRadius.card),
                        boxShadow: WaouhShadows.card,
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(kb.name, style: WaouhText.h3),
                          if (kb.description != null)
                            Padding(
                              padding: const EdgeInsets.only(top: 2),
                              child: Text(kb.description!, style: WaouhText.caption),
                            ),
                          const SizedBox(height: WaouhSpace.sm),
                          ClipRRect(
                            borderRadius: BorderRadius.circular(8),
                            child: LinearProgressIndicator(
                              value: (kb.completion / 100).clamp(0, 1).toDouble(),
                              minHeight: 7,
                              backgroundColor: WaouhPalette.line,
                              color: WaouhPalette.jade,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text('${kb.completion}% complet', style: WaouhText.caption),
                        ],
                      ),
                    )),
            ],
          );
        },
      ),
    );
  }
}
