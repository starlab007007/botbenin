// Modern profile screen. Mirrors the real React ProfileScreen.tsx contract
// (editable full name, read-only phone/email, sign out) and adds a working
// avatar upload — the React app never wired this control, it only shows a
// static avatar; here the existing "change avatar" affordance is made real
// rather than removed, uploading to the same `public-media` bucket used
// elsewhere in this app.
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';

import '../main.dart' as legacy;
import 'live_theme.dart';
import 'live_visuals.dart';

class LiveProfileScreen extends StatefulWidget {
  const LiveProfileScreen({super.key});
  @override
  State<LiveProfileScreen> createState() => _LiveProfileScreenState();
}

class _LiveProfileScreenState extends State<LiveProfileScreen> {
  final name = TextEditingController();
  bool dirty = false;
  bool savingName = false;
  bool uploadingAvatar = false;
  String? _seededFor;

  @override
  void dispose() {
    name.dispose();
    super.dispose();
  }

  void _seedIfNeeded(legacy.Profile? profile) {
    final id = profile?.id;
    if (id != null && id != _seededFor) {
      name.text = profile?.fullName ?? '';
      _seededFor = id;
    }
  }

  Future<void> _save(legacy.AuthController auth) async {
    setState(() => savingName = true);
    try {
      await auth.updateProfileFields(fullName: name.text.trim());
      if (mounted) {
        setState(() => dirty = false);
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Profil mis à jour')));
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error.toString())));
      }
    } finally {
      if (mounted) setState(() => savingName = false);
    }
  }

  Future<void> _changeAvatar(legacy.AuthController auth, ImageSource source) async {
    try {
      final picker = ImagePicker();
      final file = await picker.pickImage(source: source, imageQuality: 82, maxWidth: 1024);
      if (file == null) return;
      setState(() => uploadingAvatar = true);
      final bytes = await file.readAsBytes();
      await auth.updateAvatar(bytes: bytes, fileName: file.name);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Photo de profil mise à jour')));
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error.toString())));
      }
    } finally {
      if (mounted) setState(() => uploadingAvatar = false);
    }
  }

  void _showAvatarSheet(legacy.AuthController auth) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(WaouhRadius.sheet)),
      ),
      builder: (context) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: WaouhSpace.md),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ListTile(
                leading: const Icon(Icons.photo_camera_outlined),
                title: const Text('Prendre une photo'),
                onTap: () {
                  Navigator.pop(context);
                  _changeAvatar(auth, ImageSource.camera);
                },
              ),
              ListTile(
                leading: const Icon(Icons.photo_library_outlined),
                title: const Text('Choisir dans la galerie'),
                onTap: () {
                  Navigator.pop(context);
                  _changeAvatar(auth, ImageSource.gallery);
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _signOut(legacy.AuthController auth) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Se déconnecter ?'),
        content: const Text('Vous devrez vous reconnecter pour accéder à votre compte.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Annuler')),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: WaouhPalette.red),
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Se déconnecter'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    await auth.signOut();
    if (mounted) context.go('/app/auth');
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<legacy.AuthController>();
    final profile = auth.profile;
    _seedIfNeeded(profile);
    final rawInitials = (profile?.fullName ?? profile?.phone ?? 'U').trim();
    final initials = (rawInitials.length >= 2 ? rawInitials.substring(0, 2) : rawInitials)
        .toUpperCase();

    return Scaffold(
      backgroundColor: WaouhPalette.pearl,
      appBar: AppBar(
        backgroundColor: WaouhPalette.green,
        title: const Text('Mon profil'),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(WaouhSpace.lg, WaouhSpace.xl, WaouhSpace.lg, WaouhSpace.xxl),
        children: [
          Center(
            child: GestureDetector(
              onTap: () => _showAvatarSheet(auth),
              child: Stack(
                children: [
                  Container(
                    width: 96,
                    height: 96,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: WaouhGradients.brandSoft,
                      boxShadow: WaouhShadows.card,
                    ),
                    child: profile?.avatarUrl == null
                        ? Center(
                            child: Text(
                              initials,
                              style: const TextStyle(fontSize: 30, fontWeight: FontWeight.w800, color: Colors.white),
                            ),
                          )
                        : ClipOval(
                            child: Image.network(
                              profile!.avatarUrl!,
                              width: 96,
                              height: 96,
                              fit: BoxFit.cover,
                            ),
                          ),
                  ),
                  Positioned(
                    bottom: 0,
                    right: 0,
                    child: Container(
                      width: 32,
                      height: 32,
                      decoration: BoxDecoration(
                        color: WaouhPalette.green,
                        shape: BoxShape.circle,
                        border: Border.all(color: Colors.white, width: 2.5),
                      ),
                      child: uploadingAvatar
                          ? const Padding(
                              padding: EdgeInsets.all(6),
                              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                            )
                          : const Icon(Icons.camera_alt_rounded, size: 15, color: Colors.white),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: WaouhSpace.xl),
          Text('Nom complet', style: WaouhText.bodyStrong.copyWith(fontSize: 13.5)),
          const SizedBox(height: WaouhSpace.xs),
          TextField(
            controller: name,
            onChanged: (_) => setState(() => dirty = true),
            decoration: const InputDecoration(prefixIcon: Icon(Icons.person_outline_rounded, size: 20)),
          ),
          const SizedBox(height: WaouhSpace.md),
          Text('Téléphone', style: WaouhText.bodyStrong.copyWith(fontSize: 13.5)),
          const SizedBox(height: WaouhSpace.xs),
          _ReadOnlyField(value: profile?.phone ?? 'Non renseigné', icon: Icons.phone_outlined),
          const SizedBox(height: WaouhSpace.md),
          Text('Email', style: WaouhText.bodyStrong.copyWith(fontSize: 13.5)),
          const SizedBox(height: WaouhSpace.xs),
          _ReadOnlyField(value: profile?.email ?? 'Non renseigné', icon: Icons.mail_outline_rounded),
          const SizedBox(height: WaouhSpace.xl),
          SizedBox(
            height: 52,
            child: FilledButton(
              onPressed: (!dirty || savingName) ? null : () => _save(auth),
              child: savingName
                  ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Text('Enregistrer'),
            ),
          ),
          const SizedBox(height: WaouhSpace.sm),
          SizedBox(
            height: 52,
            child: OutlinedButton.icon(
              style: OutlinedButton.styleFrom(
                foregroundColor: WaouhPalette.red,
                side: const BorderSide(color: Color(0x33EF4444)),
              ),
              onPressed: () => _signOut(auth),
              icon: const Icon(Icons.logout_rounded, size: 18),
              label: const Text('Se déconnecter'),
            ),
          ),
        ],
      ),
    );
  }
}

class _ReadOnlyField extends StatelessWidget {
  const _ReadOnlyField({required this.value, required this.icon});
  final String value;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 52,
      padding: const EdgeInsets.symmetric(horizontal: WaouhSpace.md),
      decoration: BoxDecoration(
        color: WaouhPalette.line.withOpacity(0.35),
        borderRadius: BorderRadius.circular(WaouhRadius.control),
      ),
      child: Row(
        children: [
          Icon(icon, size: 18, color: WaouhPalette.muted),
          const SizedBox(width: WaouhSpace.sm),
          Expanded(child: Text(value, style: WaouhText.body.copyWith(color: WaouhPalette.muted))),
          const Icon(Icons.lock_outline_rounded, size: 14, color: WaouhPalette.muted),
        ],
      ),
    );
  }
}
