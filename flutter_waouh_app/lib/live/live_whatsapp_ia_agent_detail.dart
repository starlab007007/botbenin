import 'package:flutter/material.dart';

import 'live_whatsapp_ia_agent_models.dart';
import 'live_whatsapp_ia_agent_repository.dart';
import 'live_whatsapp_ia_models.dart';

const _detailGreen = Color(0xFF08756A);
const _detailInk = Color(0xFF16231F);
const _detailMuted = Color(0xFF62756D);

class LiveWhatsAppIaAgentDetailScreen extends StatefulWidget {
  const LiveWhatsAppIaAgentDetailScreen({
    super.key,
    required this.repository,
    required this.agent,
    required this.sessions,
  });

  final LiveWhatsAppAiAgentRepository repository;
  final LiveWhatsAppAiAgent agent;
  final List<LiveWhatsAppSession> sessions;

  @override
  State<LiveWhatsAppIaAgentDetailScreen> createState() =>
      _LiveWhatsAppIaAgentDetailScreenState();
}

class _LiveWhatsAppIaAgentDetailScreenState
    extends State<LiveWhatsAppIaAgentDetailScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabs = TabController(length: 4, vsync: this);
  late LiveWhatsAppAiAgent _agent = widget.agent;
  bool _busy = false;

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

  Future<void> _toggleStatus() async {
    if (_agent.wahaSessionName == null) return;
    setState(() => _busy = true);
    try {
      final next = _agent.isActive ? 'paused' : 'active';
      await widget.repository.setStatus(_agent, next);
      if (mounted) setState(() => _agent = _agent.copyWith(status: next));
    } catch (error) {
      _toast('$error');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _toast(String text) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      behavior: SnackBarBehavior.floating,
      content: Text(text.replaceFirst('LiveWhatsAppIaException: ', '')),
    ));
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        backgroundColor: const Color(0xFFF7FAF8),
        appBar: AppBar(
          backgroundColor: Colors.white,
          surfaceTintColor: Colors.white,
          foregroundColor: _detailInk,
          title: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Text(_agent.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900)),
              Text(_agent.isActive ? 'Actif' : _agent.isPaused ? 'En pause' : 'Brouillon', style: const TextStyle(color: _detailMuted, fontSize: 12, fontWeight: FontWeight.w700)),
            ],
          ),
          actions: <Widget>[
            if (_agent.wahaSessionName != null)
              IconButton(
                tooltip: _agent.isActive ? 'Mettre en pause' : 'Activer',
                onPressed: _busy ? null : _toggleStatus,
                icon: Icon(_agent.isActive ? Icons.pause_circle_outline_rounded : Icons.play_circle_outline_rounded),
              ),
          ],
          bottom: TabBar(
            controller: _tabs,
            isScrollable: true,
            tabAlignment: TabAlignment.start,
            labelColor: _detailGreen,
            unselectedLabelColor: _detailMuted,
            indicatorColor: _detailGreen,
            tabs: const <Widget>[
              Tab(text: 'Résumé'),
              Tab(text: 'Test'),
              Tab(text: 'Direct'),
              Tab(text: 'Stats'),
            ],
          ),
        ),
        body: TabBarView(
          controller: _tabs,
          children: <Widget>[
            _SummaryTab(agent: _agent),
            _SandboxTab(repository: widget.repository, agent: _agent),
            _DirectTab(repository: widget.repository, agent: _agent),
            _StatsTab(repository: widget.repository, agent: _agent),
          ],
        ),
      );
}

class _SummaryTab extends StatelessWidget {
  const _SummaryTab({required this.agent});
  final LiveWhatsAppAiAgent agent;

  @override
  Widget build(BuildContext context) => ListView(
        padding: const EdgeInsets.all(16),
        children: <Widget>[
          _HeroCard(agent: agent),
          const SizedBox(height: 12),
          _InfoCard(
            icon: Icons.forum_outlined,
            title: 'Ligne WhatsApp',
            child: Text(
              agent.wahaSessionName == null
                  ? 'Brouillon · aucune ligne liée.'
                  : 'Lié à ${agent.wahaSessionName}.',
              style: const TextStyle(color: _detailMuted, height: 1.3),
            ),
          ),
          const SizedBox(height: 10),
          _InfoCard(
            icon: Icons.person_outline_rounded,
            title: 'Style',
            child: Text('${agent.personaName} · ${agent.tone}', style: const TextStyle(color: _detailMuted)),
          ),
          const SizedBox(height: 10),
          _InfoCard(
            icon: Icons.auto_awesome_rounded,
            title: 'Missions',
            child: Wrap(
              spacing: 7,
              runSpacing: 7,
              children: agent.capabilities.entries
                  .where((item) => item.value)
                  .map((item) => _Tag(_capability(item.key)))
                  .toList(),
            ),
          ),
        ],
      );
}

class _SandboxTab extends StatefulWidget {
  const _SandboxTab({required this.repository, required this.agent});
  final LiveWhatsAppAiAgentRepository repository;
  final LiveWhatsAppAiAgent agent;
  @override
  State<_SandboxTab> createState() => _SandboxTabState();
}

class _SandboxTabState extends State<_SandboxTab> {
  final _input = TextEditingController();
  final List<LiveAgentMessage> _messages = <LiveAgentMessage>[];
  bool _busy = false;

  @override
  void dispose() { _input.dispose(); super.dispose(); }

  Future<void> _send() async {
    final text = _input.text.trim();
    if (text.isEmpty) return;
    setState(() { _messages.add(LiveAgentMessage(role: 'user', content: text)); _input.clear(); _busy = true; });
    try {
      final reply = await widget.repository.sandbox(agent: widget.agent, message: text, history: _messages);
      if (mounted) setState(() => _messages.add(LiveAgentMessage(role: 'assistant', content: reply)));
    } catch (error) {
      if (mounted) setState(() => _messages.add(LiveAgentMessage(role: 'assistant', content: '⚠️ ${error.toString().replaceFirst('LiveWhatsAppIaException: ', '')}')));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Column(
        children: <Widget>[
          const Padding(
            padding: EdgeInsets.fromLTRB(16, 14, 16, 0),
            child: _Notice('Test privé : aucun message WhatsApp réel n’est envoyé.'),
          ),
          Expanded(
            child: _messages.isEmpty
                ? const Center(child: Text('Essayez : « Quel est le prix ? »', style: TextStyle(color: _detailMuted)))
                : ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _messages.length,
                    itemBuilder: (_, index) => _Bubble(message: _messages[index]),
                  ),
          ),
          SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
              child: TextField(
                controller: _input,
                onSubmitted: (_) => _send(),
                decoration: _field('Écrivez comme un client…').copyWith(
                  suffixIcon: IconButton(
                    onPressed: _busy ? null : _send,
                    icon: _busy ? const _Loader() : const Icon(Icons.send_rounded, color: _detailGreen),
                  ),
                ),
              ),
            ),
          ),
        ],
      );
}

class _DirectTab extends StatefulWidget {
  const _DirectTab({required this.repository, required this.agent});
  final LiveWhatsAppAiAgentRepository repository;
  final LiveWhatsAppAiAgent agent;
  @override
  State<_DirectTab> createState() => _DirectTabState();
}

class _DirectTabState extends State<_DirectTab> {
  List<LiveAgentConversation> _items = const <LiveAgentConversation>[];
  bool _loading = true;
  String? _error;

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final values = await widget.repository.conversations(widget.agent.id);
      if (mounted) setState(() => _items = values);
    } catch (error) {
      if (mounted) setState(() => _error = '$error');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _open(LiveAgentConversation conversation) async {
    final changed = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _ConversationSheet(repository: widget.repository, agent: widget.agent, conversation: conversation),
    );
    if (changed == true) await _load();
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Center(child: CircularProgressIndicator());
    if (_error != null) return Center(child: Padding(padding: const EdgeInsets.all(24), child: Text(_error!, textAlign: TextAlign.center)));
    if (_items.isEmpty) return const Center(child: Padding(padding: EdgeInsets.all(30), child: Text('Aucune conversation pour le moment.', style: TextStyle(color: _detailMuted))));
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: _items.length,
        separatorBuilder: (_, __) => const SizedBox(height: 8),
        itemBuilder: (_, index) {
          final item = _items[index];
          final last = item.messages.isEmpty ? '' : item.messages.last.content;
          return Material(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            child: ListTile(
              onTap: () => _open(item),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16), side: const BorderSide(color: Color(0xFFDDEBE4))),
              leading: CircleAvatar(backgroundColor: const Color(0xFFEAF9F2), foregroundColor: _detailGreen, child: Text(item.displayName.substring(0, 1).toUpperCase())),
              title: Text(item.displayName, style: const TextStyle(fontWeight: FontWeight.w900)),
              subtitle: Text(last, maxLines: 1, overflow: TextOverflow.ellipsis),
              trailing: item.humanTakeover || item.needsHandoff ? const Icon(Icons.person_rounded, color: Color(0xFFD08B12)) : const Icon(Icons.chevron_right_rounded),
            ),
          );
        },
      ),
    );
  }
}

class _StatsTab extends StatefulWidget {
  const _StatsTab({required this.repository, required this.agent});
  final LiveWhatsAppAiAgentRepository repository;
  final LiveWhatsAppAiAgent agent;
  @override
  State<_StatsTab> createState() => _StatsTabState();
}

class _StatsTabState extends State<_StatsTab> {
  Map<String, dynamic>? _stats;
  String? _error;
  bool _loading = true;
  final _question = TextEditingController();
  String? _answer;

  @override
  void initState() { super.initState(); _load(); }
  @override
  void dispose() { _question.dispose(); super.dispose(); }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final result = await widget.repository.insights(widget.agent.id);
      if (mounted) setState(() => _stats = result);
    } catch (error) {
      if (mounted) setState(() => _error = '$error');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _ask() async {
    final question = _question.text.trim();
    if (question.isEmpty) return;
    setState(() => _answer = null);
    try {
      final answer = await widget.repository.askInsights(widget.agent.id, question);
      if (mounted) setState(() => _answer = answer);
    } catch (error) {
      if (mounted) setState(() => _answer = '$error');
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Center(child: CircularProgressIndicator());
    if (_error != null) return Center(child: Padding(padding: const EdgeInsets.all(24), child: Text(_error!, textAlign: TextAlign.center)));
    final stats = _stats ?? const <String, dynamic>{};
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: <Widget>[
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: <Widget>[
              _Kpi('${stats['total_conversations'] ?? 0}', 'conversations'),
              _Kpi('${stats['total_messages'] ?? 0}', 'messages'),
              _Kpi('${stats['unique_contacts'] ?? 0}', 'clients'),
              _Kpi('${stats['total_handoffs'] ?? 0}', 'humains'),
            ],
          ),
          const SizedBox(height: 16),
          _ListCard(title: 'Mots demandés', values: _labels(stats['top_keywords'], 'word')),
          const SizedBox(height: 10),
          _ListCard(title: 'Produits demandés', values: _labels(stats['top_products'], 'name')),
          const SizedBox(height: 16),
          const Text('Question rapide', style: TextStyle(fontWeight: FontWeight.w900, color: _detailInk)),
          const SizedBox(height: 8),
          TextField(
            controller: _question,
            onSubmitted: (_) => _ask(),
            decoration: _field('Ex. Quelle demande revient le plus ?').copyWith(
              suffixIcon: IconButton(onPressed: _ask, icon: const Icon(Icons.auto_awesome_rounded, color: _detailGreen)),
            ),
          ),
          if (_answer != null) ...<Widget>[
            const SizedBox(height: 10),
            _Notice(_answer!),
          ],
        ],
      ),
    );
  }

  List<String> _labels(dynamic source, String key) {
    if (source is! List) return const <String>[];
    return source.whereType<Map>().map((item) => '${item[key] ?? ''}').where((item) => item.isNotEmpty).toList();
  }
}

class _ConversationSheet extends StatefulWidget {
  const _ConversationSheet({required this.repository, required this.agent, required this.conversation});
  final LiveWhatsAppAiAgentRepository repository;
  final LiveWhatsAppAiAgent agent;
  final LiveAgentConversation conversation;
  @override
  State<_ConversationSheet> createState() => _ConversationSheetState();
}

class _ConversationSheetState extends State<_ConversationSheet> {
  final _input = TextEditingController();
  bool _busy = false;
  late bool _takeover = widget.conversation.humanTakeover;

  @override
  void dispose() { _input.dispose(); super.dispose(); }

  Future<void> _mode(String value) async {
    setState(() => _busy = true);
    try {
      await widget.repository.manual(agent: widget.agent, phone: widget.conversation.phone, mode: value);
      if (!mounted) return;
      setState(() => _takeover = value == 'takeover');
      Navigator.pop(context, true);
    } catch (error) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$error')));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _send() async {
    final message = _input.text.trim();
    if (message.isEmpty) return;
    setState(() => _busy = true);
    try {
      await widget.repository.manual(agent: widget.agent, phone: widget.conversation.phone, message: message, mode: 'takeover');
      if (mounted) Navigator.pop(context, true);
    } catch (error) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$error')));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => SafeArea(
    top: false,
    child: Container(
      height: MediaQuery.sizeOf(context).height * .84,
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
      decoration: const BoxDecoration(color: Colors.white, borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      child: Column(children: <Widget>[
        Container(width: 42, height: 5, decoration: BoxDecoration(color: const Color(0xFFC9D8D2), borderRadius: BorderRadius.circular(99))),
        const SizedBox(height: 12),
        Row(children: <Widget>[
          Expanded(child: Text(widget.conversation.displayName, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w900))),
          TextButton.icon(onPressed: _busy ? null : () => _mode(_takeover ? 'release' : 'takeover'), icon: Icon(_takeover ? Icons.smart_toy_outlined : Icons.person_rounded), label: Text(_takeover ? 'Rendre au bot' : 'Prendre la main')),
        ]),
        Expanded(child: ListView(
          children: widget.conversation.messages.map((message) => _Bubble(message: message)).toList(),
        )),
        TextField(
          controller: _input,
          onSubmitted: (_) => _send(),
          decoration: _field('Répondre au client…').copyWith(suffixIcon: IconButton(onPressed: _busy ? null : _send, icon: const Icon(Icons.send_rounded, color: _detailGreen))),
        ),
      ]),
    ),
  );
}

class _HeroCard extends StatelessWidget {
  const _HeroCard({required this.agent});
  final LiveWhatsAppAiAgent agent;
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(color: const Color(0xFF0C6D5E), borderRadius: BorderRadius.circular(20)),
    child: Row(children: <Widget>[
      Container(width: 48, height: 48, decoration: BoxDecoration(color: Colors.white.withValues(alpha: .15), borderRadius: BorderRadius.circular(15)), child: const Icon(Icons.auto_awesome_rounded, color: Color(0xFFB8FFE3))),
      const SizedBox(width: 11),
      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: <Widget>[
        Text(agent.personaName, style: const TextStyle(color: Colors.white, fontSize: 17, fontWeight: FontWeight.w900)),
        Text('${agent.agentType == 'docs' ? 'Documents' : agent.agentType == 'website' ? 'Site web' : 'Commerce'} · ${agent.isActive ? 'Actif' : agent.isPaused ? 'En pause' : 'Brouillon'}', style: const TextStyle(color: Color(0xFFD5F8EA), fontSize: 12)),
      ])),
    ]),
  );
}

class _InfoCard extends StatelessWidget {
  const _InfoCard({required this.icon, required this.title, required this.child});
  final IconData icon;
  final String title;
  final Widget child;
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(14),
    decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(17), border: Border.all(color: const Color(0xFFDDEBE4))),
    child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: <Widget>[
      Icon(icon, color: _detailGreen, size: 20),
      const SizedBox(width: 10),
      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: <Widget>[
        Text(title, style: const TextStyle(fontWeight: FontWeight.w900, color: _detailInk)),
        const SizedBox(height: 4),
        child,
      ])),
    ]),
  );
}

class _Bubble extends StatelessWidget {
  const _Bubble({required this.message});
  final LiveAgentMessage message;
  @override
  Widget build(BuildContext context) => Align(
    alignment: message.isUser || message.isOperator ? Alignment.centerRight : Alignment.centerLeft,
    child: Container(
      margin: const EdgeInsets.only(bottom: 8),
      constraints: const BoxConstraints(maxWidth: 290),
      padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 9),
      decoration: BoxDecoration(
        color: message.isUser || message.isOperator ? const Color(0xFFE2F7EB) : const Color(0xFFF0F3F1),
        borderRadius: BorderRadius.circular(13),
      ),
      child: Text(message.content, style: const TextStyle(fontSize: 12.5, height: 1.28)),
    ),
  );
}

class _Kpi extends StatelessWidget {
  const _Kpi(this.value, this.label);
  final String value;
  final String label;
  @override
  Widget build(BuildContext context) => Container(
    width: (MediaQuery.sizeOf(context).width - 48) / 2,
    padding: const EdgeInsets.all(12),
    decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(15), border: Border.all(color: const Color(0xFFDDEBE4))),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: <Widget>[
      Text(value, style: const TextStyle(color: _detailInk, fontSize: 21, fontWeight: FontWeight.w900)),
      Text(label, style: const TextStyle(color: _detailMuted, fontSize: 11.5, fontWeight: FontWeight.w700)),
    ]),
  );
}

class _ListCard extends StatelessWidget {
  const _ListCard({required this.title, required this.values});
  final String title;
  final List<String> values;
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(13),
    decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), border: Border.all(color: const Color(0xFFDDEBE4))),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: <Widget>[
      Text(title, style: const TextStyle(fontWeight: FontWeight.w900, color: _detailInk)),
      const SizedBox(height: 8),
      if (values.isEmpty) const Text('Pas encore de données.', style: TextStyle(color: _detailMuted, fontSize: 12)) else Wrap(spacing: 7, runSpacing: 7, children: values.map((value) => _Tag(value)).toList()),
    ]),
  );
}

class _Tag extends StatelessWidget {
  const _Tag(this.label);
  final String label;
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
    decoration: BoxDecoration(color: const Color(0xFFEAF9F2), borderRadius: BorderRadius.circular(99)),
    child: Text(label, style: const TextStyle(color: _detailGreen, fontSize: 11, fontWeight: FontWeight.w800)),
  );
}

class _Notice extends StatelessWidget {
  const _Notice(this.text);
  final String text;
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(11),
    decoration: BoxDecoration(color: const Color(0xFFFFF8E7), borderRadius: BorderRadius.circular(13), border: Border.all(color: const Color(0xFFF0D69A))),
    child: Text(text, style: const TextStyle(color: Color(0xFF705E35), fontSize: 12, height: 1.28)),
  );
}

class _Loader extends StatelessWidget {
  const _Loader();
  @override
  Widget build(BuildContext context) => const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: _detailGreen));
}

InputDecoration _field(String hint) => InputDecoration(
  hintText: hint,
  isDense: true,
  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
  filled: true,
  fillColor: Colors.white,
  border: OutlineInputBorder(borderRadius: BorderRadius.circular(15), borderSide: const BorderSide(color: Color(0xFFD6E5DE))),
  enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(15), borderSide: const BorderSide(color: Color(0xFFD6E5DE))),
  focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(15), borderSide: const BorderSide(color: _detailGreen, width: 1.6)),
);

String _capability(String key) {
  switch (key) {
    case 'sell': return 'Vendre';
    case 'appointments': return 'RDV';
    case 'qualify': return 'Qualifier';
    case 'handoff': return 'Humain';
    default: return 'Répondre';
  }
}
