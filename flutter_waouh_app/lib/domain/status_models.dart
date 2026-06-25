class WaouhStatus {
  const WaouhStatus({
    required this.id,
    required this.type,
    required this.title,
    required this.expiresAt,
    this.caption,
    this.price,
    this.location,
    this.mediaUrls = const [],
    this.authorName,
    this.viewsCount = 0,
  });

  final String id;
  final String type;
  final String title;
  final DateTime expiresAt;
  final String? caption;
  final num? price;
  final String? location;
  final List<String> mediaUrls;
  final String? authorName;
  final int viewsCount;

  bool get active => expiresAt.isAfter(DateTime.now());

  factory WaouhStatus.fromJson(Map<String, dynamic> json) {
    final raw = json['media_urls'];
    final urls = raw is List
        ? raw.map((value) => value.toString()).toList()
        : json['media_url'] == null
            ? const <String>[]
            : <String>[json['media_url'].toString()];
    return WaouhStatus(
      id: (json['id'] ?? '').toString(),
      type: (json['type'] ?? 'sell').toString(),
      title: (json['title'] ?? '').toString(),
      expiresAt: DateTime.tryParse((json['expires_at'] ?? '').toString()) ??
          DateTime.fromMillisecondsSinceEpoch(0),
      caption: json['caption']?.toString(),
      price: json['price_fcfa'] ?? json['price'],
      location: json['location']?.toString(),
      mediaUrls: urls,
      authorName: json['author_name']?.toString(),
      viewsCount: int.tryParse((json['views_count'] ?? json['views'] ?? 0).toString()) ?? 0,
    );
  }
}
