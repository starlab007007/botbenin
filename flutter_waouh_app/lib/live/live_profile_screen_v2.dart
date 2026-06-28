import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';

import '../main.dart' as legacy;
import 'live_theme.dart';

class LiveProfileScreenV2 extends StatefulWidget {
  const LiveProfileScreenV2({super.key});

  @override
  State<LiveProfileScreenV2> createState() => _LiveProfileScreenV2State();
}

class _LiveProfileScreenV2State extends State<LiveProfileScreenV2> {
  final _name = TextEditingController();
  String? _profileId;
  bool _dirty = false;
  bool _busy = false;

  @override
  void dispose() {
    _name.dispose();
    super.dispose();
  }

  void _seed(legacy.Profile? profile) {
    if (profile?.id != null && profile!.id != _profileId) {
      _profileId = profile.id;
      _name.text = profile.fullName ?? '';
    }
  }

  Future<void> _save(legacy.AuthController auth) async {
    setState(() => _busy = true);
    try {
      await auth.updateProfileFields(fullName: _name.text.trim());
      if (!mounted) return;
      setState(() => _dirty = false);
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Profil mis à jour.')));
    } catch (error) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$error')));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _changeAvatar(legacy.AuthController auth, ImageSource source) async {
    final image = await ImagePicker().pickImage(source: source, imageQuality: 82, maxWidth: 1024);
    if (image == null) return;
    setState(() => _busy = true);
    try {
      await auth.updateAvatar(bytes: await image.readAsBytes(), fileName: image.name);
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Photo de profil mise à jour.')));
    } catch (error) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$error')));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _pickAvatar(legacy.AuthController auth) {
    showModalBottomSheet<void>(
      context: context,
      builder: (sheetContext) => SafeArea(
        child: Wrap(children: [
          ListTile(
            leading: const Icon(Icons.camera_alt_outlined),
            title: const Text('Prendre une photo'),
            onTap: () { Navigator.pop(sheetContext); _changeAvatar(auth, ImageSource.camera); },
          ),
          ListTile(
            leading: const Icon(Icons.photo_library_outlined),
            title: const Text('Choisir dans la galerie'),
            onTap: () { Navigator.pop(sheetContext); _changeAvatar(auth, ImageSource.gallery); },
          ),
        ]),
      ),
    );
  }

  Future<void> _signOut(legacy.AuthController auth) async {
    await auth.signOut();
    if (mounted) context.go('/app/auth');
  }

  void _back() {
    if (context.canPop()) {
      context.pop();
    } else {
      context.go('/app/chat');
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<legacy.AuthController>();
    final profile = auth.profile;
    _seed(profile);
    final source = (profile?.fullName ?? profile?.phone ?? 'U').trim();
    final initials = source.length > 1 ? source.substring(0, 2).toUpperCase() : source.toUpperCase();

    return Scaffold(
      backgroundColor: WaouhPalette.pearl,
      appBar: AppBar(
        automaticallyImplyLeading: false,
        leading: IconButton(onPressed: _back, icon: const Icon(Icons.arrow_back_rounded), tooltip: 'Retour'),
        title: const Text('Mon profil'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(WaouhSpace.lg),
        children: [
          const SizedBox(height: WaouhSpace.md),
          Center(
            child: InkWell(
              borderRadius: BorderRadius.circular(60),
              onTap: _busy ? null : () => _pickAvatar(auth),
              child: Stack(children: [
                CircleAvatar(
                  radius: 54,
                  backgroundColor: WaouhPalette.green,
                  backgroundImage: profile?.avatarUrl == null ? null : NetworkImage(profile!.avatarUrl!),
                  child: profile?.avatarUrl == null ? Text(initials, style: const TextStyle(color: Colors.white, fontSize: 30, fontWeight: FontWeight.w800)) : null,
                ),
                Positioned(
                  right: 0,
                  bottom: 0,
                  child: CircleAvatar(
                    radius: 18,
                    backgroundColor: WaouhPalette.green,
                    child: _busy ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Icon(Icons.camera_alt_outlined, size: 18, color: Colors.white),
                  ),
                ),
              ]),
            ),
          ),
          const SizedBox(height: WaouhSpace.xl),
          Text('Nom complet', style: WaouhText.bodyStrong),
          const SizedBox(height: WaouhSpace.xs),
          TextField(
            controller: _name,
            onChanged: (_) => setState(() => _dirty = true),
            decoration: const InputDecoration(prefixIcon: Icon(Icons.person_outline_rounded)),
          ),
          const SizedBox(height: WaouhSpace.md),
          Text('Téléphone', style: WaouhText.bodyStrong),
          const SizedBox(height: WaouhSpace.xs),
          _LockedValue(icon: Icons.phone_outlined, value: profile?.phone ?? 'Non renseigné'),
          const SizedBox(height: WaouhSpace.md),
          Text('Email', style: WaouhText.bodyStrong),
          const SizedBox(height: WaouhSpace.xs),
          _LockedValue(icon: Icons.mail_outline_rounded, value: profile?.email ?? 'Non renseigné'),
          const SizedBox(height: WaouhSpace.xl),
          FilledButton(
            onPressed: !_dirty || _busy ? null : () => _save(auth),
            child: const Text('Enregistrer'),
          ),
          const SizedBox(height: WaouhSpace.sm),
          OutlinedButton.icon(
            style: OutlinedButton.styleFrom(foregroundColor: WaouhPalette.red),
            onPressed: _busy ? null : () => _signOut(auth),
            icon: const Icon(Icons.logout_rounded),
            label: const Text('Se déconnecter'),
          ),
        ],
      ),
    );
  }
}

class _LockedValue extends StatelessWidget {
  const _LockedValue({required this.icon, required this.value});
  final IconData icon;
  final String value;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: WaouhSpace.md, vertical: WaouhSpace.md),
    decoration: BoxDecoration(color: WaouhPalette.line.withOpacity(.35), borderRadius: BorderRadius.circular(WaouhRadius.control)),
    child: Row(children: [
      Icon(icon, color: WaouhPalette.muted),
      const SizedBox(width: WaouhSpace.sm),
      Expanded(child: Text(value, style: WaouhText.body.copyWith(color: WaouhPalette.muted))),
      const Icon(Icons.lock_outline_rounded, color: WaouhPalette.muted, size: 18),
    ]),
  );
}
