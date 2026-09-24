import 'dart:async';
import 'dart:math';
import 'dart:typed_data';

import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_slidable/flutter_slidable.dart';
import 'package:go_router/go_router.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

Future<void> main() async {
  runZonedGuarded<void>(
    () {
      WidgetsFlutterBinding.ensureInitialized();
      FlutterError.onError = (details) {
        FlutterError.presentError(details);
        debugPrint(details.exceptionAsString());
      };

      runApp(const WaouhStartupApp());
    },
    (error, stackTrace) {
      debugPrint('WaouhApp uncaught error: $error');
      debugPrintStack(stackTrace: stackTrace);
    },
  );
}

late final SupabaseClient supabase;

Future<void> initializeWaouhBackend() async {
  await Supabase.initialize(
    url: AppConstants.supabaseUrl,
    publishableKey: AppConstants.supabaseAnonKey,
  ).timeout(const Duration(seconds: 12));
  supabase = Supabase.instance.client;
}

class AppConstants {
  static const supabaseUrl = 'https://mvynepqulhflxtyymtzs.supabase.co';
  static const supabaseAnonKey =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12eW5lcHF1bGhmbHh0eXltdHpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc1OTgxNTMsImV4cCI6MjA2MzE3NDE1M30.g1llr-Q6T3h06xFV7hCNRWZHG20wQHoBmp5zL0OAKh8';
  static const sessionStorageKey = 'waouh_web_session_id';
  static const beninPrefix = '+229';
}

class WaouhColors {
  static const ink = Color(0xFF061411);
  static const deep = Color(0xFF043C33);
  static const green = Color(0xFF075E54);
  static const jade = Color(0xFF0A7C5B);
  static const neon = Color(0xFF24E58F);
  static const mint = Color(0xFFDDFBEA);
  static const paper = Color(0xFFFFFFFF);
  static const pearl = Color(0xFFF7FAF8);
  static const line = Color(0xFFD8E5DF);
  static const muted = Color(0xFF60746E);
  static const blue = Color(0xFF2F6BFF);
  static const sky = Color(0xFFE8F0FF);
  static const orange = Color(0xFFFF8A00);
  static const amber = Color(0xFFFFF4DB);
  static const red = Color(0xFFEF4444);
  static const chat = Color(0xFFEFE9DF);
}

ThemeData buildWaouhTheme() {
  final scheme = ColorScheme.fromSeed(
    seedColor: WaouhColors.green,
    primary: WaouhColors.green,
    secondary: WaouhColors.neon,
    surface: WaouhColors.paper,
    error: WaouhColors.red,
  );
  return ThemeData(
    useMaterial3: true,
    colorScheme: scheme,
    scaffoldBackgroundColor: WaouhColors.pearl,
    fontFamily: 'Roboto',
    appBarTheme: const AppBarTheme(
      elevation: 0,
      backgroundColor: WaouhColors.green,
      foregroundColor: Colors.white,
      centerTitle: false,
      systemOverlayStyle: SystemUiOverlayStyle.light,
    ),
    cardTheme: CardThemeData(
      elevation: 0,
      color: WaouhColors.paper,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(22),
        side: const BorderSide(color: WaouhColors.line),
      ),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        minimumSize: const Size.fromHeight(52),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        textStyle: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Colors.white,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: const BorderSide(color: WaouhColors.line),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: const BorderSide(color: WaouhColors.line),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: const BorderSide(color: WaouhColors.blue, width: 2),
      ),
    ),
  );
}

String asString(dynamic value, [String fallback = '']) =>
    value == null ? fallback : value.toString();

DateTime asDate(dynamic value) {
  if (value is DateTime) return value;
  return DateTime.tryParse(asString(value)) ??
      DateTime.fromMillisecondsSinceEpoch(0);
}

num asNum(dynamic value, [num fallback = 0]) {
  if (value is num) return value;
  return num.tryParse(asString(value)) ?? fallback;
}

String stamp(DateTime value) {
  final now = DateTime.now();
  final local = value.toLocal();
  final sameDay =
      local.year == now.year &&
      local.month == now.month &&
      local.day == now.day;
  if (sameDay) return DateFormat('HH:mm').format(local);
  return DateFormat('dd MMM, HH:mm', 'fr_FR').format(local);
}

String money(num amount) => NumberFormat.decimalPattern('fr_FR').format(amount);

enum WaouhIntent { sell, buy, negotiate }

extension WaouhIntentCopy on WaouhIntent {
  String get label => switch (this) {
    WaouhIntent.sell => 'Vendre',
    WaouhIntent.buy => 'Acheter',
    WaouhIntent.negotiate => 'Negocier',
  };

  Color get color => switch (this) {
    WaouhIntent.sell => WaouhColors.jade,
    WaouhIntent.buy => WaouhColors.blue,
    WaouhIntent.negotiate => WaouhColors.orange,
  };

  IconData get icon => switch (this) {
    WaouhIntent.sell => Icons.shopping_bag_outlined,
    WaouhIntent.buy => Icons.search_rounded,
    WaouhIntent.negotiate => Icons.handshake_outlined,
  };

  String get edgeFunction => switch (this) {
    WaouhIntent.sell => 'waouh-sell-handler',
    WaouhIntent.buy => 'waouh-buy-handler',
    WaouhIntent.negotiate => 'waouh-negotiate-handler',
  };

  String prompt() => switch (this) {
    WaouhIntent.sell => 'Je vends : ',
    WaouhIntent.buy => 'Je cherche ',
    WaouhIntent.negotiate => 'Je propose  FCFA pour ',
  };
}

enum StatusKind { sell, buy, announce }

extension StatusKindCopy on StatusKind {
  String get value => switch (this) {
    StatusKind.sell => 'sell',
    StatusKind.buy => 'buy',
    StatusKind.announce => 'announce',
  };
  String get label => switch (this) {
    StatusKind.sell => 'Je vends',
    StatusKind.buy => 'Je cherche',
    StatusKind.announce => 'J annonce',
  };
  Color get color => switch (this) {
    StatusKind.sell => WaouhColors.red,
    StatusKind.buy => WaouhColors.jade,
    StatusKind.announce => WaouhColors.orange,
  };
}

StatusKind parseStatusKind(dynamic value) => switch (asString(value)) {
  'buy' => StatusKind.buy,
  'announce' => StatusKind.announce,
  _ => StatusKind.sell,
};

class Profile {
  const Profile({
    required this.id,
    this.fullName,
    this.email,
    this.phone,
    this.avatarUrl,
    this.role,
  });

  final String id;
  final String? fullName;
  final String? email;
  final String? phone;
  final String? avatarUrl;
  final String? role;

  factory Profile.fromJson(Map<String, dynamic> json) => Profile(
    id: asString(json['id']),
    fullName: json['full_name'] ?? json['display_name'] ?? json['name'],
    email: json['email'],
    phone: json['phone'] ?? json['phone_number'],
    avatarUrl: json['avatar_url'],
    role: json['role'] ?? json['user_role'],
  );
}

class WaouhConversation {
  const WaouhConversation({
    required this.id,
    this.phoneNumber,
    this.channel,
    this.lastMessage,
    required this.updatedAt,
    this.userId,
    this.archived = false,
  });

  final String id;
  final String? phoneNumber;
  final String? channel;
  final String? lastMessage;
  final DateTime updatedAt;
  final String? userId;
  final bool archived;

  factory WaouhConversation.fromJson(Map<String, dynamic> json) =>
      WaouhConversation(
        id: asString(json['id']),
        phoneNumber: json['phone_number'],
        channel: json['channel'],
        lastMessage:
            json['last_message'] ??
            json['last_message_text'] ??
            json['preview'],
        updatedAt: asDate(
          json['updated_at'] ?? json['last_message_at'] ?? json['created_at'],
        ),
        userId: json['user_id'],
        archived:
            json['archived'] == true ||
            json['status'] == 'archived' ||
            json['state'] == 'archived',
      );
}

class WaouhMessage {
  const WaouhMessage({
    required this.id,
    this.conversationId,
    this.role,
    required this.content,
    required this.createdAt,
    this.direction,
    this.webSessionId,
    this.meta = const {},
  });

  final String id;
  final String? conversationId;
  final String? role;
  final String content;
  final DateTime createdAt;
  final String? direction;
  final String? webSessionId;
  final Map<String, dynamic> meta;

  bool get outgoing =>
      direction == 'out' ||
      direction == 'outbound' ||
      role == 'user' ||
      role == 'buyer';

  factory WaouhMessage.fromJson(Map<String, dynamic> json) => WaouhMessage(
    id: asString(json['id'], 'local-${DateTime.now().microsecondsSinceEpoch}'),
    conversationId: json['conversation_id'],
    role: json['role'],
    content: asString(
      json['text'] ?? json['content'] ?? json['message'] ?? json['body'],
    ),
    createdAt: asDate(json['created_at']),
    direction: json['direction'],
    webSessionId: json['web_session_id'],
    meta: (json['meta'] is Map)
        ? Map<String, dynamic>.from(json['meta'] as Map)
        : const {},
  );
}

class WaouhStatus {
  const WaouhStatus({
    required this.id,
    required this.kind,
    required this.title,
    this.caption,
    this.price,
    this.location,
    this.mediaUrls = const [],
    required this.createdAt,
    required this.expiresAt,
    this.authorName,
    this.articleId,
    this.views = 0,
  });

  final String id;
  final StatusKind kind;
  final String title;
  final String? caption;
  final num? price;
  final String? location;
  final List<String> mediaUrls;
  final DateTime createdAt;
  final DateTime expiresAt;
  final String? authorName;
  final String? articleId;
  final int views;

  bool get isActive => expiresAt.isAfter(DateTime.now());

  factory WaouhStatus.fromJson(Map<String, dynamic> json) => WaouhStatus(
    id: asString(json['id']),
    kind: parseStatusKind(json['type'] ?? json['kind']),
    title: asString(json['title']),
    caption: json['caption'] ?? json['detail'] ?? json['description'],
    price: json['price'] == null ? null : asNum(json['price']),
    location: json['location'] ?? json['city'] ?? json['ville'],
    mediaUrls:
        ((json['media_urls'] ?? json['media_files'] ?? json['photos']) as List?)
            ?.map((e) => asString(e))
            .where((e) => e.isNotEmpty)
            .toList() ??
        const [],
    createdAt: asDate(json['created_at']),
    expiresAt: asDate(json['expires_at']),
    authorName: json['author_name'] ?? json['display_name'],
    articleId: json['article_id'],
    views: asNum(json['views']).toInt(),
  );
}

class NotificationItem {
  const NotificationItem({
    required this.id,
    required this.title,
    required this.body,
    required this.createdAt,
    this.read = false,
    this.actionUrl,
    this.type,
    this.payload = const {},
  });

  final String id;
  final String title;
  final String body;
  final DateTime createdAt;
  final bool read;
  final String? actionUrl;
  final String? type;
  final Map<String, dynamic> payload;

  factory NotificationItem.fromJson(Map<String, dynamic> json) =>
      NotificationItem(
        id: asString(json['id']),
        title: asString(json['title'] ?? json['template'], 'Notification'),
        body: asString(
          json['content'] ??
              json['body'] ??
              json['message'] ??
              json['payload']?['message'] ??
              json['payload']?['title'],
        ),
        createdAt: asDate(json['created_at'] ?? json['sent_at']),
        read:
            json['read'] == true ||
            json['opened'] == true ||
            json['read_at'] != null,
        actionUrl: json['action_url'] ?? json['payload']?['action_url'],
        type: json['type'] ?? json['template'],
        payload: (json['payload'] is Map)
            ? Map<String, dynamic>.from(json['payload'] as Map)
            : (json['metadata'] is Map)
            ? Map<String, dynamic>.from(json['metadata'] as Map)
            : const {},
      );
}

class Partner {
  const Partner({
    required this.id,
    this.userId,
    this.name,
    this.email,
    this.status,
    this.walletBalance = 0,
    this.totalSales = 0,
    this.mobileMoneyOperator,
    this.mobileMoneyNumber,
  });

  final String id;
  final String? userId;
  final String? name;
  final String? email;
  final String? status;
  final num walletBalance;
  final num totalSales;
  final String? mobileMoneyOperator;
  final String? mobileMoneyNumber;

  factory Partner.fromJson(Map<String, dynamic> json) => Partner(
    id: asString(json['id']),
    userId: json['user_id'],
    name: json['nom'] ?? json['name'],
    email: json['email'],
    status: json['statut'] ?? json['status'],
    walletBalance: asNum(
      json['wallet_balance'] ??
          json['balance'] ??
          json['solde'] ??
          json['total_commissions'],
    ),
    totalSales: asNum(
      json['total_sales'] ?? json['total_earnings'] ?? json['chiffre_affaires'],
    ),
    mobileMoneyOperator: json['mobile_money_operator'] ?? json['operator'],
    mobileMoneyNumber: json['mobile_money_number'] ?? json['msisdn'],
  );
}

class PartnerBusiness {
  const PartnerBusiness({
    required this.id,
    required this.name,
    this.category,
    this.city,
    this.quarter,
    this.whatsapp,
    this.status,
    this.shortCode,
    this.description,
    this.addressLine,
    this.lat,
    this.lng,
  });

  final String id;
  final String name;
  final String? category;
  final String? city;
  final String? quarter;
  final String? whatsapp;
  final String? status;
  final String? shortCode;
  final String? description;
  final String? addressLine;
  final double? lat;
  final double? lng;

  factory PartnerBusiness.fromJson(Map<String, dynamic> json) =>
      PartnerBusiness(
        id: asString(json['id']),
        name: asString(json['nom_entreprise'] ?? json['nom'] ?? json['name']),
        category: json['categorie'] ?? json['secteur'] ?? json['category'],
        city: json['ville'] ?? json['city'],
        quarter: json['quartier'] ?? json['commune'] ?? json['quarter'],
        whatsapp: json['whatsapp'] ?? json['telephone'] ?? json['phone'],
        status: json['statut'] ?? json['status'],
        shortCode: json['code_court'],
        description: json['description'],
        addressLine: json['adresse_complete'],
        lat: (json['lat'] as num?)?.toDouble(),
        lng: (json['lng'] as num?)?.toDouble(),
      );
}

class PartnerProduct {
  const PartnerProduct({
    required this.id,
    required this.name,
    this.category,
    this.unit,
    this.priceMin,
    this.priceMax,
    this.available = true,
    this.photos = const [],
    this.stock,
    this.description,
  });

  final String id;
  final String name;
  final String? category;
  final String? unit;
  final num? priceMin;
  final num? priceMax;
  final bool available;
  final List<String> photos;
  final num? stock;
  final String? description;

  factory PartnerProduct.fromJson(Map<String, dynamic> json) => PartnerProduct(
    id: asString(json['id']),
    name: asString(json['nom'] ?? json['title'] ?? json['name']),
    category: json['categorie'] ?? json['category'],
    unit: json['unite'] ?? json['unit'],
    priceMin: json['prix_min'] == null
        ? (json['prix'] == null
              ? (json['price'] == null ? null : asNum(json['price']))
              : asNum(json['prix']))
        : asNum(json['prix_min']),
    priceMax: json['prix_max'] == null
        ? (json['price'] == null ? null : asNum(json['price']))
        : asNum(json['prix_max']),
    available:
        json['disponible'] != false &&
        json['available'] != false &&
        json['statut'] != 'unavailable',
    photos:
        ((json['photos'] ?? json['media_urls']) as List?)
            ?.map((e) => asString(e))
            .where((e) => e.isNotEmpty)
            .toList() ??
        const [],
    stock: json['stock_estime'] == null
        ? (json['stock'] == null ? null : asNum(json['stock']))
        : asNum(json['stock_estime']),
    description: json['description'],
  );
}

class PartnerSale {
  const PartnerSale({
    required this.id,
    required this.createdAt,
    this.amount = 0,
    this.margin = 0,
    this.commission = 0,
    this.status,
    this.productName,
  });

  final String id;
  final DateTime createdAt;
  final num amount;
  final num margin;
  final num commission;
  final String? status;
  final String? productName;

  factory PartnerSale.fromJson(Map<String, dynamic> json) => PartnerSale(
    id: asString(json['id']),
    createdAt: asDate(json['created_at']),
    amount: asNum(json['amount'] ?? json['montant']),
    margin: asNum(json['margin'] ?? json['marge']),
    commission: asNum(json['commission'] ?? json['commission_amount']),
    status: json['statut'] ?? json['status'],
    productName: json['product_name'] ?? json['produit'],
  );
}

class KnowledgeBase {
  const KnowledgeBase({
    required this.id,
    required this.name,
    this.description,
    this.completion = 0,
    this.updatedAt,
  });

  final String id;
  final String name;
  final String? description;
  final num completion;
  final DateTime? updatedAt;

  factory KnowledgeBase.fromJson(Map<String, dynamic> json) => KnowledgeBase(
    id: asString(json['id']),
    name: asString(json['name'] ?? json['title'] ?? json['nom']),
    description: json['description'],
    completion: asNum(json['completion'] ?? json['progress']),
    updatedAt: json['updated_at'] == null ? null : asDate(json['updated_at']),
  );
}

class WaSession {
  const WaSession({
    required this.id,
    required this.name,
    this.status,
    this.phone,
    this.qrCode,
  });

  final String id;
  final String name;
  final String? status;
  final String? phone;
  final String? qrCode;

  factory WaSession.fromJson(Map<String, dynamic> json) => WaSession(
    id: asString(json['id'] ?? json['name']),
    name: asString(json['name'] ?? json['session_name'], 'default'),
    status: json['status'] ?? json['state'],
    phone: json['phone'] ?? json['me']?['id'],
    qrCode: json['qr'] ?? json['qrCode'],
  );
}

class AuthController extends ChangeNotifier {
  AuthController() {
    _session = supabase.auth.currentSession;
    _authSub = supabase.auth.onAuthStateChange.listen((event) async {
      _session = event.session;
      await _loadProfile();
      notifyListeners();
    });
    _loadProfile();
  }

  Session? _session;
  Profile? profile;
  bool loading = false;
  String? error;
  late final StreamSubscription<AuthState> _authSub;

  Session? get session => _session;
  User? get user => _session?.user;
  bool get signedIn => user != null;

  Future<void> _loadProfile() async {
    final uid = user?.id;
    if (uid == null) {
      profile = null;
      return;
    }
    try {
      final row = await supabase
          .from('profiles')
          .select()
          .eq('id', uid)
          .maybeSingle();
      profile = row == null
          ? Profile(
              id: uid,
              fullName: user?.userMetadata?['full_name']?.toString(),
              email: user?.email,
              phone: user?.phone,
            )
          : Profile.fromJson(row);
    } catch (_) {
      profile = Profile(
        id: uid,
        fullName: user?.userMetadata?['full_name']?.toString(),
        email: user?.email,
        phone: user?.phone,
      );
    }
  }

  Future<void> signInWithEmail(String email, String password) async {
    await _guard(() async {
      await supabase.auth.signInWithPassword(
        email: email.trim(),
        password: password,
      );
    });
  }

  Future<void> signUpWithEmail(
    String name,
    String email,
    String password,
  ) async {
    await _guard(() async {
      final res = await supabase.auth.signUp(
        email: email.trim(),
        password: password,
        data: {'full_name': name.trim()},
      );
      final user = res.user;
      if (user != null) {
        try {
          await supabase.from('profiles').upsert({
            'id': user.id,
            'email': email.trim(),
            'full_name': name.trim().isEmpty ? email.trim() : name.trim(),
            'provider': 'email',
          });
        } catch (_) {
          // Some deployments create profiles with database triggers.
        }
      }
    });
  }

  Future<void> resetPassword(String email) async {
    await _guard(() async {
      await supabase.auth.resetPasswordForEmail(email.trim());
    });
  }

  Future<void> signInWithGoogle() async {
    await _guard(() async {
      try {
        final account = await GoogleSignIn(
          scopes: ['email', 'profile'],
        ).signIn();
        final auth = await account?.authentication;
        if (auth?.idToken != null) {
          await supabase.auth.signInWithIdToken(
            provider: OAuthProvider.google,
            idToken: auth!.idToken!,
            accessToken: auth.accessToken,
          );
          return;
        }
      } catch (_) {
        // Fallback for platforms where google_sign_in is not configured yet.
      }
      await supabase.auth.signInWithOAuth(OAuthProvider.google);
    });
  }

  /// True right after [verifyWhatsappOtp] resolves a brand-new account that
  /// still needs [completeWhatsappProfile]. Mirrors the React app's
  /// `is_new_user` branch from `whatsapp-otp-verify`.
  bool whatsappIsNewUser = false;

  String normalizeWhatsappPhone(String phone) {
    final trimmed = phone.trim();
    return trimmed.startsWith('+')
        ? trimmed
        : '${AppConstants.beninPrefix}$trimmed';
  }

  Future<void> requestWhatsappOtp(String phone) async {
    await _guard(() async {
      final normalized = normalizeWhatsappPhone(phone);
      final response = await supabase.functions.invoke(
        'whatsapp-otp-send',
        body: {'phone': normalized},
      );
      final data = response.data;
      if (data is Map && data['error'] != null) {
        throw StateError(asString(data['error'], "Envoi du code impossible"));
      }
    });
  }

  /// Verifies the 6-digit WhatsApp code and finishes the same way the
  /// `whatsapp-otp-verify` Edge Function expects: it returns a one-time
  /// magic-link token (`email_otp`) tied to a deterministic placeholder
  /// email, and the *client* must redeem it with `verifyOTP(type:
  /// OtpType.magiclink)` to actually obtain a Supabase session. Without this
  /// second step the code is "accepted" server-side but the user is never
  /// signed in — which was the previous behaviour of this method.
  Future<void> verifyWhatsappOtp(String phone, String code) async {
    await _guard(() async {
      final normalized = normalizeWhatsappPhone(phone);
      final response = await supabase.functions.invoke(
        'whatsapp-otp-verify',
        body: {'phone': normalized, 'code': code},
      );
      final data = response.data;
      if (data is! Map || data['error'] != null) {
        final message = data is Map ? asString(data['error']) : null;
        throw StateError(_otpErrorMessage(message));
      }
      final emailOtp = data['email_otp']?.toString();
      final email = data['email']?.toString();
      if (emailOtp == null ||
          emailOtp.isEmpty ||
          email == null ||
          email.isEmpty) {
        throw StateError('Reponse de verification invalide. Reessayez.');
      }
      await supabase.auth.verifyOTP(
        email: email,
        token: emailOtp,
        type: OtpType.magiclink,
      );
      whatsappIsNewUser = data['is_new_user'] == true;
    });
  }

  /// Finishes onboarding for a brand-new WhatsApp account: sets the display
  /// name (and optionally a recovery email) through `whatsapp-complete-profile`,
  /// the same Edge Function the React app calls right after OTP sign-in.
  Future<void> completeWhatsappProfile({
    required String fullName,
    String? email,
  }) async {
    await _guard(() async {
      final token = supabase.auth.currentSession?.accessToken;
      if (token == null) {
        throw StateError('Session expiree. Reconnectez-vous via WhatsApp.');
      }
      final response = await supabase.functions.invoke(
        'whatsapp-complete-profile',
        body: {
          'full_name': fullName.trim(),
          if (email != null && email.trim().isNotEmpty) 'email': email.trim(),
        },
      );
      final data = response.data;
      if (data is! Map || data['error'] != null) {
        throw StateError(
          data is Map
              ? asString(data['error'], 'Erreur enregistrement profil')
              : 'Erreur enregistrement profil',
        );
      }
      whatsappIsNewUser = false;
    });
  }

  String _otpErrorMessage(String? code) => switch (code) {
    'expired' => 'Ce code a expire. Demandez-en un nouveau.',
    'invalid_code' => 'Code incorrect. Verifiez et reessayez.',
    'too_many_attempts' => 'Trop de tentatives. Demandez un nouveau code.',
    'no_code' => "Aucun code en attente pour ce numero. Renvoyez-en un.",
    _ => 'Code invalide ou expire.',
  };

  /// Uploads [bytes] to the shared `public-media` bucket (the same generic
  /// public bucket created by the original Supabase migrations — there is no
  /// dedicated "avatars" bucket in this project) and persists the public URL
  /// on the user's profile row.
  Future<void> updateAvatar({
    required List<int> bytes,
    required String fileName,
  }) async {
    final uid = user?.id;
    if (uid == null)
      throw StateError('Connectez-vous pour modifier votre photo.');
    if (bytes.isEmpty) throw StateError('Image vide.');
    if (bytes.length > 5 * 1024 * 1024) {
      throw StateError('L\'image doit faire au maximum 5 Mo.');
    }
    await _guard(() async {
      final pieces = fileName.toLowerCase().split('.');
      final extension = pieces.length > 1 ? pieces.last : 'jpg';
      final contentType = switch (extension) {
        'png' => 'image/png',
        'webp' => 'image/webp',
        _ => 'image/jpeg',
      };
      final path =
          'avatars/$uid/avatar_${DateTime.now().millisecondsSinceEpoch}.$extension';
      await supabase.storage
          .from('public-media')
          .uploadBinary(
            path,
            Uint8List.fromList(bytes),
            fileOptions: FileOptions(contentType: contentType, upsert: true),
          );
      final publicUrl = supabase.storage
          .from('public-media')
          .getPublicUrl(path);
      await supabase.from('profiles').upsert({
        'id': uid,
        'avatar_url': publicUrl,
        'updated_at': DateTime.now().toUtc().toIso8601String(),
      });
    });
  }

  /// Updates the editable identity fields from the Profile screen (name and
  /// phone). Email changes go through Supabase auth separately since they
  /// require re-confirmation.
  Future<void> updateProfileFields({String? fullName, String? phone}) async {
    final uid = user?.id;
    if (uid == null) return;
    await _guard(() async {
      final patch = <String, dynamic>{
        'id': uid,
        'updated_at': DateTime.now().toUtc().toIso8601String(),
      };
      if (fullName != null) patch['full_name'] = fullName.trim();
      if (phone != null) patch['phone'] = phone.trim();
      await supabase.from('profiles').upsert(patch);
    });
  }

  Future<void> signOut() async {
    await supabase.auth.signOut();
  }

  Future<void> _guard(Future<void> Function() action) async {
    loading = true;
    error = null;
    notifyListeners();
    try {
      await action();
      _session = supabase.auth.currentSession;
      await _loadProfile();
    } on AuthException catch (e) {
      error = e.message;
      rethrow;
    } on FunctionException catch (e) {
      error = e.details?.toString() ?? 'Erreur backend';
      rethrow;
    } catch (e) {
      error = e.toString();
      rethrow;
    } finally {
      loading = false;
      notifyListeners();
    }
  }

  @override
  void dispose() {
    _authSub.cancel();
    super.dispose();
  }
}

class WaouhChatController extends ChangeNotifier {
  WaouhChatController(this.auth) {
    sessionId = _makeSessionId();
  }

  final AuthController auth;
  late final String sessionId;
  final List<WaouhMessage> optimisticMessages = [];
  String? _waouhUserId;

  String _makeSessionId() {
    final rnd = Random().nextInt(0xFFFFFF).toRadixString(16);
    return 'flutter_${DateTime.now().millisecondsSinceEpoch}_$rnd';
  }

  Future<String?> resolveWaouhUserId() async {
    if (_waouhUserId != null) return _waouhUserId;
    final uid = auth.user?.id;
    if (uid == null) return null;
    try {
      final rows = await supabase
          .from('waouh_users')
          .select('id, auth_user_id, web_session_id')
          .or('auth_user_id.eq.$uid,web_session_id.eq.$sessionId')
          .limit(20);
      final list = (rows as List).cast<Map<String, dynamic>>();
      if (list.isNotEmpty) {
        final linked = list.firstWhere(
          (row) => row['auth_user_id'] == uid,
          orElse: () => list.first,
        );
        _waouhUserId = asString(linked['id']);
        if (linked['auth_user_id'] == null) {
          await supabase
              .from('waouh_users')
              .update({'auth_user_id': uid})
              .eq('id', _waouhUserId!);
        }
        return _waouhUserId;
      }
      final created = await supabase
          .from('waouh_users')
          .insert({
            'auth_user_id': uid,
            'web_session_id': sessionId,
            'display_name': auth.profile?.fullName ?? auth.user?.email,
            'phone_number': auth.profile?.phone ?? auth.user?.phone,
            'channel': 'flutter',
          })
          .select('id')
          .maybeSingle();
      _waouhUserId = created == null ? null : asString(created['id']);
      return _waouhUserId;
    } catch (_) {
      return null;
    }
  }

  Future<List<String>> resolveWaouhUserIds() async {
    final uid = auth.user?.id;
    final clauses = <String>[];
    if (uid != null) clauses.add('auth_user_id.eq.$uid');
    if (sessionId.isNotEmpty) clauses.add('web_session_id.eq.$sessionId');
    if (clauses.isEmpty) return const [];
    final rows = await supabase
        .from('waouh_users')
        .select('id, auth_user_id, web_session_id')
        .or(clauses.join(','))
        .limit(100);
    final ids = <String>{};
    for (final row in (rows as List)) {
      ids.add(asString((row as Map)['id']));
    }
    return ids.where((id) => id.isNotEmpty).toList();
  }

  Future<List<WaouhConversation>> fetchConversations() async {
    if (!auth.signedIn) return const [];
    final ids = await resolveWaouhUserIds();
    if (ids.isEmpty) return const [];
    final rows = await supabase
        .from('waouh_conversations')
        .select('id,phone_number,channel,last_message,updated_at,user_id')
        .inFilter('user_id', ids)
        .order('updated_at', ascending: false)
        .limit(200);
    return (rows as List)
        .map(
          (row) =>
              WaouhConversation.fromJson(Map<String, dynamic>.from(row as Map)),
        )
        .where((c) => !c.archived)
        .toList();
  }

  Stream<List<WaouhConversation>> conversations() async* {
    yield await fetchConversations();
    yield* Stream.periodic(
      const Duration(seconds: 5),
    ).asyncMap((_) => fetchConversations());
  }

  Stream<List<WaouhMessage>> mainMessages() {
    return supabase
        .from('waouh_messages')
        .stream(primaryKey: ['id'])
        .eq('web_session_id', sessionId)
        .order('created_at')
        .map(
          (rows) =>
              [...rows.map(WaouhMessage.fromJson), ...optimisticMessages]
                ..sort((a, b) => a.createdAt.compareTo(b.createdAt)),
        );
  }

  Stream<List<WaouhMessage>> conversationMessages(String conversationId) {
    return supabase
        .from('waouh_messages')
        .stream(primaryKey: ['id'])
        .eq('conversation_id', conversationId)
        .order('created_at')
        .map((rows) => rows.map(WaouhMessage.fromJson).toList());
  }

  Future<void> sendWaouhMessage(String content, {WaouhIntent? intent}) async {
    final trimmed = content.trim();
    if (trimmed.isEmpty) return;
    final local = WaouhMessage(
      id: 'local-${DateTime.now().microsecondsSinceEpoch}',
      content: trimmed,
      createdAt: DateTime.now(),
      direction: 'out',
      role: 'user',
      webSessionId: sessionId,
    );
    optimisticMessages.add(local);
    notifyListeners();
    try {
      final fn = intent?.edgeFunction ?? 'waouh-channel-in';
      try {
        await supabase.functions.invoke(
          fn,
          body: {
            'message': trimmed,
            'text': trimmed,
            'web_session_id': sessionId,
            'auth_user_id': auth.user?.id,
            'source': 'flutter_native',
            'intent': intent?.name,
          },
        );
      } catch (_) {
        final waouhUserId = await resolveWaouhUserId();
        await supabase.from('waouh_messages').insert({
          'text': trimmed,
          'web_session_id': sessionId,
          if (waouhUserId != null) 'user_id': waouhUserId,
          'channel': 'flutter',
          'direction': 'in',
          'attachments': [],
          'meta': {
            'source': 'flutter_native',
            'intent': intent?.name,
            'fallback': true,
          },
        });
      }
    } finally {
      optimisticMessages.removeWhere((m) => m.id == local.id);
      notifyListeners();
    }
  }

  Future<void> sendConversationMessage(
    String conversationId,
    String body,
  ) async {
    final text = body.trim();
    if (text.isEmpty) return;
    try {
      await supabase.functions.invoke(
        'waouh-operator-send',
        body: {
          'conversation_id': conversationId,
          'message': text,
          'auth_user_id': auth.user?.id,
          'source': 'flutter_native',
        },
      );
    } catch (_) {
      final waouhUserId = await resolveWaouhUserId();
      await supabase.from('waouh_messages').insert({
        'conversation_id': conversationId,
        'text': text,
        if (waouhUserId != null) 'user_id': waouhUserId,
        'channel': 'flutter',
        'direction': 'out',
        'attachments': [],
        'meta': {'source': 'operator_fallback'},
      });
    }
  }

  Future<void> markConversationArchived(String id) async {
    try {
      await supabase
          .from('waouh_conversations')
          .update({'state': 'archived'})
          .eq('id', id);
    } catch (_) {
      await supabase
          .from('waouh_conversations')
          .update({'archived': true})
          .eq('id', id);
    }
  }
}

class StatusController extends ChangeNotifier {
  StatusController(this.auth);

  final AuthController auth;

  Future<String?> _resolveWaouhUserId() async {
    final uid = auth.user?.id;
    if (uid == null) return null;
    try {
      final row = await supabase
          .from('waouh_users')
          .select('id')
          .eq('auth_user_id', uid)
          .limit(1)
          .maybeSingle();
      if (row != null) return asString(row['id']);
    } catch (_) {}
    return null;
  }

  Stream<List<WaouhStatus>> statuses([StatusKind? kind]) {
    final query = supabase
        .from('waouh_statuses')
        .stream(primaryKey: ['id'])
        .order('created_at', ascending: false);
    return query.map((rows) {
      final list = rows
          .map(WaouhStatus.fromJson)
          .where((s) => s.isActive)
          .toList();
      return kind == null ? list : list.where((s) => s.kind == kind).toList();
    });
  }

  Future<void> publishStatus({
    required StatusKind kind,
    required String title,
    String? caption,
    num? price,
    String? location,
    List<String> mediaUrls = const [],
  }) async {
    final body = {
      'kind': kind.value,
      'type': kind.value,
      'title': title,
      'description': caption,
      'caption': caption,
      'price': price,
      'city': location,
      'location': location,
      'photos': mediaUrls,
      'media_urls': mediaUrls,
      'auth_user_id': auth.user?.id,
      'author_name': auth.profile?.fullName ?? auth.user?.email,
      'source': 'flutter_native',
    };
    try {
      await supabase.functions.invoke('waouh-status-publish', body: body);
    } catch (_) {
      try {
        final waouhUserId = await _resolveWaouhUserId();
        await supabase.from('waouh_statuses').insert({
          ...body,
          'expires_at': DateTime.now()
              .add(const Duration(hours: 24))
              .toIso8601String(),
          if (waouhUserId != null) 'user_id': waouhUserId,
        });
      } catch (_) {
        await supabase.from('waouh_statuses').insert({
          'kind': kind.value,
          'type': kind.value,
          'title': title,
          'description': caption,
          'caption': caption,
          'price': price,
          'city': location,
          'location': location,
          'photos': mediaUrls,
          'media_urls': mediaUrls,
          'expires_at': DateTime.now()
              .add(const Duration(hours: 24))
              .toIso8601String(),
        });
      }
    }
  }
}

class NotificationsController {
  Future<List<String>> _waouhUserIds(User? user) async {
    if (user == null) return const [];
    try {
      final rows = await supabase
          .from('waouh_users')
          .select('id')
          .eq('auth_user_id', user.id)
          .limit(100);
      return (rows as List)
          .map((row) => asString((row as Map)['id']))
          .where((id) => id.isNotEmpty)
          .toList();
    } catch (_) {
      return const [];
    }
  }

  Future<List<NotificationItem>> _fetch(User? user) async {
    final ids = await _waouhUserIds(user);
    if (ids.isEmpty) return const [];
    final rows = await supabase
        .from('waouh_notifications')
        .select()
        .inFilter('user_id', ids)
        .order('sent_at', ascending: false)
        .limit(100);
    return (rows as List)
        .map(
          (row) =>
              NotificationItem.fromJson(Map<String, dynamic>.from(row as Map)),
        )
        .toList();
  }

  Stream<List<NotificationItem>> stream(User? user) async* {
    if (user == null) {
      yield const [];
      return;
    }
    yield await _fetch(user);
    yield* Stream.periodic(
      const Duration(seconds: 5),
    ).asyncMap((_) => _fetch(user));
  }

  Future<void> markRead(String id) async {
    await supabase
        .from('waouh_notifications')
        .update({'opened': true, 'read_at': DateTime.now().toIso8601String()})
        .eq('id', id);
  }

  Future<void> markAllRead(User? user) async {
    final ids = await _waouhUserIds(user);
    if (ids.isEmpty) return;
    await supabase
        .from('waouh_notifications')
        .update({'opened': true, 'read_at': DateTime.now().toIso8601String()})
        .inFilter('user_id', ids);
  }
}

class PartnerController extends ChangeNotifier {
  PartnerController(this.auth);

  final AuthController auth;
  Partner? partner;
  bool loading = false;

  Future<void> ensurePartner() async {
    final uid = auth.user?.id;
    if (uid == null) return;
    loading = true;
    notifyListeners();
    try {
      final row = await supabase
          .from('waouh_partners')
          .select()
          .eq('user_id', uid)
          .maybeSingle();
      if (row != null) {
        partner = Partner.fromJson(row);
      } else {
        final inserted = await supabase
            .from('waouh_partners')
            .insert({
              'user_id': uid,
              'nom': auth.profile?.fullName ?? auth.user?.email ?? 'Partenaire',
              'email': auth.user?.email,
              // The real mobile app (PartnerHomeScreen.tsx) silently creates
              // the partner record as already-active: there is no manual
              // approval step on the mobile onboarding path.
              'statut': 'active',
            })
            .select()
            .single();
        partner = Partner.fromJson(inserted);
      }
    } finally {
      loading = false;
      notifyListeners();
    }
  }

  Stream<List<PartnerBusiness>> businesses() {
    final pid = partner?.id;
    if (pid == null) return const Stream.empty();
    return supabase
        .from('waouh_partner_businesses')
        .stream(primaryKey: ['id'])
        .eq('partner_id', pid)
        .order('created_at', ascending: false)
        .map((rows) => rows.map(PartnerBusiness.fromJson).toList());
  }

  Stream<List<PartnerProduct>> products(String businessId) {
    return supabase
        .from('waouh_partner_products')
        .stream(primaryKey: ['id'])
        .eq('business_id', businessId)
        .order('created_at', ascending: false)
        .map((rows) => rows.map(PartnerProduct.fromJson).toList());
  }

  Stream<List<PartnerSale>> sales() {
    final pid = partner?.id;
    if (pid == null) return const Stream.empty();
    return supabase
        .from('waouh_partner_sales')
        .stream(primaryKey: ['id'])
        .eq('partner_id', pid)
        .order('created_at', ascending: false)
        .map((rows) => rows.map(PartnerSale.fromJson).toList());
  }

  Future<void> requestPayout({required num amount}) async {
    final pid = partner?.id;
    if (pid == null || amount <= 0) return;
    await supabase.from('waouh_partner_payouts').insert({
      'partner_id': pid,
      'amount': amount,
      'operator': partner?.mobileMoneyOperator,
      'msisdn': partner?.mobileMoneyNumber,
      'status': 'pending',
      'source': 'flutter_native',
    });
  }

  Future<void> upsertBusiness({
    String? id,
    required String name,
    required String category,
    required String city,
    String? quarter,
    String? whatsapp,
    String? description,
    String? address,
    double? lat,
    double? lng,
  }) async {
    final pid = partner?.id;
    if (pid == null) return;
    final data = <String, dynamic>{
      'partner_id': pid,
      'nom': name,
      'nom_entreprise': name,
      'secteur': category,
      'categorie': category,
      'ville': city,
      'commune': quarter,
      'quartier': quarter,
      'telephone': whatsapp,
      'whatsapp': whatsapp,
      'description': description,
      'adresse_complete': address,
      'statut': 'active',
      if (lat != null) 'lat': lat,
      if (lng != null) 'lng': lng,
    };
    if (id == null) {
      await supabase.from('waouh_partner_businesses').insert(data);
    } else {
      await supabase.from('waouh_partner_businesses').update(data).eq('id', id);
    }
  }

  /// Mirrors `PartnerBusinessesNativeScreen.tsx`'s `remove()`: if any sale is
  /// linked to this business, it is paused (soft-deleted) instead of being
  /// destroyed, to keep the sales history intact.
  Future<bool> removeBusiness(String id) async {
    final countResponse = await supabase
        .from('waouh_partner_sales')
        .select('id')
        .eq('business_id', id)
        .count(CountOption.exact);
    final linkedCount = countResponse.count;
    if (linkedCount > 0) {
      await supabase
          .from('waouh_partner_businesses')
          .update({'statut': 'pause'})
          .eq('id', id);
      return false; // paused, not deleted
    }
    await supabase.from('waouh_partner_businesses').delete().eq('id', id);
    return true; // actually deleted
  }

  Future<void> upsertProduct({
    String? id,
    required String businessId,
    required String name,
    String? description,
    String? category,
    String? unit,
    num? price,
    int? stock,
    bool available = true,
    List<String> photos = const [],
  }) async {
    final pid = partner?.id;
    if (pid == null) return;
    final data = <String, dynamic>{
      'partner_id': pid,
      'business_id': businessId,
      'title': name,
      'nom': name,
      'description': description,
      'category': category,
      'categorie': category,
      'unit': unit,
      'unite': unit,
      'price': price,
      'prix_min': price,
      'prix_max': price,
      'stock': stock,
      'stock_estime': stock,
      'disponible': available,
      'published_to_waouh': available,
      'photos': photos,
    };
    if (id == null) {
      await supabase.from('waouh_partner_products').insert(data);
    } else {
      await supabase.from('waouh_partner_products').update(data).eq('id', id);
    }
  }

  Future<void> removeProduct(String id) async {
    await supabase.from('waouh_partner_products').delete().eq('id', id);
  }

  /// Updates only the `photos` array — used by the product viewer's quick
  /// "change photos" action so it never touches name/price/stock fields.
  Future<void> updateProductPhotos(String id, List<String> photos) async {
    await supabase
        .from('waouh_partner_products')
        .update({'photos': photos})
        .eq('id', id);
  }

  /// Calls the same `waouh-partner-ai` Edge Function the React app uses to
  /// turn GPS coordinates into a city/quarter/address guess.
  Future<Map<String, String>?> reverseGeocode(double lat, double lng) async {
    try {
      final response = await supabase.functions.invoke(
        'waouh-partner-ai',
        body: {
          'action': 'reverse_geocode',
          'payload': {'lat': lat, 'lng': lng},
        },
      );
      final data = response.data;
      if (data is! Map || data['error'] != null) return null;
      final inner = data['data'];
      if (inner is! Map) return null;
      return {
        'ville': asString(inner['ville']),
        'quartier': asString(inner['quartier']),
        'adresse_complete': asString(inner['adresse_complete']),
      };
    } catch (_) {
      return null;
    }
  }

  /// Uploads up to [max] product photos to the `waouh-media` bucket under
  /// `partner-products/`, the exact bucket+folder the React app
  /// (ProductPhotoUploader.tsx) uses — keeping photos interchangeable
  /// between the Flutter and web/React clients.
  Future<String> uploadProductPhoto({
    required List<int> bytes,
    required String fileName,
  }) async {
    final pieces = fileName.toLowerCase().split('.');
    final extension = pieces.length > 1 ? pieces.last : 'jpg';
    final contentType = switch (extension) {
      'png' => 'image/png',
      'webp' => 'image/webp',
      _ => 'image/jpeg',
    };
    final nonce = Random().nextInt(0x6c5ce1).toRadixString(36);
    final path =
        'partner-products/${DateTime.now().millisecondsSinceEpoch}-$nonce.$extension';
    await supabase.storage
        .from('waouh-media')
        .uploadBinary(
          path,
          Uint8List.fromList(bytes),
          fileOptions: FileOptions(contentType: contentType, upsert: false),
        );
    return supabase.storage.from('waouh-media').getPublicUrl(path);
  }
}

class WaouhNativeApp extends StatelessWidget {
  const WaouhNativeApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthController()),
        ChangeNotifierProxyProvider<AuthController, WaouhChatController>(
          create: (context) =>
              WaouhChatController(context.read<AuthController>()),
          update: (_, auth, previous) => previous ?? WaouhChatController(auth),
        ),
        ChangeNotifierProxyProvider<AuthController, StatusController>(
          create: (context) => StatusController(context.read<AuthController>()),
          update: (_, auth, previous) => previous ?? StatusController(auth),
        ),
        Provider(create: (_) => NotificationsController()),
        ChangeNotifierProxyProvider<AuthController, PartnerController>(
          create: (context) =>
              PartnerController(context.read<AuthController>()),
          update: (_, auth, previous) => previous ?? PartnerController(auth),
        ),
      ],
      child: Builder(
        builder: (context) {
          final router = _buildRouter(context.read<AuthController>());
          return MaterialApp.router(
            debugShowCheckedModeBanner: false,
            title: 'WaouhApp',
            theme: buildWaouhTheme(),
            routerConfig: router,
          );
        },
      ),
    );
  }
}

class WaouhStartupApp extends StatefulWidget {
  const WaouhStartupApp({super.key});

  @override
  State<WaouhStartupApp> createState() => _WaouhStartupAppState();
}

class _WaouhStartupAppState extends State<WaouhStartupApp> {
  late final Future<void> _backendReady;

  @override
  void initState() {
    super.initState();
    _backendReady = initializeWaouhBackend();
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<void>(
      future: _backendReady,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.done &&
            !snapshot.hasError) {
          return const WaouhNativeApp();
        }
        if (snapshot.hasError) {
          return WaouhBootErrorApp(
            error: snapshot.error ?? 'Backend indisponible',
          );
        }
        return MaterialApp(
          debugShowCheckedModeBanner: false,
          theme: buildWaouhTheme(),
          home: const WaouhBootSplash(),
        );
      },
    );
  }
}

class WaouhBootSplash extends StatelessWidget {
  const WaouhBootSplash({super.key});

  @override
  Widget build(BuildContext context) {
    final next = currentNextRoute(context);
    String authPath(String path) =>
        next == null ? path : '$path?next=${Uri.encodeComponent(next)}';
    return Scaffold(
      backgroundColor: WaouhColors.deep,
      body: SafeArea(
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 92,
                height: 92,
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(28),
                  border: Border.all(color: Colors.white.withOpacity(0.18)),
                ),
                child: const Icon(
                  Icons.chat_bubble_outline_rounded,
                  color: Colors.white,
                  size: 44,
                ),
              ),
              const SizedBox(height: 24),
              const Text(
                'WaouhApp',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 32,
                  fontWeight: FontWeight.w900,
                ),
              ),
              const SizedBox(height: 10),
              const Text(
                'Connexion au service...',
                style: TextStyle(
                  color: Color(0xFFCDE7DD),
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 28),
              const SizedBox(
                width: 30,
                height: 30,
                child: CircularProgressIndicator(
                  strokeWidth: 3,
                  color: WaouhColors.neon,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class WaouhBootErrorApp extends StatelessWidget {
  const WaouhBootErrorApp({super.key, required this.error});

  final Object error;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      theme: buildWaouhTheme(),
      home: Scaffold(
        backgroundColor: WaouhColors.pearl,
        body: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Icon(
                  Icons.error_outline,
                  color: WaouhColors.red,
                  size: 56,
                ),
                const SizedBox(height: 20),
                const Text(
                  'WaouhApp ne peut pas demarrer',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 24, fontWeight: FontWeight.w900),
                ),
                const SizedBox(height: 12),
                const Text(
                  "Le service de connexion n'a pas pu etre initialise. Verifiez internet puis relancez l'application.",
                  textAlign: TextAlign.center,
                  style: TextStyle(color: WaouhColors.muted, height: 1.4),
                ),
                const SizedBox(height: 16),
                Text(
                  error.toString(),
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: WaouhColors.red, fontSize: 12),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

String? currentNextRoute(BuildContext context) {
  try {
    return GoRouterState.of(context).uri.queryParameters['next'];
  } catch (_) {
    try {
      return GoRouter.of(
        context,
      ).routeInformationProvider.value.uri.queryParameters['next'];
    } catch (_) {
      return null;
    }
  }
}

GoRouter _buildRouter(AuthController auth) {
  final protected = <String>[
    '/app/chat/',
    '/app/bots',
    '/app/whatsapp',
    '/app/diffusion',
    '/app/partner',
    '/app/profile',
    '/app/notifications',
  ];
  return GoRouter(
    initialLocation: '/app/chat',
    refreshListenable: auth,
    redirect: (context, state) {
      final path = state.uri.path;
      final isAuthRoute = path.startsWith('/app/auth');
      final needsAuth = protected.any(path.startsWith);
      if (!auth.signedIn && needsAuth) {
        return '/app/auth?next=${Uri.encodeComponent(path)}';
      }
      if (auth.signedIn && isAuthRoute)
        return state.uri.queryParameters['next'] ?? '/app/chat';
      return null;
    },
    routes: [
      GoRoute(path: '/', redirect: (_, __) => '/app/chat'),
      GoRoute(path: '/app/auth', builder: (_, __) => const OnboardingScreen()),
      GoRoute(
        path: '/app/auth/email',
        builder: (_, __) => const EmailAuthScreen(),
      ),
      GoRoute(
        path: '/app/auth/whatsapp',
        builder: (_, __) => const WhatsAppOtpScreen(),
      ),
      ShellRoute(
        builder: (context, state, child) =>
            MobileShell(path: state.uri.path, child: child),
        routes: [
          GoRoute(
            path: '/app/chat',
            builder: (_, __) => const ChatInboxScreen(),
          ),
          GoRoute(
            path: '/app/chat/waouh',
            builder: (_, __) => const WaouhChatScreen(),
          ),
          GoRoute(
            path: '/app/notifications',
            builder: (_, __) => const NotificationsScreen(),
          ),
          GoRoute(
            path: '/app/chat/:id',
            builder: (_, state) =>
                ConversationScreen(id: state.pathParameters['id']!),
          ),
          GoRoute(path: '/app/bots', builder: (_, __) => const BotsScreen()),
          GoRoute(
            path: '/app/whatsapp',
            builder: (_, __) => const WhatsAppIaScreen(),
          ),
          GoRoute(
            path: '/app/diffusion',
            builder: (_, __) => const DiffusionScreen(),
          ),
          GoRoute(
            path: '/app/partner',
            builder: (_, __) => const PartnerHomeScreen(),
          ),
          GoRoute(
            path: '/app/partner/businesses/:businessId/products',
            builder: (_, state) => PartnerProductsScreen(
              businessId: state.pathParameters['businessId']!,
            ),
          ),
          GoRoute(
            path: '/app/profile',
            builder: (_, __) => const ProfileScreen(),
          ),
        ],
      ),
    ],
  );
}

class MobileShell extends StatelessWidget {
  const MobileShell({super.key, required this.path, required this.child});

  final String path;
  final Widget child;

  int get index {
    if (path.startsWith('/app/bots')) return 1;
    if (path.startsWith('/app/whatsapp')) return 2;
    if (path.startsWith('/app/diffusion')) return 3;
    if (path.startsWith('/app/partner')) return 4;
    return 0;
  }

  @override
  Widget build(BuildContext context) {
    final hideNav = path.startsWith('/app/chat/') && path != '/app/chat/waouh';
    return Scaffold(
      body: child,
      bottomNavigationBar: hideNav
          ? null
          : NavigationBar(
              selectedIndex: index,
              onDestinationSelected: (i) {
                final route = switch (i) {
                  1 => '/app/bots',
                  2 => '/app/whatsapp',
                  3 => '/app/diffusion',
                  4 => '/app/partner',
                  _ => '/app/chat',
                };
                context.go(route);
              },
              destinations: const [
                NavigationDestination(
                  icon: Icon(Icons.chat_bubble_outline),
                  label: 'Chat',
                ),
                NavigationDestination(
                  icon: Icon(Icons.smart_toy_outlined),
                  label: 'Bots',
                ),
                NavigationDestination(
                  icon: Icon(Icons.phone_iphone_outlined),
                  label: 'WhatsApp IA',
                ),
                NavigationDestination(
                  icon: Icon(Icons.campaign_outlined),
                  label: 'Diffusion',
                ),
                NavigationDestination(
                  icon: Icon(Icons.storefront_outlined),
                  label: 'Partenaire',
                ),
              ],
            ),
    );
  }
}

class PremiumHeader extends StatelessWidget implements PreferredSizeWidget {
  const PremiumHeader({
    super.key,
    required this.title,
    this.subtitle,
    this.actions = const [],
    this.showBack = false,
  });

  final String title;
  final String? subtitle;
  final List<Widget> actions;
  final bool showBack;

  @override
  Size get preferredSize => const Size.fromHeight(92);

  @override
  Widget build(BuildContext context) {
    return AppBar(
      toolbarHeight: 92,
      automaticallyImplyLeading: false,
      titleSpacing: 16,
      leading: showBack
          ? IconButton(
              onPressed: () {
                if (context.canPop()) {
                  context.pop();
                } else {
                  context.go('/app/chat');
                }
              },
              icon: const Icon(Icons.arrow_back_rounded),
            )
          : null,
      title: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            title,
            style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 22),
          ),
          if (subtitle != null)
            Text(
              subtitle!,
              style: const TextStyle(
                color: Color(0xFFC9F6E3),
                fontSize: 13,
                fontWeight: FontWeight.w700,
              ),
            ),
        ],
      ),
      actions: actions,
      flexibleSpace: const DecoratedBox(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [WaouhColors.deep, WaouhColors.green, Color(0xFF031F1A)],
          ),
        ),
      ),
    );
  }
}

class WaCard extends StatelessWidget {
  const WaCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(16),
    this.color,
  });

  final Widget child;
  final EdgeInsets padding;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    return Card(
      color: color,
      child: Padding(padding: padding, child: child),
    );
  }
}

class OnboardingScreen extends StatelessWidget {
  const OnboardingScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final items = [
      (
        Icons.shopping_bag_outlined,
        'Vendre',
        'Publiez un article en 30s',
        WaouhColors.neon,
      ),
      (
        Icons.search_rounded,
        'Acheter',
        'Trouvez pres de vous',
        WaouhColors.blue,
      ),
      (
        Icons.handshake_outlined,
        'Negocier',
        'Proposez votre prix',
        WaouhColors.orange,
      ),
    ];
    final next = currentNextRoute(context);
    String authPath(String path) =>
        next == null ? path : '$path?next=${Uri.encodeComponent(next)}';
    return Scaffold(
      backgroundColor: WaouhColors.deep,
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) {
            return SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: ConstrainedBox(
                constraints: BoxConstraints(
                  minHeight: constraints.maxHeight - 48,
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      children: [
                        const SizedBox(height: 20),
                        Container(
                          height: 92,
                          width: 92,
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(.12),
                            borderRadius: BorderRadius.circular(28),
                            border: Border.all(color: Colors.white24),
                          ),
                          child: const Icon(
                            Icons.chat_bubble_outline,
                            color: Colors.white,
                            size: 44,
                          ),
                        ),
                        const SizedBox(height: 24),
                        const Text(
                          'WaouhApp',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 42,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                        const SizedBox(height: 18),
                        const Text(
                          'Envoie un message.',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 28,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                        const Text(
                          'Le monde achete.',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            color: WaouhColors.neon,
                            fontSize: 27,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                        const SizedBox(height: 32),
                        ...items.map(
                          (item) => Padding(
                            padding: const EdgeInsets.only(bottom: 14),
                            child: Container(
                              padding: const EdgeInsets.all(18),
                              decoration: BoxDecoration(
                                color: Colors.white.withOpacity(.12),
                                borderRadius: BorderRadius.circular(24),
                                border: Border.all(
                                  color: Colors.white.withOpacity(.16),
                                ),
                              ),
                              child: Row(
                                children: [
                                  CircleAvatar(
                                    backgroundColor: item.$4,
                                    child: Icon(
                                      item.$1,
                                      color: item.$4 == WaouhColors.neon
                                          ? WaouhColors.ink
                                          : Colors.white,
                                    ),
                                  ),
                                  const SizedBox(width: 16),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          item.$2,
                                          style: const TextStyle(
                                            color: Colors.white,
                                            fontWeight: FontWeight.w900,
                                            fontSize: 22,
                                          ),
                                        ),
                                        Text(
                                          item.$3,
                                          style: const TextStyle(
                                            color: Color(0xFFBFD8CE),
                                            fontWeight: FontWeight.w700,
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
                      ],
                    ),
                    Padding(
                      padding: const EdgeInsets.only(top: 24, bottom: 8),
                      child: Column(
                        children: [
                          FilledButton(
                            style: FilledButton.styleFrom(
                              backgroundColor: WaouhColors.neon,
                              foregroundColor: WaouhColors.ink,
                            ),
                            onPressed: () =>
                                context.go(authPath('/app/auth/whatsapp')),
                            child: const Text('Continuer avec WhatsApp'),
                          ),
                          const SizedBox(height: 12),
                          FilledButton(
                            style: FilledButton.styleFrom(
                              backgroundColor: Colors.white,
                              foregroundColor: WaouhColors.green,
                            ),
                            onPressed: () =>
                                context.go(authPath('/app/auth/email')),
                            child: const Text('Continuer avec Email'),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}

class EmailAuthScreen extends StatefulWidget {
  const EmailAuthScreen({super.key});

  @override
  State<EmailAuthScreen> createState() => _EmailAuthScreenState();
}

class _EmailAuthScreenState extends State<EmailAuthScreen> {
  var tab = 0;
  final name = TextEditingController();
  final email = TextEditingController();
  final password = TextEditingController();
  final confirm = TextEditingController();

  Future<void> _submit(BuildContext context, AuthController auth) async {
    try {
      if (tab == 0) await auth.signInWithEmail(email.text, password.text);
      if (tab == 1) {
        if (password.text != confirm.text) {
          throw Exception('Les mots de passe ne correspondent pas');
        }
        await auth.signUpWithEmail(name.text, email.text, password.text);
      }
      if (tab == 2) await auth.resetPassword(email.text);
      if (context.mounted && tab != 2) {
        context.go(currentNextRoute(context) ?? '/app/chat');
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(e.toString())));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthController>();
    return Scaffold(
      appBar: PremiumHeader(
        title: tab == 0
            ? 'Se connecter'
            : tab == 1
            ? 'Creer un compte'
            : 'Mot de passe',
        showBack: true,
      ),
      body: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          SegmentedButton<int>(
            segments: const [
              ButtonSegment(value: 0, label: Text('Connexion')),
              ButtonSegment(value: 1, label: Text('Inscription')),
              ButtonSegment(value: 2, label: Text('Mot de passe')),
            ],
            selected: {tab},
            onSelectionChanged: (v) => setState(() => tab = v.first),
          ),
          const SizedBox(height: 24),
          OutlinedButton.icon(
            onPressed: auth.loading ? null : () => auth.signInWithGoogle(),
            icon: const Icon(Icons.g_mobiledata_rounded, size: 28),
            label: Text(
              tab == 1 ? 'S inscrire avec Google' : 'Continuer avec Google',
            ),
          ),
          const SizedBox(height: 24),
          Center(
            child: Text(
              'OU PAR EMAIL',
              style: TextStyle(
                color: Theme.of(context).colorScheme.outline,
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
          const SizedBox(height: 24),
          if (tab == 1) ...[
            TextField(
              controller: name,
              decoration: const InputDecoration(
                labelText: 'Nom complet',
                prefixIcon: Icon(Icons.person_outline),
              ),
            ),
            const SizedBox(height: 16),
          ],
          TextField(
            controller: email,
            keyboardType: TextInputType.emailAddress,
            decoration: const InputDecoration(
              labelText: 'Email',
              prefixIcon: Icon(Icons.email_outlined),
            ),
          ),
          if (tab != 2) ...[
            const SizedBox(height: 16),
            TextField(
              controller: password,
              obscureText: true,
              decoration: const InputDecoration(
                labelText: 'Mot de passe',
                prefixIcon: Icon(Icons.lock_outline),
              ),
            ),
          ],
          if (tab == 1) ...[
            const SizedBox(height: 16),
            TextField(
              controller: confirm,
              obscureText: true,
              decoration: const InputDecoration(
                labelText: 'Confirmer le mot de passe',
                prefixIcon: Icon(Icons.lock_outline),
              ),
            ),
          ],
          const SizedBox(height: 24),
          if (auth.error != null)
            Text(
              auth.error!,
              style: const TextStyle(
                color: WaouhColors.red,
                fontWeight: FontWeight.w700,
              ),
            ),
          const SizedBox(height: 12),
          FilledButton(
            onPressed: auth.loading ? null : () => _submit(context, auth),
            child: auth.loading
                ? const CircularProgressIndicator()
                : Text(
                    tab == 0
                        ? 'Se connecter'
                        : tab == 1
                        ? 'Creer le compte'
                        : 'Envoyer le lien',
                  ),
          ),
          if (tab == 0)
            TextButton(
              onPressed: () => setState(() => tab = 2),
              child: const Text('Mot de passe oublie ?'),
            ),
          Padding(
            padding: const EdgeInsets.only(top: 44),
            child: Text(
              'En continuant, vous acceptez nos conditions d utilisation.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Theme.of(context).colorScheme.outline),
            ),
          ),
        ],
      ),
      bottomNavigationBar: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(24, 8, 24, 18),
          child: FilledButton(
            onPressed: auth.loading ? null : () => _submit(context, auth),
            child: auth.loading
                ? const CircularProgressIndicator()
                : Text(
                    tab == 0
                        ? 'Se connecter'
                        : tab == 1
                        ? 'Creer le compte'
                        : 'Envoyer le lien',
                  ),
          ),
        ),
      ),
    );
  }
}

class WhatsAppOtpScreen extends StatefulWidget {
  const WhatsAppOtpScreen({super.key});

  @override
  State<WhatsAppOtpScreen> createState() => _WhatsAppOtpScreenState();
}

class _WhatsAppOtpScreenState extends State<WhatsAppOtpScreen> {
  final phone = TextEditingController(text: '+229');
  final code = TextEditingController();
  bool sent = false;

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthController>();
    return Scaffold(
      appBar: PremiumHeader(
        title: 'WhatsApp',
        subtitle: sent ? 'Verification du code' : 'Connexion +229',
        showBack: true,
      ),
      body: ListView(
        padding: const EdgeInsets.all(28),
        children: [
          const SizedBox(height: 38),
          const Icon(
            Icons.chat_bubble_outline,
            size: 86,
            color: WaouhColors.neon,
          ),
          const SizedBox(height: 40),
          if (!sent) ...[
            TextField(
              controller: phone,
              keyboardType: TextInputType.phone,
              decoration: const InputDecoration(labelText: 'Numero WhatsApp'),
            ),
            const SizedBox(height: 14),
            const Text(
              'Le code sera envoye directement sur WhatsApp. Assurez-vous que ce numero possede un compte WhatsApp actif.',
            ),
            const SizedBox(height: 42),
            FilledButton(
              onPressed: auth.loading
                  ? null
                  : () async {
                      await auth.requestWhatsappOtp(phone.text);
                      setState(() => sent = true);
                    },
              child: const Text('Envoyer le code'),
            ),
          ] else ...[
            Text(
              'Code recu sur ${phone.text}',
              textAlign: TextAlign.center,
              style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 18),
            ),
            const SizedBox(height: 22),
            TextField(
              controller: code,
              maxLength: 6,
              keyboardType: TextInputType.number,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.w900,
                letterSpacing: 8,
              ),
              decoration: const InputDecoration(
                counterText: '',
                labelText: 'Code a 6 chiffres',
              ),
            ),
            const SizedBox(height: 32),
            FilledButton(
              onPressed: auth.loading
                  ? null
                  : () async {
                      await auth.verifyWhatsappOtp(phone.text, code.text);
                      if (context.mounted)
                        context.go(currentNextRoute(context) ?? '/app/chat');
                    },
              child: const Text('Verifier'),
            ),
            TextButton(
              onPressed: () => setState(() => sent = false),
              child: const Text('Modifier le numero'),
            ),
          ],
        ],
      ),
    );
  }
}

class ChatInboxScreen extends StatefulWidget {
  const ChatInboxScreen({super.key});

  @override
  State<ChatInboxScreen> createState() => _ChatInboxScreenState();
}

class _ChatInboxScreenState extends State<ChatInboxScreen> {
  var tab = 0;
  StatusKind? filter;
  final search = TextEditingController();

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthController>();
    return Scaffold(
      appBar: PremiumHeader(
        title: auth.profile?.fullName ?? 'WaouhApp',
        subtitle: auth.signedIn ? 'WAOUH actif' : 'Invite',
        actions: [
          IconButton(
            onPressed: () => context.go('/app/notifications'),
            icon: const Icon(Icons.notifications_none_rounded),
          ),
          IconButton(
            onPressed: () => context.go('/app/chat/waouh'),
            icon: const Icon(Icons.add_rounded),
          ),
        ],
      ),
      body: Column(
        children: [
          Container(
            color: WaouhColors.green,
            padding: const EdgeInsets.fromLTRB(18, 0, 18, 18),
            child: TextField(
              controller: search,
              onChanged: (_) => setState(() {}),
              style: const TextStyle(color: Colors.white),
              decoration: InputDecoration(
                hintText: 'Rechercher discussions, statuts...',
                hintStyle: TextStyle(color: Colors.white.withOpacity(.68)),
                prefixIcon: const Icon(Icons.search, color: Colors.white70),
                fillColor: Colors.white.withOpacity(.14),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16),
                  borderSide: BorderSide.none,
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16),
                  borderSide: BorderSide.none,
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16),
                  borderSide: BorderSide.none,
                ),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(18, 14, 18, 8),
            child: SegmentedButton<int>(
              segments: const [
                ButtonSegment(value: 0, label: Text('Discussions')),
                ButtonSegment(value: 1, label: Text('Statuts · 24h')),
              ],
              selected: {tab},
              onSelectionChanged: (v) => setState(() => tab = v.first),
            ),
          ),
          Expanded(
            child: tab == 0
                ? _DiscussionsList(search: search.text)
                : _StatusesPanel(
                    filter: filter,
                    onFilter: (v) => setState(() => filter = v),
                  ),
          ),
        ],
      ),
    );
  }
}

class _DiscussionsList extends StatelessWidget {
  const _DiscussionsList({required this.search});

  final String search;

  @override
  Widget build(BuildContext context) {
    final chat = context.watch<WaouhChatController>();
    final auth = context.watch<AuthController>();
    return StreamBuilder<List<WaouhConversation>>(
      stream: chat.conversations(),
      builder: (context, snapshot) {
        final convs = (snapshot.data ?? const <WaouhConversation>[])
            .where(
              (c) =>
                  search.isEmpty ||
                  (c.lastMessage ?? '').toLowerCase().contains(
                    search.toLowerCase(),
                  ) ||
                  (c.phoneNumber ?? '').contains(search),
            )
            .toList();
        return ListView(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
          children: [
            WaCard(
              color: const Color(0xFFECFFF5),
              child: InkWell(
                onTap: () {
                  if (!auth.signedIn) {
                    context.go('/app/auth');
                  } else {
                    context.go('/app/chat/waouh');
                  }
                },
                child: Row(
                  children: [
                    const CircleAvatar(
                      radius: 28,
                      backgroundColor: WaouhColors.jade,
                      child: Icon(
                        Icons.shopping_bag_outlined,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: const [
                          Row(
                            children: [
                              Text(
                                'WAOUH',
                                style: TextStyle(
                                  fontSize: 21,
                                  fontWeight: FontWeight.w900,
                                ),
                              ),
                              SizedBox(width: 8),
                              Chip(
                                label: Text('IA'),
                                visualDensity: VisualDensity.compact,
                              ),
                            ],
                          ),
                          Text(
                            'Achetez · Vendez · Negociez par message',
                            style: TextStyle(
                              color: WaouhColors.muted,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const Text(
                      'Toujours actif',
                      style: TextStyle(
                        color: WaouhColors.green,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 14),
              child: Row(
                children: [
                  const Expanded(
                    child: Text(
                      'CONVERSATIONS PRODUIT',
                      style: TextStyle(
                        color: WaouhColors.muted,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ),
                  Text(
                    'Voir tout (${convs.length})',
                    style: const TextStyle(
                      color: WaouhColors.jade,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ],
              ),
            ),
            if (convs.isEmpty)
              WaCard(
                child: Column(
                  children: [
                    const SizedBox(height: 20),
                    const Icon(
                      Icons.forum_outlined,
                      size: 48,
                      color: WaouhColors.muted,
                    ),
                    const SizedBox(height: 12),
                    const Text(
                      'Aucune autre conversation',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    const Text(
                      'Envoyez un message a WAOUH et le Monde achete.',
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 20),
                    FilledButton.icon(
                      onPressed: () => context.go('/app/chat/waouh'),
                      icon: const Icon(Icons.add),
                      label: const Text('Nouveau chat WAOUH'),
                    ),
                  ],
                ),
              )
            else
              ...convs.map(
                (c) => Slidable(
                  key: ValueKey(c.id),
                  endActionPane: ActionPane(
                    motion: const DrawerMotion(),
                    children: [
                      SlidableAction(
                        onPressed: (_) => chat.markConversationArchived(c.id),
                        backgroundColor: WaouhColors.orange,
                        foregroundColor: Colors.white,
                        icon: Icons.archive_outlined,
                        label: 'Archiver',
                      ),
                    ],
                  ),
                  child: ListTile(
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 6,
                      vertical: 6,
                    ),
                    leading: CircleAvatar(
                      backgroundColor: WaouhColors.sky,
                      child: Text((c.phoneNumber ?? 'W').characters.first),
                    ),
                    title: Text(
                      c.phoneNumber ?? 'Annonce',
                      style: const TextStyle(fontWeight: FontWeight.w900),
                    ),
                    subtitle: Text(
                      c.lastMessage ?? 'Conversation WAOUH',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    trailing: Text(
                      stamp(c.updatedAt),
                      style: const TextStyle(
                        color: WaouhColors.muted,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    onTap: () => context.go('/app/chat/${c.id}'),
                  ),
                ),
              ),
          ],
        );
      },
    );
  }
}

class _StatusesPanel extends StatelessWidget {
  const _StatusesPanel({required this.filter, required this.onFilter});

  final StatusKind? filter;
  final ValueChanged<StatusKind?> onFilter;

  @override
  Widget build(BuildContext context) {
    final statuses = context.watch<StatusController>();
    return Column(
      children: [
        SizedBox(
          height: 58,
          child: ListView(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            scrollDirection: Axis.horizontal,
            children: [
              FilledButton.icon(
                onPressed: () => showStatusComposer(context),
                icon: const Icon(Icons.add),
                label: const Text('Publier · 24h'),
              ),
              const SizedBox(width: 10),
              ChoiceChip(
                label: const Text('Tous'),
                selected: filter == null,
                onSelected: (_) => onFilter(null),
              ),
              const SizedBox(width: 8),
              ...StatusKind.values.map(
                (k) => Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: ChoiceChip(
                    label: Text(k.label),
                    selected: filter == k,
                    onSelected: (_) => onFilter(k),
                  ),
                ),
              ),
            ],
          ),
        ),
        Expanded(
          child: StreamBuilder<List<WaouhStatus>>(
            stream: statuses.statuses(filter),
            builder: (context, snapshot) {
              final list = snapshot.data ?? const <WaouhStatus>[];
              if (list.isEmpty) {
                return ListView(
                  padding: const EdgeInsets.all(24),
                  children: const [
                    WaCard(
                      child: Padding(
                        padding: EdgeInsets.symmetric(vertical: 34),
                        child: Column(
                          children: [
                            CircleAvatar(
                              radius: 34,
                              backgroundColor: WaouhColors.amber,
                              child: Icon(
                                Icons.auto_awesome,
                                color: WaouhColors.orange,
                              ),
                            ),
                            SizedBox(height: 18),
                            Text(
                              'Aucun statut actif',
                              style: TextStyle(
                                fontSize: 20,
                                fontWeight: FontWeight.w900,
                              ),
                            ),
                            Text(
                              'Publiez une vente urgente, une recherche ou une promo visible 24h.',
                              textAlign: TextAlign.center,
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                );
              }
              return ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: list.length,
                itemBuilder: (context, i) => StatusCard(status: list[i]),
              );
            },
          ),
        ),
      ],
    );
  }
}

class StatusCard extends StatelessWidget {
  const StatusCard({super.key, required this.status});

  final WaouhStatus status;

  @override
  Widget build(BuildContext context) {
    return WaCard(
      child: InkWell(
        onTap: () => Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => StatusViewerScreen(statuses: [status]),
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                CircleAvatar(
                  backgroundColor: status.kind.color,
                  child: Icon(
                    status.kind == StatusKind.buy
                        ? Icons.search
                        : Icons.storefront,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    status.title,
                    style: const TextStyle(
                      fontSize: 19,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ),
                Chip(label: Text(status.kind.label)),
              ],
            ),
            if (status.caption != null)
              Padding(
                padding: const EdgeInsets.only(top: 10),
                child: Text(status.caption!),
              ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              children: [
                if (status.price != null)
                  Chip(label: Text('${money(status.price!)} FCFA')),
                if (status.location != null)
                  Chip(label: Text(status.location!)),
                Chip(label: Text('${status.views} vues')),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

void showStatusComposer(BuildContext context) {
  if (!context.read<AuthController>().signedIn) {
    context.go('/app/auth?next=${Uri.encodeComponent('/app/chat')}');
    return;
  }
  showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    builder: (_) => const StatusComposerSheet(),
  );
}

class StatusComposerSheet extends StatefulWidget {
  const StatusComposerSheet({super.key});

  @override
  State<StatusComposerSheet> createState() => _StatusComposerSheetState();
}

class _StatusComposerSheetState extends State<StatusComposerSheet> {
  var step = 0;
  var kind = StatusKind.sell;
  final title = TextEditingController();
  final price = TextEditingController();
  final location = TextEditingController(text: 'Cotonou');
  final caption = TextEditingController();
  final photos = <String>[];

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        left: 22,
        right: 22,
        top: 18,
        bottom: MediaQuery.of(context).viewInsets.bottom + 22,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              const Expanded(
                child: Text(
                  'Publier un statut · 24h',
                  style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900),
                ),
              ),
              IconButton(
                onPressed: () => Navigator.pop(context),
                icon: const Icon(Icons.close),
              ),
            ],
          ),
          LinearProgressIndicator(
            value: (step + 1) / 4,
            color: WaouhColors.jade,
          ),
          const SizedBox(height: 20),
          if (step == 0)
            ...StatusKind.values.map(
              (k) => Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: RadioListTile<StatusKind>(
                  value: k,
                  groupValue: kind,
                  onChanged: (v) => setState(() => kind = v ?? k),
                  title: Text(
                    k.label,
                    style: const TextStyle(fontWeight: FontWeight.w900),
                  ),
                  subtitle: Text(
                    k == StatusKind.sell
                        ? 'Urgence vente'
                        : k == StatusKind.buy
                        ? 'Recherche urgente'
                        : 'Promo · info',
                  ),
                  secondary: CircleAvatar(
                    backgroundColor: k.color,
                    child: const Icon(Icons.bolt, color: Colors.white),
                  ),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(18),
                    side: const BorderSide(color: WaouhColors.line),
                  ),
                ),
              ),
            ),
          if (step == 1) ...[
            TextField(
              controller: title,
              decoration: InputDecoration(
                labelText: kind == StatusKind.sell
                    ? 'Titre court *'
                    : 'Objet *',
                hintText: 'Ex: iPhone 13 256Go neuf',
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: price,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(
                labelText: 'Prix / budget (FCFA)',
              ),
            ),
          ],
          if (step == 2) ...[
            FilledButton.icon(
              onPressed: () => setState(() => location.text = 'Cotonou'),
              icon: const Icon(Icons.my_location),
              label: const Text('Utiliser ma position GPS'),
            ),
            const SizedBox(height: 18),
            TextField(
              controller: location,
              decoration: const InputDecoration(labelText: 'Ville ou quartier'),
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              children:
                  [
                        'Cotonou',
                        'Abomey-Calavi',
                        'Porto-Novo',
                        'Parakou',
                        'Bohicon',
                      ]
                      .map(
                        (city) => ActionChip(
                          label: Text(city),
                          onPressed: () => setState(() => location.text = city),
                        ),
                      )
                      .toList(),
            ),
          ],
          if (step == 3) ...[
            TextField(
              controller: caption,
              minLines: 3,
              maxLines: 5,
              decoration: const InputDecoration(labelText: 'Detail optionnel'),
            ),
            const SizedBox(height: 14),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: photos.length >= 2
                        ? null
                        : () => setState(
                            () => photos.add('camera://${photos.length + 1}'),
                          ),
                    icon: const Icon(Icons.camera_alt_outlined),
                    label: const Text('Prendre photo'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: photos.length >= 2
                        ? null
                        : () => setState(
                            () => photos.add('gallery://${photos.length + 1}'),
                          ),
                    icon: const Icon(Icons.photo_outlined),
                    label: const Text('Galerie'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Text('${photos.length} / 2 photo'),
          ],
          const SizedBox(height: 24),
          Row(
            children: [
              if (step > 0)
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => setState(() => step--),
                    icon: const Icon(Icons.arrow_back),
                    label: const Text('Retour'),
                  ),
                ),
              if (step > 0) const SizedBox(width: 12),
              Expanded(
                child: FilledButton.icon(
                  onPressed: () async {
                    if (step == 1 && title.text.trim().isEmpty) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Titre obligatoire')),
                      );
                      return;
                    }
                    if (step < 3) {
                      setState(() => step++);
                    } else {
                      await context.read<StatusController>().publishStatus(
                        kind: kind,
                        title: title.text,
                        caption: caption.text,
                        price: num.tryParse(price.text),
                        location: location.text,
                        mediaUrls: photos.take(2).toList(),
                      );
                      if (context.mounted) Navigator.pop(context);
                    }
                  },
                  icon: Icon(step < 3 ? Icons.arrow_forward : Icons.check),
                  label: Text(step < 3 ? 'Suivant' : 'Publier · 24h'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class StatusViewerScreen extends StatefulWidget {
  const StatusViewerScreen({super.key, required this.statuses});

  final List<WaouhStatus> statuses;

  @override
  State<StatusViewerScreen> createState() => _StatusViewerScreenState();
}

class _StatusViewerScreenState extends State<StatusViewerScreen> {
  double progress = 0;
  Timer? timer;

  @override
  void initState() {
    super.initState();
    timer = Timer.periodic(const Duration(milliseconds: 120), (_) {
      setState(() => progress = min(1, progress + .012));
      if (progress >= 1) Navigator.maybePop(context);
    });
  }

  @override
  void dispose() {
    timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final status = widget.statuses.first;
    return Scaffold(
      backgroundColor: WaouhColors.ink,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(18),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              LinearProgressIndicator(value: progress, color: WaouhColors.neon),
              const SizedBox(height: 18),
              Row(
                children: [
                  CircleAvatar(
                    backgroundColor: status.kind.color,
                    child: const Icon(Icons.storefront, color: Colors.white),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      status.authorName ?? 'WAOUH',
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ),
                  IconButton(
                    onPressed: () => Navigator.pop(context),
                    icon: const Icon(Icons.close, color: Colors.white),
                  ),
                ],
              ),
              const Spacer(),
              Text(
                status.title,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 34,
                  fontWeight: FontWeight.w900,
                ),
              ),
              const SizedBox(height: 12),
              Text(
                status.caption ?? '',
                style: const TextStyle(color: Colors.white70, fontSize: 18),
              ),
              const SizedBox(height: 20),
              FilledButton.icon(
                onPressed: () => context.go('/app/chat/waouh'),
                icon: const Icon(Icons.reply),
                label: const Text('Repondre dans WAOUH'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class WaouhChatScreen extends StatefulWidget {
  const WaouhChatScreen({super.key});

  @override
  State<WaouhChatScreen> createState() => _WaouhChatScreenState();
}

class _WaouhChatScreenState extends State<WaouhChatScreen> {
  final composer = TextEditingController();
  bool sending = false;

  Future<void> _send(BuildContext context) async {
    if (sending) return;
    final text = composer.text.trim();
    if (text.isEmpty) return;
    final intent = text.startsWith('Je vends')
        ? WaouhIntent.sell
        : text.startsWith('Je cherche')
        ? WaouhIntent.buy
        : text.startsWith('Je propose')
        ? WaouhIntent.negotiate
        : null;
    setState(() => sending = true);
    composer.clear();
    try {
      await context.read<WaouhChatController>().sendWaouhMessage(
        text,
        intent: intent,
      );
    } catch (e) {
      composer.text = text;
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Message non envoye: ' + e.toString())),
        );
      }
    } finally {
      if (mounted) setState(() => sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final chat = context.watch<WaouhChatController>();
    final profile = context.watch<AuthController>().profile;
    return Scaffold(
      appBar: PremiumHeader(
        title: 'WAOUH',
        subtitle: profile?.fullName == null
            ? 'Achetez · Vendez · Negociez'
            : 'Bonjour ${profile!.fullName!.split(" ").first} · Cotonou',
        showBack: true,
        actions: [
          IconButton(
            onPressed: () => context.go('/app/notifications'),
            icon: const Icon(Icons.notifications_none_rounded),
          ),
          IconButton(
            onPressed: () => composer.text = '',
            icon: const Icon(Icons.add_rounded),
          ),
          IconButton(
            onPressed: () => context.go('/app/profile'),
            icon: const Icon(Icons.person_outline),
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: StreamBuilder<List<WaouhMessage>>(
              stream: chat.mainMessages(),
              builder: (context, snapshot) {
                final messages = snapshot.data ?? const <WaouhMessage>[];
                if (messages.isEmpty) return const WaouhEmptyState();
                return ListView.builder(
                  padding: const EdgeInsets.all(16),
                  reverse: false,
                  itemCount: messages.length,
                  itemBuilder: (context, i) => ChatBubble(message: messages[i]),
                );
              },
            ),
          ),
          PayloadChips(
            onSelect: (intent) =>
                setState(() => composer.text = intent.prompt()),
          ),
          SafeArea(
            top: false,
            child: Container(
              padding: const EdgeInsets.fromLTRB(10, 8, 10, 10),
              color: Colors.white,
              child: Row(
                children: [
                  IconButton(
                    onPressed: () => pickImage(context, ImageSource.camera),
                    icon: const Icon(Icons.camera_alt_outlined),
                  ),
                  IconButton(
                    onPressed: () => pickImage(context, ImageSource.gallery),
                    icon: const Icon(Icons.attach_file_rounded),
                  ),
                  Expanded(
                    child: TextField(
                      controller: composer,
                      minLines: 1,
                      maxLines: 4,
                      textInputAction: TextInputAction.send,
                      onSubmitted: (_) => _send(context),
                      decoration: const InputDecoration(
                        hintText: 'Votre message...',
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  FilledButton(
                    style: FilledButton.styleFrom(
                      minimumSize: const Size(52, 52),
                      padding: EdgeInsets.zero,
                    ),
                    onPressed: sending ? null : () => _send(context),
                    child: sending
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : const Icon(Icons.send_rounded),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

Future<void> pickImage(BuildContext context, ImageSource source) async {
  try {
    final picker = ImagePicker();
    final file = await picker.pickImage(source: source, imageQuality: 78);
    if (context.mounted && file != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Image selectionnee: ${file.name}')),
      );
    }
  } catch (e) {
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Selection image indisponible: $e')),
      );
    }
  }
}

class WaouhEmptyState extends StatelessWidget {
  const WaouhEmptyState({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      color: WaouhColors.chat,
      padding: const EdgeInsets.all(26),
      child: Column(
        children: const [
          SizedBox(height: 52),
          Text(
            'Bonjour !',
            style: TextStyle(
              fontSize: 24,
              color: WaouhColors.muted,
              fontWeight: FontWeight.w900,
            ),
          ),
          SizedBox(height: 10),
          Text(
            'Utilisez les boutons ci-dessous, ou tapez « Je vends ... » / « Je cherche ... ».\nAnnonces autour de Cotonou.',
            textAlign: TextAlign.center,
            style: TextStyle(
              color: WaouhColors.muted,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}

class PayloadChips extends StatelessWidget {
  const PayloadChips({super.key, required this.onSelect});

  final ValueChanged<WaouhIntent> onSelect;

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.white,
      height: 58,
      child: ListView(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
        scrollDirection: Axis.horizontal,
        children: WaouhIntent.values
            .map(
              (intent) => Padding(
                padding: const EdgeInsets.only(right: 10),
                child: ActionChip(
                  avatar: CircleAvatar(
                    backgroundColor: intent.color,
                    child: Icon(intent.icon, color: Colors.white, size: 16),
                  ),
                  label: Text(
                    intent.label,
                    style: const TextStyle(fontWeight: FontWeight.w900),
                  ),
                  onPressed: () => onSelect(intent),
                ),
              ),
            )
            .toList(),
      ),
    );
  }
}

class ChatBubble extends StatelessWidget {
  const ChatBubble({super.key, required this.message});

  final WaouhMessage message;

  @override
  Widget build(BuildContext context) {
    final out = message.outgoing;
    return Align(
      alignment: out ? Alignment.centerRight : Alignment.centerLeft,
      child: ConstrainedBox(
        constraints: BoxConstraints(
          maxWidth: MediaQuery.of(context).size.width * .78,
        ),
        child: Container(
          margin: const EdgeInsets.symmetric(vertical: 5),
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: out ? const Color(0xFFBDF8D8) : Colors.white,
            borderRadius: BorderRadius.only(
              topLeft: const Radius.circular(18),
              topRight: const Radius.circular(18),
              bottomLeft: Radius.circular(out ? 18 : 4),
              bottomRight: Radius.circular(out ? 4 : 18),
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                message.content,
                style: const TextStyle(fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 5),
              Text(
                stamp(message.createdAt),
                style: const TextStyle(color: WaouhColors.muted, fontSize: 11),
              ),
              if (message.meta['products'] is List)
                ProductGrid(
                  products: List<Map<String, dynamic>>.from(
                    message.meta['products'] as List,
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class ProductGrid extends StatelessWidget {
  const ProductGrid({super.key, required this.products});

  final List<Map<String, dynamic>> products;

  @override
  Widget build(BuildContext context) {
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      padding: const EdgeInsets.only(top: 10),
      itemCount: min(products.length, 6),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 3,
        crossAxisSpacing: 8,
        mainAxisSpacing: 8,
      ),
      itemBuilder: (_, i) => Container(
        decoration: BoxDecoration(
          color: WaouhColors.sky,
          borderRadius: BorderRadius.circular(14),
        ),
        alignment: Alignment.bottomCenter,
        padding: const EdgeInsets.all(8),
        child: Text(
          asString(products[i]['title'] ?? products[i]['name'], 'Produit'),
          textAlign: TextAlign.center,
          style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 12),
        ),
      ),
    );
  }
}

class ConversationScreen extends StatefulWidget {
  const ConversationScreen({super.key, required this.id});

  final String id;

  @override
  State<ConversationScreen> createState() => _ConversationScreenState();
}

class _ConversationScreenState extends State<ConversationScreen> {
  final composer = TextEditingController();

  @override
  Widget build(BuildContext context) {
    final chat = context.watch<WaouhChatController>();
    return Scaffold(
      appBar: const PremiumHeader(
        title: 'Chat produit',
        subtitle: 'Conversation directe',
        showBack: true,
      ),
      body: Column(
        children: [
          Expanded(
            child: StreamBuilder<List<WaouhMessage>>(
              stream: chat.conversationMessages(widget.id),
              builder: (_, snapshot) => ListView(
                padding: const EdgeInsets.all(16),
                children: (snapshot.data ?? const <WaouhMessage>[])
                    .map((m) => ChatBubble(message: m))
                    .toList(),
              ),
            ),
          ),
          SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.all(10),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: composer,
                      decoration: const InputDecoration(
                        hintText: 'Votre message...',
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  FilledButton(
                    onPressed: () {
                      chat.sendConversationMessage(widget.id, composer.text);
                      composer.clear();
                    },
                    child: const Icon(Icons.send_rounded),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class NotificationsScreen extends StatelessWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthController>();
    final notifications = context.read<NotificationsController>();
    return Scaffold(
      appBar: PremiumHeader(
        title: 'Notifications',
        subtitle: 'Messages & statuts',
        showBack: true,
        actions: [
          IconButton(
            onPressed: () => notifications.markAllRead(auth.user),
            icon: const Icon(Icons.done_all_rounded),
          ),
        ],
      ),
      body: StreamBuilder<List<NotificationItem>>(
        stream: notifications.stream(auth.user),
        builder: (context, snapshot) {
          final list = snapshot.data ?? const <NotificationItem>[];
          if (list.isEmpty)
            return const Center(child: Text('Aucune notification'));
          return ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: list.length,
            itemBuilder: (_, i) {
              final n = list[i];
              return WaCard(
                color: n.read ? null : const Color(0xFFECFFF5),
                child: ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: CircleAvatar(
                    backgroundColor: n.read
                        ? WaouhColors.line
                        : WaouhColors.jade,
                    child: Icon(
                      n.type == 'status'
                          ? Icons.auto_awesome
                          : Icons.notifications_none,
                      color: Colors.white,
                    ),
                  ),
                  title: Text(
                    n.title,
                    style: const TextStyle(fontWeight: FontWeight.w900),
                  ),
                  subtitle: Text(n.body),
                  trailing: Text(
                    stamp(n.createdAt),
                    style: const TextStyle(
                      fontSize: 12,
                      color: WaouhColors.muted,
                    ),
                  ),
                  onTap: () {
                    notifications.markRead(n.id);
                    context.go(
                      n.actionUrl?.startsWith('/app') == true
                          ? n.actionUrl!
                          : '/app/chat/waouh',
                    );
                  },
                ),
              );
            },
          );
        },
      ),
    );
  }
}

class PartnerHomeScreen extends StatefulWidget {
  const PartnerHomeScreen({super.key});

  @override
  State<PartnerHomeScreen> createState() => _PartnerHomeScreenState();
}

class _PartnerHomeScreenState extends State<PartnerHomeScreen> {
  @override
  void initState() {
    super.initState();
    final controller = context.read<PartnerController>();
    Future.microtask(controller.ensurePartner);
  }

  @override
  Widget build(BuildContext context) {
    final partner = context.watch<PartnerController>();
    return Scaffold(
      appBar: PremiumHeader(
        title: 'Mes entreprises',
        subtitle: 'Enrolement intelligent',
        actions: [
          IconButton(
            onPressed: () => showBusinessForm(context),
            icon: const Icon(Icons.add),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          PartnerWalletCard(partner: partner.partner),
          const SizedBox(height: 14),
          const Text(
            'Entreprises',
            style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 12),
          StreamBuilder<List<PartnerBusiness>>(
            stream: partner.businesses(),
            builder: (context, snapshot) {
              final businesses = snapshot.data ?? const <PartnerBusiness>[];
              if (businesses.isEmpty) {
                return WaCard(
                  child: Column(
                    children: [
                      const Icon(
                        Icons.storefront_outlined,
                        size: 44,
                        color: WaouhColors.muted,
                      ),
                      const Text(
                        'Aucune entreprise',
                        style: TextStyle(fontWeight: FontWeight.w900),
                      ),
                      const SizedBox(height: 12),
                      FilledButton.icon(
                        onPressed: () => showBusinessForm(context),
                        icon: const Icon(Icons.add),
                        label: const Text('Ajouter une entreprise'),
                      ),
                    ],
                  ),
                );
              }
              return Column(
                children: businesses
                    .map(
                      (b) => WaCard(
                        child: ListTile(
                          contentPadding: EdgeInsets.zero,
                          title: Text(
                            b.name,
                            style: const TextStyle(
                              fontWeight: FontWeight.w900,
                              fontSize: 21,
                            ),
                          ),
                          subtitle: Text(
                            '${b.category ?? 'Activite'} · ${b.city ?? ''} ${b.quarter ?? ''}',
                          ),
                          trailing: FilledButton(
                            onPressed: () => context.go(
                              '/app/partner/businesses/${b.id}/products',
                            ),
                            child: const Text('Produits'),
                          ),
                        ),
                      ),
                    )
                    .toList(),
              );
            },
          ),
          const SizedBox(height: 14),
          const PartnerSalesPreview(),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => showBusinessForm(context),
        icon: const Icon(Icons.add),
        label: const Text('Entreprise'),
      ),
    );
  }
}

class PartnerWalletCard extends StatelessWidget {
  const PartnerWalletCard({super.key, required this.partner});

  final Partner? partner;

  @override
  Widget build(BuildContext context) {
    return WaCard(
      color: const Color(0xFFECFFF5),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const CircleAvatar(
                backgroundColor: WaouhColors.jade,
                child: Icon(
                  Icons.account_balance_wallet_outlined,
                  color: Colors.white,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  partner?.name ?? 'Partenaire WAOUH',
                  style: const TextStyle(
                    fontWeight: FontWeight.w900,
                    fontSize: 20,
                  ),
                ),
              ),
              Chip(label: Text(partner?.status ?? 'active')),
            ],
          ),
          const SizedBox(height: 18),
          Text(
            '${money(partner?.walletBalance ?? 0)} FCFA',
            style: const TextStyle(fontSize: 30, fontWeight: FontWeight.w900),
          ),
          const Text(
            'Solde disponible · MTN / Moov / Celtiis Money',
            style: TextStyle(
              color: WaouhColors.muted,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 18),
          SizedBox(
            height: 120,
            child: LineChart(
              LineChartData(
                gridData: const FlGridData(show: false),
                titlesData: const FlTitlesData(show: false),
                borderData: FlBorderData(show: false),
                lineBarsData: [
                  LineChartBarData(
                    spots: const [
                      FlSpot(0, 2),
                      FlSpot(1, 3),
                      FlSpot(2, 2.4),
                      FlSpot(3, 4),
                      FlSpot(4, 3.6),
                      FlSpot(5, 5),
                    ],
                    isCurved: true,
                    color: WaouhColors.jade,
                    barWidth: 4,
                    dotData: const FlDotData(show: false),
                    belowBarData: BarAreaData(
                      show: true,
                      color: WaouhColors.jade.withOpacity(.12),
                    ),
                  ),
                ],
              ),
            ),
          ),
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () => showWithdrawalRequest(context, partner),
                  icon: const Icon(Icons.payments_outlined),
                  label: const Text('Retrait'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () => showMomoSetup(context, partner),
                  icon: const Icon(Icons.phone_android_outlined),
                  label: const Text('MoMo'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

Future<void> showWithdrawalRequest(
  BuildContext context,
  Partner? partner,
) async {
  final amount = TextEditingController(
    text: (partner?.walletBalance ?? 0) > 0
        ? money(partner!.walletBalance)
        : '',
  );
  await showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    builder: (_) => Padding(
      padding: EdgeInsets.fromLTRB(
        20,
        20,
        20,
        MediaQuery.of(context).viewInsets.bottom + 20,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Demande de retrait',
            style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: amount,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(labelText: 'Montant FCFA'),
          ),
          const SizedBox(height: 16),
          FilledButton.icon(
            onPressed: () async {
              final value = num.tryParse(amount.text.replaceAll(' ', '')) ?? 0;
              await context.read<PartnerController>().requestPayout(
                amount: value,
              );
              if (context.mounted) Navigator.pop(context);
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text(
                      'Demande de retrait enregistree dans Supabase.',
                    ),
                  ),
                );
              }
            },
            icon: const Icon(Icons.check_rounded),
            label: const Text('Confirmer la demande'),
          ),
        ],
      ),
    ),
  );
}

Future<void> showMomoSetup(BuildContext context, Partner? partner) async {
  final number = TextEditingController(text: partner?.mobileMoneyNumber ?? '');
  var operator = partner?.mobileMoneyOperator ?? 'Celtiis';
  await showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    builder: (sheetContext) => StatefulBuilder(
      builder: (context, setState) => Padding(
        padding: EdgeInsets.fromLTRB(
          20,
          20,
          20,
          MediaQuery.of(sheetContext).viewInsets.bottom + 20,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Configurer Mobile Money',
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900),
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              value: operator,
              decoration: const InputDecoration(labelText: 'Operateur'),
              items: [
                'MTN',
                'Moov',
                'Celtiis',
              ].map((e) => DropdownMenuItem(value: e, child: Text(e))).toList(),
              onChanged: (value) =>
                  setState(() => operator = value ?? operator),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: number,
              keyboardType: TextInputType.phone,
              decoration: const InputDecoration(labelText: 'Numero MoMo'),
            ),
            const SizedBox(height: 16),
            FilledButton.icon(
              onPressed: partner == null
                  ? null
                  : () async {
                      await supabase
                          .from('waouh_partners')
                          .update({
                            'mobile_money_operator': operator,
                            'mobile_money_number': number.text.trim(),
                          })
                          .eq('id', partner.id);
                      if (sheetContext.mounted) Navigator.pop(sheetContext);
                      if (context.mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text(
                              'Mobile Money mis a jour dans Supabase.',
                            ),
                          ),
                        );
                      }
                    },
              icon: const Icon(Icons.save_outlined),
              label: const Text('Enregistrer MoMo'),
            ),
          ],
        ),
      ),
    ),
  );
}

class PartnerSalesPreview extends StatelessWidget {
  const PartnerSalesPreview({super.key});

  @override
  Widget build(BuildContext context) {
    final partner = context.watch<PartnerController>();
    return StreamBuilder<List<PartnerSale>>(
      stream: partner.sales(),
      builder: (_, snapshot) {
        final sales = snapshot.data ?? const <PartnerSale>[];
        return WaCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Suivi ventes & commissions',
                style: TextStyle(fontWeight: FontWeight.w900, fontSize: 19),
              ),
              const SizedBox(height: 12),
              if (sales.isEmpty)
                const Text('Aucune vente attribuee pour le moment.'),
              ...sales
                  .take(4)
                  .map(
                    (s) => ListTile(
                      contentPadding: EdgeInsets.zero,
                      title: Text(
                        s.productName ?? 'Vente WAOUH',
                        style: const TextStyle(fontWeight: FontWeight.w800),
                      ),
                      subtitle: Text(s.status ?? 'en cours'),
                      trailing: Text('${money(s.commission)} FCFA'),
                    ),
                  ),
            ],
          ),
        );
      },
    );
  }
}

void showBusinessForm(BuildContext context) {
  showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    builder: (_) => const BusinessFormSheet(),
  );
}

class BusinessFormSheet extends StatefulWidget {
  const BusinessFormSheet({super.key});

  @override
  State<BusinessFormSheet> createState() => _BusinessFormSheetState();
}

class _BusinessFormSheetState extends State<BusinessFormSheet> {
  final name = TextEditingController();
  final category = TextEditingController();
  final city = TextEditingController(text: 'Cotonou');
  final quarter = TextEditingController();
  final whatsapp = TextEditingController(text: '+229');

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        left: 22,
        right: 22,
        top: 18,
        bottom: MediaQuery.of(context).viewInsets.bottom + 22,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Text(
            'Nouvelle entreprise',
            style: TextStyle(fontWeight: FontWeight.w900, fontSize: 22),
          ),
          const SizedBox(height: 18),
          FilledButton.icon(
            onPressed: () => setState(() => city.text = 'Cotonou'),
            icon: const Icon(Icons.my_location),
            label: const Text('Detecter ma position'),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: name,
            decoration: const InputDecoration(
              labelText: 'Nom de l entreprise *',
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: category,
            decoration: const InputDecoration(labelText: 'Categorie *'),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: city,
                  decoration: const InputDecoration(labelText: 'Ville'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: TextField(
                  controller: quarter,
                  decoration: const InputDecoration(labelText: 'Quartier'),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          TextField(
            controller: whatsapp,
            decoration: const InputDecoration(labelText: 'WhatsApp'),
          ),
          const SizedBox(height: 18),
          FilledButton(
            onPressed: () async {
              await context.read<PartnerController>().upsertBusiness(
                name: name.text,
                category: category.text,
                city: city.text,
                quarter: quarter.text,
                whatsapp: whatsapp.text,
              );
              if (context.mounted) Navigator.pop(context);
            },
            child: const Text('Enregistrer'),
          ),
        ],
      ),
    );
  }
}

class PartnerProductsScreen extends StatelessWidget {
  const PartnerProductsScreen({super.key, required this.businessId});

  final String businessId;

  @override
  Widget build(BuildContext context) {
    final partner = context.watch<PartnerController>();
    return Scaffold(
      appBar: const PremiumHeader(
        title: 'Produits',
        subtitle: 'Catalogue partenaire',
        showBack: true,
      ),
      body: StreamBuilder<List<PartnerProduct>>(
        stream: partner.products(businessId),
        builder: (context, snapshot) {
          final products = snapshot.data ?? const <PartnerProduct>[];
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Text(
                '${products.length} produit(s)',
                style: const TextStyle(
                  fontWeight: FontWeight.w900,
                  color: WaouhColors.muted,
                ),
              ),
              const SizedBox(height: 14),
              if (products.isEmpty)
                WaCard(
                  child: Column(
                    children: [
                      const Icon(
                        Icons.inventory_2_outlined,
                        size: 42,
                        color: WaouhColors.muted,
                      ),
                      const Text(
                        'Aucun produit',
                        style: TextStyle(fontWeight: FontWeight.w900),
                      ),
                      const SizedBox(height: 12),
                      FilledButton.icon(
                        onPressed: () => showProductForm(context, businessId),
                        icon: const Icon(Icons.add),
                        label: const Text('Ajouter un produit'),
                      ),
                    ],
                  ),
                ),
              ...products.map(
                (p) => WaCard(
                  child: ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: Container(
                      width: 72,
                      height: 72,
                      decoration: BoxDecoration(
                        color: WaouhColors.sky,
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: const Icon(
                        Icons.image_outlined,
                        color: WaouhColors.blue,
                      ),
                    ),
                    title: Text(
                      p.name,
                      style: const TextStyle(
                        fontWeight: FontWeight.w900,
                        fontSize: 20,
                      ),
                    ),
                    subtitle: Text(
                      '${p.category ?? 'Catalogue'}\n${money(p.priceMin ?? 0)} F ${p.unit ?? ''}',
                    ),
                    isThreeLine: true,
                    trailing: Chip(
                      label: Text(p.available ? 'Dispo' : 'Pause'),
                    ),
                    onTap: () => Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => ProductViewerScreen(product: p),
                      ),
                    ),
                  ),
                ),
              ),
            ],
          );
        },
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => showProductForm(context, businessId),
        icon: const Icon(Icons.add),
        label: const Text('Produit'),
      ),
    );
  }
}

void showProductForm(BuildContext context, String businessId) {
  showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    builder: (_) => ProductFormSheet(businessId: businessId),
  );
}

class ProductFormSheet extends StatefulWidget {
  const ProductFormSheet({super.key, required this.businessId});

  final String businessId;

  @override
  State<ProductFormSheet> createState() => _ProductFormSheetState();
}

class _ProductFormSheetState extends State<ProductFormSheet> {
  final name = TextEditingController();
  final category = TextEditingController();
  final unit = TextEditingController(text: 'piece');
  final price = TextEditingController();
  bool available = true;
  final photos = <String>[];

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        left: 22,
        right: 22,
        top: 18,
        bottom: MediaQuery.of(context).viewInsets.bottom + 22,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Text(
            'Ajouter un produit',
            style: TextStyle(fontWeight: FontWeight.w900, fontSize: 22),
          ),
          const SizedBox(height: 18),
          Row(
            children: [
              OutlinedButton.icon(
                onPressed: () =>
                    setState(() => photos.add('local://${photos.length + 1}')),
                icon: const Icon(Icons.add_photo_alternate_outlined),
                label: Text('Ajouter (${3 - photos.length})'),
              ),
              const SizedBox(width: 12),
              Text('${photos.length} / 3 photos'),
            ],
          ),
          const SizedBox(height: 14),
          TextField(
            controller: name,
            decoration: const InputDecoration(labelText: 'Nom *'),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: category,
            decoration: const InputDecoration(labelText: 'Categorie'),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: unit,
            decoration: const InputDecoration(labelText: 'Unite'),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: price,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(labelText: 'Prix (FCFA)'),
          ),
          SwitchListTile(
            value: available,
            onChanged: (v) => setState(() => available = v),
            title: const Text(
              'Disponible',
              style: TextStyle(fontWeight: FontWeight.w800),
            ),
          ),
          FilledButton(
            onPressed: () async {
              await context.read<PartnerController>().upsertProduct(
                businessId: widget.businessId,
                name: name.text,
                category: category.text,
                unit: unit.text,
                price: num.tryParse(price.text),
                available: available,
                photos: photos,
              );
              if (context.mounted) Navigator.pop(context);
            },
            child: const Text('Enregistrer'),
          ),
        ],
      ),
    );
  }
}

class ProductViewerScreen extends StatelessWidget {
  const ProductViewerScreen({super.key, required this.product});

  final PartnerProduct product;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: PremiumHeader(
        title: 'Produit',
        subtitle: product.name,
        showBack: true,
      ),
      body: ListView(
        padding: const EdgeInsets.all(18),
        children: [
          Container(
            height: 230,
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFFC7D2FE), Color(0xFF80F2BC)],
              ),
              borderRadius: BorderRadius.circular(26),
            ),
            child: Center(
              child: Text(
                product.name,
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w900,
                  fontSize: 34,
                ),
              ),
            ),
          ),
          const SizedBox(height: 24),
          Row(
            children: [
              Expanded(
                child: Text(
                  product.name,
                  style: const TextStyle(
                    fontWeight: FontWeight.w900,
                    fontSize: 30,
                  ),
                ),
              ),
              Chip(label: Text(product.available ? 'Dispo' : 'Pause')),
            ],
          ),
          Text(
            product.category ?? 'Catalogue',
            style: const TextStyle(
              color: WaouhColors.muted,
              fontWeight: FontWeight.w800,
              fontSize: 16,
            ),
          ),
          const SizedBox(height: 14),
          Text(
            '${money(product.priceMin ?? 0)} F',
            style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 28),
          ),
          const SizedBox(height: 24),
          const WaCard(
            child: ListTile(
              contentPadding: EdgeInsets.zero,
              leading: Icon(Icons.auto_awesome, color: WaouhColors.jade),
              title: Text(
                'Visibilite WAOUH',
                style: TextStyle(fontWeight: FontWeight.w900),
              ),
              subtitle: Text(
                'Produit indexe pour le matching local, les statuts et le chat IA.',
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class WhatsAppIaScreen extends StatefulWidget {
  const WhatsAppIaScreen({super.key});

  @override
  State<WhatsAppIaScreen> createState() => _WhatsAppIaScreenState();
}

class _WhatsAppIaScreenState extends State<WhatsAppIaScreen> {
  Future<List<WaSession>>? future;

  @override
  void initState() {
    super.initState();
    future = loadSessions();
  }

  Future<List<WaSession>> loadSessions() async {
    try {
      final result = await supabase.functions.invoke(
        'waha-dashboard-proxy',
        body: {'action': 'sessions'},
      );
      final data = result.data;
      final list = data is List
          ? data
          : (data is Map ? (data['sessions'] as List? ?? const []) : const []);
      return list
          .map((e) => WaSession.fromJson(Map<String, dynamic>.from(e as Map)))
          .toList();
    } catch (_) {
      return const [
        WaSession(id: 'default', name: 'default', status: 'DISCONNECTED'),
      ];
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: const PremiumHeader(
        title: 'WhatsApp IA',
        subtitle: 'WAHA · Sessions',
      ),
      body: FutureBuilder<List<WaSession>>(
        future: future,
        builder: (_, snapshot) {
          final sessions = snapshot.data ?? const <WaSession>[];
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              WaCard(
                color: const Color(0xFFECFFF5),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: const [
                    Text(
                      'Gestion serveur WAHA',
                      style: TextStyle(
                        fontWeight: FontWeight.w900,
                        fontSize: 21,
                      ),
                    ),
                    Text(
                      'Connectez une session QR, surveillez WORKING/STOPPED et associez-la aux bots.',
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              ...sessions.map(
                (s) => WaCard(
                  child: ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: CircleAvatar(
                      backgroundColor: s.status == 'WORKING'
                          ? WaouhColors.jade
                          : WaouhColors.orange,
                      child: const Icon(
                        Icons.phone_iphone,
                        color: Colors.white,
                      ),
                    ),
                    title: Text(
                      s.name,
                      style: const TextStyle(fontWeight: FontWeight.w900),
                    ),
                    subtitle: Text(
                      s.phone ?? 'Scan depuis WhatsApp > Appareils connectes',
                    ),
                    trailing: Chip(label: Text(s.status ?? 'UNKNOWN')),
                  ),
                ),
              ),
              FilledButton.icon(
                onPressed: () => setState(() => future = loadSessions()),
                icon: const Icon(Icons.qr_code_rounded),
                label: const Text('Actualiser / afficher QR'),
              ),
            ],
          );
        },
      ),
    );
  }
}

class DiffusionScreen extends StatefulWidget {
  const DiffusionScreen({super.key});

  @override
  State<DiffusionScreen> createState() => _DiffusionScreenState();
}

class _DiffusionScreenState extends State<DiffusionScreen> {
  final name = TextEditingController();
  final message = TextEditingController();
  final audience = TextEditingController(text: 'clients');
  bool aiVariants = true;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: const PremiumHeader(
        title: 'Diffusion WhatsApp',
        subtitle: 'Campagnes & analytics',
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          WaCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Nouvelle campagne',
                  style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: name,
                  decoration: const InputDecoration(
                    labelText: 'Nom de la campagne',
                    hintText: 'Promo Tabaski',
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: message,
                  minLines: 4,
                  maxLines: 6,
                  decoration: const InputDecoration(
                    labelText: 'Message',
                    hintText: 'Bonjour {prenom}, ...',
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: audience,
                  decoration: const InputDecoration(
                    labelText: 'Audience / tag',
                  ),
                ),
                const SizedBox(height: 12),
                SwitchListTile(
                  value: aiVariants,
                  onChanged: (value) => setState(() => aiVariants = value),
                  title: const Text('Variantes IA anti-spam'),
                ),
                FilledButton.icon(
                  onPressed: () async {
                    await supabase.functions.invoke(
                      'whatsapp-diffusion-enqueue',
                      body: {
                        'name': name.text,
                        'message': message.text,
                        'audience': audience.text,
                        'ai_variants': aiVariants,
                        'source': 'flutter_native',
                      },
                    );
                    if (context.mounted)
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text(
                            'Campagne envoyee a la file de diffusion.',
                          ),
                        ),
                      );
                  },
                  icon: const Icon(Icons.play_arrow_rounded),
                  label: const Text('Creer & lancer maintenant'),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          WaCard(
            child: SizedBox(
              height: 180,
              child: BarChart(
                BarChartData(
                  titlesData: const FlTitlesData(show: false),
                  borderData: FlBorderData(show: false),
                  gridData: const FlGridData(show: false),
                  barGroups: List.generate(
                    5,
                    (i) => BarChartGroupData(
                      x: i,
                      barRods: [
                        BarChartRodData(
                          toY: (i + 2) * 8,
                          color: WaouhColors.blue,
                          borderRadius: BorderRadius.circular(6),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class BotsScreen extends StatelessWidget {
  const BotsScreen({super.key});

  Future<void> createBase(BuildContext context) async {
    try {
      await supabase.from('knowledge_bases').insert({
        'name': 'Nouvelle base Flutter',
        'description': 'Base creee depuis l application Flutter native.',
        'completion': 0,
      });
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Base de connaissances creee dans Supabase.'),
          ),
        );
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Creation impossible: $e')));
      }
    }
  }

  Stream<List<KnowledgeBase>> bases() {
    return supabase
        .from('knowledge_bases')
        .stream(primaryKey: ['id'])
        .order('updated_at', ascending: false)
        .map((rows) => rows.map(KnowledgeBase.fromJson).toList());
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: const PremiumHeader(
        title: 'Bots',
        subtitle: 'Bases de connaissances',
      ),
      body: StreamBuilder<List<KnowledgeBase>>(
        stream: bases(),
        builder: (_, snapshot) {
          final list = snapshot.data ?? const <KnowledgeBase>[];
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              WaCard(
                color: const Color(0xFFFFF4DB),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: const [
                    Text(
                      'Assistant pas a pas',
                      style: TextStyle(
                        fontWeight: FontWeight.w900,
                        fontSize: 21,
                      ),
                    ),
                    Text(
                      'Creez une base, ajoutez tables/champs, puis connectez-la a WhatsApp IA.',
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 14),
              if (list.isEmpty)
                const WaCard(
                  child: Text(
                    'Aucune base chargee. Les bases existantes apparaitront ici via Supabase.',
                  ),
                )
              else
                ...list.map(
                  (kb) => WaCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          kb.name,
                          style: const TextStyle(
                            fontWeight: FontWeight.w900,
                            fontSize: 20,
                          ),
                        ),
                        if (kb.description != null) Text(kb.description!),
                        const SizedBox(height: 12),
                        LinearProgressIndicator(
                          value: (kb.completion / 100).clamp(0, 1).toDouble(),
                        ),
                      ],
                    ),
                  ),
                ),
              FilledButton.icon(
                onPressed: () => createBase(context),
                icon: const Icon(Icons.add),
                label: const Text('Nouvelle base'),
              ),
            ],
          );
        },
      ),
    );
  }
}

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthController>();
    final profile = auth.profile;
    return Scaffold(
      appBar: const PremiumHeader(
        title: 'Profil',
        subtitle: 'Compte & role',
        showBack: true,
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          WaCard(
            child: Column(
              children: [
                CircleAvatar(
                  radius: 42,
                  backgroundColor: WaouhColors.jade,
                  child: Text(
                    (profile?.fullName ?? auth.user?.email ?? 'U')
                        .characters
                        .first
                        .toUpperCase(),
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 34,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ),
                const SizedBox(height: 14),
                Text(
                  profile?.fullName ?? 'Utilisateur WAOUH',
                  style: const TextStyle(
                    fontWeight: FontWeight.w900,
                    fontSize: 22,
                  ),
                ),
                Text(profile?.email ?? auth.user?.email ?? ''),
                const SizedBox(height: 12),
                Chip(label: Text(profile?.role ?? 'operateur')),
              ],
            ),
          ),
          WaCard(
            child: Column(
              children: [
                ListTile(
                  leading: const Icon(Icons.person_outline),
                  title: const Text('Nom'),
                  subtitle: Text(profile?.fullName ?? 'Non renseigne'),
                ),
                ListTile(
                  leading: const Icon(Icons.phone_outlined),
                  title: const Text('Telephone'),
                  subtitle: Text(profile?.phone ?? 'Non renseigne'),
                ),
                ListTile(
                  leading: const Icon(Icons.verified_user_outlined),
                  title: const Text('Role'),
                  subtitle: Text(profile?.role ?? 'Utilisateur'),
                ),
              ],
            ),
          ),
          FilledButton.icon(
            onPressed: () => pickImage(context, ImageSource.gallery),
            icon: const Icon(Icons.crop),
            label: const Text('Modifier avatar'),
          ),
          const SizedBox(height: 12),
          OutlinedButton.icon(
            onPressed: () => auth.signOut(),
            icon: const Icon(Icons.logout),
            label: const Text('Deconnexion'),
          ),
        ],
      ),
    );
  }
}
