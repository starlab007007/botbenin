import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import 'live_nexus_service.dart';

const int liveSellMaxPhotos = 4;

/// Photos (max 4) + précisions de l'article à vendre.
class LiveSellPhotos extends StatefulWidget {
  const LiveSellPhotos({
    super.key,
    required this.service,
    required this.photos,
    required this.onChanged,
    required this.onNotes,
  });
  final LiveNexusService service;
  final List<String> photos;
  final ValueChanged<List<String>> onChanged;
  final ValueChanged<String> onNotes;

  @override
  State<LiveSellPhotos> createState() => _LiveSellPhotosState();
}

class _LiveSellPhotosState extends State<LiveSellPhotos> {
  final ImagePicker _picker = ImagePicker();
  bool _busy = false;

  Future<void> _add(ImageSource source) async {
    final room = liveSellMaxPhotos - widget.photos.length;
    if (room <= 0 || _busy) return;
    setState(() => _busy = true);
    try {
      final next = List<String>.from(widget.photos);
      if (source == ImageSource.camera) {
        final file = await _picker.pickImage(source: source, imageQuality: 82, maxWidth: 1600);
        if (file != null) next.add(await widget.service.uploadSharedImage(file));
      } else {
        final files = await _picker.pickMultiImage(imageQuality: 82, maxWidth: 1600);
        for (final file in files.take(room)) {
          next.add(await widget.service.uploadSharedImage(file));
        }
      }
      widget.onChanged(next);
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Photo non ajoutée. Réessayez.')),
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final photos = widget.photos;
    final full = photos.length >= liveSellMaxPhotos;
    Widget tile(Widget child) => SizedBox(width: 72, height: 72, child: child);
    Widget addButton(IconData icon, String label, ImageSource source) => tile(
          OutlinedButton(
            style: OutlinedButton.styleFrom(padding: EdgeInsets.zero),
            onPressed: () => _add(source),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [Icon(icon, size: 20), Text(label, style: const TextStyle(fontSize: 10))],
            ),
          ),
        );
    return Container(
      margin: const EdgeInsets.only(top: 8, bottom: 4),
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE4D8FF)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Expanded(child: Text('Photos de l’article', style: TextStyle(fontWeight: FontWeight.w800))),
              Text('${photos.length}/$liveSellMaxPhotos', style: const TextStyle(fontSize: 11)),
            ],
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final url in photos)
                tile(Stack(
                  fit: StackFit.expand,
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(10),
                      child: Image.network(url, fit: BoxFit.cover),
                    ),
                    Positioned(
                      top: 2,
                      right: 2,
                      child: InkWell(
                        onTap: () => widget.onChanged(photos.where((p) => p != url).toList()),
                        child: const CircleAvatar(
                          radius: 11,
                          backgroundColor: Colors.black54,
                          child: Icon(Icons.close, size: 14, color: Colors.white),
                        ),
                      ),
                    ),
                  ],
                )),
              if (_busy) tile(const Center(child: CircularProgressIndicator(strokeWidth: 2))),
              if (!full && !_busy) addButton(Icons.photo_camera_outlined, 'Photo', ImageSource.camera),
              if (!full && !_busy) addButton(Icons.add_photo_alternate_outlined, 'Galerie', ImageSource.gallery),
            ],
          ),
          TextFormField(
            maxLength: 400,
            maxLines: 2,
            decoration: const InputDecoration(labelText: 'Précisions : état, défauts, accessoires…'),
            onChanged: widget.onNotes,
          ),
        ],
      ),
    );
  }
}

/// Détails de l'article avec les photos jointes, affichés avec les résultats.
class LiveMyArticleCard extends StatefulWidget {
  const LiveMyArticleCard({
    super.key,
    required this.title,
    required this.photos,
    required this.notes,
    this.price,
    this.floor,
    this.city = '',
  });
  final String title;
  final List<String> photos;
  final String notes;
  final double? price;
  final double? floor;
  final String city;

  @override
  State<LiveMyArticleCard> createState() => _LiveMyArticleCardState();
}

class _LiveMyArticleCardState extends State<LiveMyArticleCard> {
  int _index = 0;

  String _fmt(double v) {
    final s = v.round().toString();
    final b = StringBuffer();
    for (var i = 0; i < s.length; i++) {
      if (i > 0 && (s.length - i) % 3 == 0) b.write(' ');
      b.write(s[i]);
    }
    return '$b FCFA';
  }

  @override
  Widget build(BuildContext context) {
    final photos = widget.photos;
    if (widget.title.isEmpty && photos.isEmpty && widget.notes.isEmpty) {
      return const SizedBox.shrink();
    }
    final idx = photos.isEmpty ? 0 : _index.clamp(0, photos.length - 1);
    final facts = <String>[
      if (widget.price != null && widget.price! > 0) _fmt(widget.price!),
      if (widget.floor != null && widget.floor! > 0) 'minimum ${_fmt(widget.floor!)}',
      if (widget.city.trim().isNotEmpty) widget.city.trim(),
    ].join(' · ');
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE4D8FF)),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (photos.isNotEmpty) ...[
            AspectRatio(
              aspectRatio: 16 / 10,
              child: Image.network(photos[idx], fit: BoxFit.cover, width: double.infinity),
            ),
            if (photos.length > 1)
              Padding(
                padding: const EdgeInsets.all(8),
                child: Row(
                  children: [
                    for (var i = 0; i < photos.length; i++)
                      Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: InkWell(
                          onTap: () => setState(() => _index = i),
                          child: Container(
                            width: 48,
                            height: 48,
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(
                                width: 2,
                                color: i == idx ? const Color(0xFF7C3AED) : Colors.transparent,
                              ),
                            ),
                            child: ClipRRect(
                              borderRadius: BorderRadius.circular(6),
                              child: Image.network(photos[i], fit: BoxFit.cover),
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
              ),
          ],
          Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('MON ARTICLE',
                    style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w800, color: Color(0xFF7C3AED))),
                if (widget.title.isNotEmpty)
                  Text(widget.title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
                if (facts.isNotEmpty) Text(facts, style: const TextStyle(fontSize: 12.5, color: Colors.black54)),
                if (widget.notes.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(widget.notes, style: const TextStyle(fontSize: 13)),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}
