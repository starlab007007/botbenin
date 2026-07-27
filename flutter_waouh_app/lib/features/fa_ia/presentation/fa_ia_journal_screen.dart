import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../data/fa_ia_journal_repository.dart';
import '../domain/fa_ia_engine.dart';
import '../domain/fa_ia_models.dart';
import 'fa_ia_result_screen.dart';
import 'fa_ia_theme.dart';

class FaIaJournalScreen extends StatefulWidget {
  const FaIaJournalScreen({super.key, required this.engine});

  final FaIaEngine engine;

  @override
  State<FaIaJournalScreen> createState() => _FaIaJournalScreenState();
}

class _FaIaJournalScreenState extends State<FaIaJournalScreen> {
  static const _repository = FaIaJournalRepository();
  final DateFormat _format = DateFormat('dd/MM/yyyy · HH:mm');

  bool _loading = true;
  List<FaConsultation> _entries = const <FaConsultation>[];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final entries = await _repository.load();
    if (!mounted) return;
    setState(() {
      _entries = entries;
      _loading = false;
    });
  }

  Future<void> _delete(FaConsultation entry) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Supprimer cette consultation ?'),
        content: Text(
          '${entry.signName} · ${_format.format(entry.createdAt.toLocal())}',
        ),
        actions: <Widget>[
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Annuler'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Supprimer'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    await _repository.delete(entry.id);
    await _load();
  }

  Future<void> _clear() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Vider le journal ?'),
        content: const Text(
          'Toutes les consultations enregistrées sur ce téléphone seront supprimées définitivement.',
        ),
        actions: <Widget>[
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Annuler'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Tout supprimer'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    await _repository.clear();
    await _load();
  }

  void _open(FaConsultation entry) {
    try {
      final sign = widget.engine.signByReference(entry.signReference);
      Navigator.of(context).push(
        MaterialPageRoute<void>(
          builder: (_) => FaIaResultScreen(
            engine: widget.engine,
            category: entry.category,
            intention: entry.intention,
            faces: entry.faces,
            sign: sign,
            reading: entry.reading,
            persist: false,
            consultationId: entry.id,
            createdAt: entry.createdAt,
            initialConversation: entry.conversation,
          ),
        ),
      );
    } catch (_) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'Cette consultation ne peut plus être relue : sa référence est invalide.',
          ),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: FaIaColors.background,
      appBar: AppBar(
        backgroundColor: FaIaColors.deepBrown,
        foregroundColor: Colors.white,
        title: const Text(
          'Mon journal du Fâ',
          style: TextStyle(fontWeight: FontWeight.w900),
        ),
        actions: <Widget>[
          if (_entries.isNotEmpty)
            IconButton(
              tooltip: 'Vider le journal',
              onPressed: _clear,
              icon: const Icon(Icons.delete_sweep_outlined),
            ),
        ],
      ),
      body: SafeArea(
        top: false,
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : _entries.isEmpty
            ? const _EmptyJournal()
            : RefreshIndicator(
                onRefresh: _load,
                child: ListView.separated(
                  physics: const AlwaysScrollableScrollPhysics(
                    parent: BouncingScrollPhysics(),
                  ),
                  padding: const EdgeInsets.fromLTRB(16, 18, 16, 32),
                  itemCount: _entries.length + 1,
                  separatorBuilder: (_, index) =>
                      SizedBox(height: index == 0 ? 14 : 10),
                  itemBuilder: (context, index) {
                    if (index == 0) {
                      return const FaIaCard(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: <Widget>[
                            FaIaSectionTitle(
                              icon: Icons.lock_outline_rounded,
                              title: 'Journal privé sur ce téléphone',
                            ),
                            SizedBox(height: 9),
                            Text(
                              'Relisez les signes reçus, observez les changements et évitez de répéter immédiatement la même question. Les données restent dans le stockage local de l’application.',
                              style: FaIaText.muted,
                            ),
                          ],
                        ),
                      );
                    }
                    final entry = _entries[index - 1];
                    return Dismissible(
                      key: ValueKey<String>(entry.id),
                      direction: DismissDirection.endToStart,
                      confirmDismiss: (_) async {
                        await _delete(entry);
                        return false;
                      },
                      background: Container(
                        alignment: Alignment.centerRight,
                        padding: const EdgeInsets.only(right: 24),
                        decoration: BoxDecoration(
                          color: FaIaColors.danger,
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: const Icon(
                          Icons.delete_outline_rounded,
                          color: Colors.white,
                        ),
                      ),
                      child: _JournalCard(
                        entry: entry,
                        formattedDate: _format.format(
                          entry.createdAt.toLocal(),
                        ),
                        onOpen: () => _open(entry),
                        onDelete: () => _delete(entry),
                      ),
                    );
                  },
                ),
              ),
      ),
    );
  }
}

class _EmptyJournal extends StatelessWidget {
  const _EmptyJournal();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(30),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            Container(
              width: 84,
              height: 84,
              decoration: const BoxDecoration(
                color: FaIaColors.ivory,
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.auto_stories_outlined,
                size: 40,
                color: FaIaColors.copper,
              ),
            ),
            const SizedBox(height: 18),
            const Text(
              'Votre journal est vide',
              style: FaIaText.h1,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 9),
            const Text(
              'Après un lancer, enregistrez le signe et sa lecture pour les relire plus tard.',
              style: FaIaText.muted,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 20),
            FaIaPrimaryButton(
              label: 'Commencer une consultation',
              icon: Icons.blur_circular_rounded,
              onPressed: () => Navigator.pop(context),
            ),
          ],
        ),
      ),
    );
  }
}

class _JournalCard extends StatelessWidget {
  const _JournalCard({
    required this.entry,
    required this.formattedDate,
    required this.onOpen,
    required this.onDelete,
  });

  final FaConsultation entry;
  final String formattedDate;
  final VoidCallback onOpen;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onOpen,
        borderRadius: BorderRadius.circular(20),
        child: Ink(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: FaIaColors.surface,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: FaIaColors.line),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: FaIaColors.ivory,
                  borderRadius: BorderRadius.circular(15),
                ),
                child: Center(
                  child: Text(
                    entry.signReference,
                    style: const TextStyle(
                      color: FaIaColors.deepBrown,
                      fontWeight: FontWeight.w900,
                      fontSize: 11,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 13),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Text(entry.signName, style: FaIaText.h2),
                    const SizedBox(height: 3),
                    Text(
                      entry.category,
                      style: const TextStyle(
                        color: FaIaColors.copper,
                        fontWeight: FontWeight.w800,
                        fontSize: 12,
                      ),
                    ),
                    const SizedBox(height: 5),
                    Text(formattedDate, style: FaIaText.muted),
                    if (entry.intention.trim().isNotEmpty) ...<Widget>[
                      const SizedBox(height: 7),
                      Text(
                        entry.intention,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: FaIaText.body,
                      ),
                    ],
                  ],
                ),
              ),
              PopupMenuButton<String>(
                tooltip: 'Actions',
                onSelected: (value) {
                  if (value == 'open') onOpen();
                  if (value == 'delete') onDelete();
                },
                itemBuilder: (_) => const <PopupMenuEntry<String>>[
                  PopupMenuItem(value: 'open', child: Text('Ouvrir')),
                  PopupMenuItem(value: 'delete', child: Text('Supprimer')),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
