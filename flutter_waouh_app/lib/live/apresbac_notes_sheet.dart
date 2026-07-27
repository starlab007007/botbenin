import 'package:flutter/material.dart';

import 'apresbac_ocr_service.dart';

class ApresBacConfirmedNote {
  const ApresBacConfirmedNote({
    required this.subject,
    required this.score,
    required this.confidence,
  });

  final String subject;
  final double score;
  final double? confidence;

  Map<String, dynamic> toJson() => {
        'subject': subject,
        'score': score,
        'confidence': confidence,
      };
}

class ApresBacNotesSubmission {
  const ApresBacNotesSubmission({
    required this.notes,
    required this.keepOcrText,
  });

  final List<ApresBacConfirmedNote> notes;
  final bool keepOcrText;
}

class ApresBacNotesSheet extends StatefulWidget {
  const ApresBacNotesSheet({
    super.key,
    required this.series,
    required this.source,
    required this.suggestions,
    this.ocrNotes = const [],
    this.rawOcrText,
  });

  final String series;
  final String source;
  final List<String> suggestions;
  final List<ApresBacOcrNote> ocrNotes;
  final String? rawOcrText;

  @override
  State<ApresBacNotesSheet> createState() => _ApresBacNotesSheetState();
}

class _ApresBacNotesSheetState extends State<ApresBacNotesSheet> {
  static const _green = Color(0xFF075E54);
  static const _muted = Color(0xFF66736F);
  static const _line = Color(0xFFDDE9E5);

  final _formKey = GlobalKey<FormState>();
  final List<_NoteDraft> _drafts = [];
  bool _keepOcrText = false;

  @override
  void initState() {
    super.initState();

    if (widget.ocrNotes.isNotEmpty) {
      for (final note in widget.ocrNotes) {
        _drafts.add(
          _NoteDraft(
            subject: note.subject,
            score: note.score.toStringAsFixed(
              note.score.truncateToDouble() == note.score ? 0 : 2,
            ),
            confidence: note.confidence,
          ),
        );
      }
    }
  }

  @override
  void dispose() {
    for (final draft in _drafts) {
      draft.dispose();
    }
    super.dispose();
  }

  void _addDraft({String? subject}) {
    setState(() {
      _drafts.add(_NoteDraft(subject: subject));
    });
  }

  void _removeDraft(int index) {
    if (index < 0 || index >= _drafts.length) return;

    final draft = _drafts.removeAt(index);
    draft.dispose();
    setState(() {});
  }

  void _submit() {
    if (!_formKey.currentState!.validate()) return;

    final notes = <ApresBacConfirmedNote>[];

    for (final draft in _drafts) {
      final subject = draft.subjectController.text.trim();
      final score = double.tryParse(
        draft.scoreController.text.trim().replaceAll(',', '.'),
      );

      if (subject.isEmpty || score == null) continue;

      notes.add(
        ApresBacConfirmedNote(
          subject: subject,
          score: score,
          confidence: draft.confidence,
        ),
      );
    }

    if (notes.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Ajoute au moins une matière et une note.'),
        ),
      );
      return;
    }

    Navigator.of(context).pop(
      ApresBacNotesSubmission(
        notes: notes,
        keepOcrText: _keepOcrText,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isOcr = widget.source == 'OCR';

    return SafeArea(
      top: false,
      child: FractionallySizedBox(
        heightFactor: 0.94,
        child: Material(
          color: const Color(0xFFF6FAF8),
          borderRadius: const BorderRadius.vertical(
            top: Radius.circular(28),
          ),
          clipBehavior: Clip.antiAlias,
          child: Column(
            children: [
              Container(
                width: 46,
                height: 5,
                margin: const EdgeInsets.only(top: 10),
                decoration: BoxDecoration(
                  color: const Color(0xFF2D3D38),
                  borderRadius: BorderRadius.circular(99),
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(18, 16, 18, 10),
                child: Row(
                  children: [
                    Container(
                      width: 48,
                      height: 48,
                      decoration: BoxDecoration(
                        color: const Color(0xFFE4F4EE),
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Icon(
                        isOcr
                            ? Icons.document_scanner_outlined
                            : Icons.edit_note_rounded,
                        color: _green,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            isOcr
                                ? 'Valider les notes détectées'
                                : 'Saisir mes notes',
                            style: const TextStyle(
                              fontSize: 21,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                          Text(
                            'Série ${widget.series} · notes sur 20',
                            style: const TextStyle(
                              color: _muted,
                              fontSize: 12,
                            ),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      tooltip: 'Fermer',
                      onPressed: () => Navigator.pop(context),
                      icon: const Icon(Icons.close_rounded),
                    ),
                  ],
                ),
              ),
              if (isOcr)
                Container(
                  margin: const EdgeInsets.fromLTRB(18, 0, 18, 10),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFFF3E8),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: const Color(0xFFF2C99F),
                    ),
                  ),
                  child: const Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Icon(
                        Icons.verified_user_outlined,
                        color: Color(0xFF9A4E16),
                        size: 20,
                      ),
                      SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'L’OCR est effectué sur le téléphone. '
                          'Vérifie chaque matière et chaque note avant '
                          'l’enregistrement.',
                          style: TextStyle(
                            color: Color(0xFF7A3A0D),
                            fontSize: 12,
                            height: 1.35,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              Expanded(
                child: Form(
                  key: _formKey,
                  child: ListView(
                    padding: const EdgeInsets.fromLTRB(18, 4, 18, 20),
                    children: [
                      if (widget.suggestions.isNotEmpty) ...[
                        const Text(
                          'Matières suggérées',
                          style: TextStyle(
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Wrap(
                          spacing: 7,
                          runSpacing: 7,
                          children: widget.suggestions.take(18).map(
                            (subject) {
                              return ActionChip(
                                label: Text(subject),
                                avatar: const Icon(
                                  Icons.add_rounded,
                                  size: 17,
                                ),
                                onPressed: () => _addDraft(
                                  subject: subject,
                                ),
                              );
                            },
                          ).toList(),
                        ),
                        const SizedBox(height: 16),
                      ],
                      if (_drafts.isEmpty)
                        Container(
                          margin: const EdgeInsets.only(bottom: 12),
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: _line),
                          ),
                          child: const Row(
                            children: [
                              Icon(
                                Icons.touch_app_outlined,
                                color: _green,
                              ),
                              SizedBox(width: 10),
                              Expanded(
                                child: Text(
                                  'Sélectionne une matière suggérée ou appuie '
                                  'sur « Ajouter une matière ».',
                                  style: TextStyle(
                                    color: _muted,
                                    fontSize: 12,
                                    height: 1.35,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ...List.generate(
                        _drafts.length,
                        (index) => _NoteRow(
                          index: index,
                          draft: _drafts[index],
                          onRemove: () => _removeDraft(index),
                        ),
                      ),
                      OutlinedButton.icon(
                        onPressed: _addDraft,
                        icon: const Icon(Icons.add_rounded),
                        label: const Text('Ajouter une matière'),
                      ),
                      if (isOcr && widget.rawOcrText != null) ...[
                        const SizedBox(height: 14),
                        CheckboxListTile(
                          contentPadding: EdgeInsets.zero,
                          value: _keepOcrText,
                          onChanged: (value) => setState(
                            () => _keepOcrText = value ?? false,
                          ),
                          title: const Text(
                            'Conserver le texte OCR dans mon profil',
                          ),
                          subtitle: const Text(
                            'Désactivé par défaut. L’image du relevé '
                            'n’est jamais envoyée ni conservée.',
                          ),
                          controlAffinity: ListTileControlAffinity.leading,
                        ),
                      ],
                      const SizedBox(height: 10),
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: _line),
                        ),
                        child: const Text(
                          'Ces notes servent à personnaliser l’orientation. '
                          'La moyenne officielle reste bloquée tant que les '
                          'coefficients officiels applicables ne sont pas validés.',
                          style: TextStyle(
                            color: _muted,
                            fontSize: 12,
                            height: 1.35,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.fromLTRB(18, 10, 18, 14),
                decoration: const BoxDecoration(
                  color: Colors.white,
                  border: Border(top: BorderSide(color: _line)),
                ),
                child: SizedBox(
                  width: double.infinity,
                  child: FilledButton.icon(
                    onPressed: _submit,
                    icon: const Icon(Icons.save_outlined),
                    label: const Text('Confirmer et enregistrer'),
                    style: FilledButton.styleFrom(
                      backgroundColor: _green,
                      padding: const EdgeInsets.symmetric(vertical: 15),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _NoteRow extends StatelessWidget {
  const _NoteRow({
    required this.index,
    required this.draft,
    required this.onRemove,
  });

  final int index;
  final _NoteDraft draft;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFDDE9E5)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            flex: 3,
            child: TextFormField(
              controller: draft.subjectController,
              textCapitalization: TextCapitalization.sentences,
              decoration: InputDecoration(
                labelText: 'Matière ${index + 1}',
                hintText: 'Ex. Mathématiques',
                prefixIcon: const Icon(Icons.menu_book_outlined),
              ),
              validator: (value) {
                final scoreIsEmpty = draft.scoreController.text.trim().isEmpty;
                if ((value == null || value.trim().isEmpty) && !scoreIsEmpty) {
                  return 'Matière requise';
                }
                return null;
              },
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            flex: 2,
            child: TextFormField(
              controller: draft.scoreController,
              keyboardType: const TextInputType.numberWithOptions(
                decimal: true,
              ),
              decoration: const InputDecoration(
                labelText: 'Note /20',
                hintText: '15',
              ),
              validator: (value) {
                final subjectIsEmpty =
                    draft.subjectController.text.trim().isEmpty;

                if ((value == null || value.trim().isEmpty) && subjectIsEmpty) {
                  return null;
                }

                final score = double.tryParse(
                  (value ?? '').replaceAll(',', '.'),
                );

                if (score == null || score < 0 || score > 20) {
                  return '0 à 20';
                }
                return null;
              },
            ),
          ),
          IconButton(
            tooltip: 'Supprimer',
            onPressed: onRemove,
            icon: const Icon(Icons.delete_outline_rounded),
          ),
        ],
      ),
    );
  }
}

class _NoteDraft {
  _NoteDraft({
    String? subject,
    String? score,
    this.confidence,
  })  : subjectController = TextEditingController(text: subject),
        scoreController = TextEditingController(text: score);

  final TextEditingController subjectController;
  final TextEditingController scoreController;
  final double? confidence;

  void dispose() {
    subjectController.dispose();
    scoreController.dispose();
  }
}
