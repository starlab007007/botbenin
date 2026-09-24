import 'package:flutter/material.dart';

import '../data/fa_web_local_store.dart';
import '../domain/fa_web_models.dart';
import 'fa_web_consultation_screen.dart';
import 'fa_web_result_screen.dart';
import 'fa_web_theme.dart';

class FaWebJournalScreen extends StatefulWidget {
  const FaWebJournalScreen({super.key});

  @override
  State<FaWebJournalScreen> createState() => _FaWebJournalScreenState();
}

class _FaWebJournalScreenState extends State<FaWebJournalScreen> {
  final _store = FaWebLocalStore();
  var _loading = true;
  var _entries = <FaWebJournalEntry>[];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final entries = await _store.loadJournal();
    if (!mounted) return;
    setState(() {
      _entries = entries;
      _loading = false;
    });
  }

  Future<void> _delete(FaWebJournalEntry entry) async {
    await _store.deleteEntry(entry.id);
    await _load();
  }

  Future<void> _favorite(FaWebJournalEntry entry) async {
    await _store.saveEntry(entry.copyWith(favorite: !entry.favorite));
    await _load();
  }

  Future<void> _clear() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Vider le journal ?'),
        content: const Text(
            'Toutes les consultations enregistrées seront supprimées.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, false),
            child: const Text('Annuler'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(dialogContext, true),
            child: const Text('Vider'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    await _store.clearJournal();
    await _load();
  }

  Future<void> _open(FaWebJournalEntry entry) async {
    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => FaWebResultScreen(entry: entry),
      ),
    );
    await _load();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: FaWebColors.background,
      appBar: faWebAppBar(
        title: 'Mon journal du Fâ',
        onBack: () => Navigator.of(context).pop(),
        actions: _entries.isEmpty
            ? null
            : [
                IconButton(
                  onPressed: _clear,
                  icon: const Icon(Icons.delete_sweep_outlined),
                  tooltip: 'Vider le journal',
                ),
              ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.fromLTRB(13, 16, 13, 30),
              children: [
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: FaWebColors.surface,
                    border: Border.all(color: FaWebColors.line),
                    borderRadius: BorderRadius.circular(25),
                  ),
                  child: const Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '🔒 Journal privé sur ce téléphone',
                        style: TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                      SizedBox(height: 9),
                      Text(
                        'Relisez les signes reçus, observez les changements et évitez de répéter immédiatement la même question. Les données restent dans le stockage local de l’application.',
                        style: TextStyle(
                          color: FaWebColors.muted,
                          fontSize: 15.5,
                          height: 1.48,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 14),
                if (_entries.isEmpty)
                  _EmptyJournal(
                    onStart: () => Navigator.of(context).pushReplacement(
                      MaterialPageRoute<void>(
                        builder: (_) => const FaWebConsultationScreen(),
                      ),
                    ),
                  )
                else
                  for (final entry in _entries) ...[
                    _JournalCard(
                      entry: entry,
                      onOpen: () => _open(entry),
                      onFavorite: () => _favorite(entry),
                      onDelete: () => _delete(entry),
                    ),
                    const SizedBox(height: 11),
                  ],
              ],
            ),
    );
  }
}

class _JournalCard extends StatelessWidget {
  const _JournalCard({
    required this.entry,
    required this.onOpen,
    required this.onFavorite,
    required this.onDelete,
  });

  final FaWebJournalEntry entry;
  final VoidCallback onOpen;
  final VoidCallback onFavorite;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    final date = MaterialLocalizations.of(context).formatShortDate(entry.date);
    final time = TimeOfDay.fromDateTime(entry.date).format(context);
    return Material(
      color: FaWebColors.surface,
      borderRadius: BorderRadius.circular(24),
      child: InkWell(
        onTap: onOpen,
        borderRadius: BorderRadius.circular(24),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            border: Border.all(color: FaWebColors.line),
            borderRadius: BorderRadius.circular(24),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 62,
                height: 62,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: FaWebColors.ivory,
                  borderRadius: BorderRadius.circular(17),
                ),
                child: Text(
                  entry.sign.reference,
                  style: const TextStyle(fontWeight: FontWeight.w900),
                ),
              ),
              const SizedBox(width: 13),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      entry.sign.name,
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      entry.category,
                      style: const TextStyle(
                        color: FaWebColors.copper,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 7),
                    Text(
                      '$date · $time',
                      style: const TextStyle(color: FaWebColors.muted),
                    ),
                    const SizedBox(height: 9),
                    Text(
                      entry.rawIntention.trim().isEmpty
                          ? 'Intention gardée en silence'
                          : entry.rawIntention,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        height: 1.35,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
              PopupMenuButton<String>(
                onSelected: (value) {
                  if (value == 'open') onOpen();
                  if (value == 'favorite') onFavorite();
                  if (value == 'delete') onDelete();
                },
                itemBuilder: (_) => [
                  const PopupMenuItem(value: 'open', child: Text('Ouvrir')),
                  PopupMenuItem(
                    value: 'favorite',
                    child: Text(
                      entry.favorite
                          ? 'Retirer des favoris'
                          : 'Ajouter aux favoris',
                    ),
                  ),
                  const PopupMenuItem(
                    value: 'delete',
                    child: Text(
                      'Supprimer',
                      style: TextStyle(color: FaWebColors.danger),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _EmptyJournal extends StatelessWidget {
  const _EmptyJournal({required this.onStart});

  final VoidCallback onStart;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 55, 20, 20),
      child: Column(
        children: [
          Container(
            width: 84,
            height: 84,
            decoration: const BoxDecoration(
              color: FaWebColors.ivory,
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.bookmark_outline_rounded, size: 41),
          ),
          const SizedBox(height: 17),
          const Text(
            'Votre journal est vide',
            style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 8),
          const Text(
            'Après un lancer, enregistrez le signe et sa lecture.',
            textAlign: TextAlign.center,
            style: TextStyle(color: FaWebColors.muted, height: 1.4),
          ),
          const SizedBox(height: 18),
          FaWebPrimaryButton(
            label: 'Commencer une consultation',
            onPressed: onStart,
          ),
        ],
      ),
    );
  }
}
