import 'package:flutter/foundation.dart';
import 'package:image_picker/image_picker.dart';

import 'core/local_identity.dart';
import 'core/media_service.dart';
import 'data/chat_reader.dart';
import 'data/waouh_sender.dart';
import 'domain/chat_models.dart';
import 'auth_model.dart';

class ChatModel extends ChangeNotifier {
  ChatModel(this.identity, this.auth, this.reader, this.sender, this.media);
  final LocalIdentity identity;
  final AuthModel auth;
  final ChatReader reader;
  final WaouhSender sender;
  final MediaService media;
  bool sending = false;
  String? error;

  Stream<List<ChatMessage>> get messages => reader.stream();

  Future<ChatAttachment> upload(XFile file) async {
    final item = await media.uploadImage(
      image: file,
      folder: 'web',
      identity: identity.sessionId,
      bucket: 'waouh-uploads',
    );
    return ChatAttachment(url: item.url, type: item.type);
  }

  Future<void> send(String text, List<ChatAttachment> items, {String city = ''}) async {
    if (!auth.signedIn && identity.guestMessageCount >= 10) {
      throw StateError('Connectez-vous pour continuer apres 10 messages.');
    }
    sending = true; error = null; notifyListeners();
    try {
      await sender.sendMainMessage(
        text: text,
        attachments: items,
        city: city,
      );
      if (!auth.signedIn) await identity.incrementGuestMessageCount();
    } catch (e) { error = e.toString(); rethrow; }
    finally { sending = false; notifyListeners(); }
  }

  Future<void> newThread() async {
    await identity.startNewThread();
    notifyListeners();
  }
}
