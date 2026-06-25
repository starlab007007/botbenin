import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../status_model.dart';

class StatusScreen extends StatelessWidget {
  const StatusScreen({super.key});
  @override
  Widget build(BuildContext context) {
    final state = context.watch<StatusModel>();
    return StreamBuilder(
      stream: state.stream(),
      builder: (context, snapshot) {
        final items = snapshot.data ?? const [];
        if (items.isEmpty) return const Center(child: Text('Aucun statut actif'));
        return ListView.builder(
          itemCount: items.length,
          itemBuilder: (_, index) {
            final item = items[index];
            return ListTile(
              leading: const Icon(Icons.auto_awesome_outlined),
              title: Text(item.title),
              subtitle: Text(item.caption ?? item.location ?? ''),
              trailing: item.price == null ? null : Text('${item.price} F'),
            );
          },
        );
      },
    );
  }
}
