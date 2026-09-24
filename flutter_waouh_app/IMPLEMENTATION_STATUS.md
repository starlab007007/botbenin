# Flutter parity implementation status

## Implemented foundation

- Persistent WAOUH device identity using the same `waouh_web_session_id` key as the React application.
- Canonical WAOUH Edge Function payloads: `channel`, `sessionId`, `text`, `attachments`, `lat`, `lng`, `city`, `authUserId` and `meta`.
- History reader through `waouh-history` and Realtime messages scoped to the persisted session.
- Real image uploads to Supabase Storage with JPG/PNG/WebP validation and 5 MB limit.
- Status publication through `waouh-status-publish`, with uploads in `waouh-statuses`.
- Typed Flutter models for conversations, messages, attachments and statuses.
- CI workflow: `flutter pub get`, `flutter analyze`, `flutter test`, and debug APK build.

## Integration rule

The legacy `lib/main.dart` remains the active entry point until every existing Flutter screen is moved to the modular layer. This intentionally prevents the existing partner, bot, WAHA and diffusion screens from disappearing during the migration.

## Required next modules

1. Route the existing WAOUH chat screen through `ChatModel` and remove its database-write fallback.
2. Persist the session ID in all existing conversation and notification queries.
3. Replace placeholder image URLs with `MediaService` uploads.
4. Port the React WAHA actions: create, start, stop, QR, delete, test, bot link and webhook.
5. Port diffusion tabs: campaigns, contacts, sessions and reporting.
6. Port the knowledge-base wizard: template, structural fields, tables and completion.
7. Add Firebase configuration (`google-services.json`) and register the FCM token through `register-device-token`.
8. Configure a production Android keystore and build an AAB for Google Play.

## Android real-device validation

```bash
cd flutter_waouh_app
flutter pub get
flutter analyze
flutter test
flutter build apk --debug
adb install -r build/app/outputs/flutter-apk/app-debug.apk
```

Use a real Android phone to verify guest chat, login, media upload, status publishing, WAHA QR, diffusion, partner catalogue and notifications. Never test production payments with a real customer payment account.
