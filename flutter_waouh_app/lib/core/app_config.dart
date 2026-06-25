/// Centralises the public configuration required by the native application.
///
/// Supabase anonymous keys are designed to be embedded in clients. Access is
/// still enforced by Supabase Auth and Row Level Security policies.
class AppConfig {
  const AppConfig._();

  static const appName = 'WaouhApp';
  static const sessionStorageKey = 'waouh_web_session_id';
  static const threadCutoffStorageKey = 'waouh_main_thread_started_at';
  static const guestMessageCountStorageKey = 'waouh_guest_msg_count';
  static const beninPrefix = '+229';

  static const supabaseUrl = String.fromEnvironment(
    'SUPABASE_URL',
    defaultValue: 'https://mvynepqulhflxtyymtzs.supabase.co',
  );

  static const supabaseAnonKey = String.fromEnvironment(
    'SUPABASE_ANON_KEY',
    defaultValue:
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12eW5lcHF1bGhmbHh0eXltdHpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc1OTgxNTMsImV4cCI6MjA2MzE3NDE1M30.g1llr-Q6T3h06xFV7hCNRWZHG20wQHoBmp5zL0OAKh8',
  );

  static const mediaBucket = 'waouh-media';
  static const chatUploadBucket = 'waouh-uploads';
  static const maxImageBytes = 5 * 1024 * 1024;
  static const maxStatusImages = 2;
  static const maxProductImages = 3;
}
