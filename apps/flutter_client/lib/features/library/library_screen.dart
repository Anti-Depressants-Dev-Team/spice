import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../data/repositories/likes_repository.dart';
import '../../data/repositories/playlist_repository.dart';
import 'new_playlist_dialog.dart';

class LibraryScreen extends ConsumerWidget {
  const LibraryScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final playlists = ref.watch(allPlaylistsProvider);
    final likes = ref.watch(allLikesProvider);
    final likedCount = likes.maybeWhen(data: (l) => l.length, orElse: () => 0);

    return Scaffold(
      appBar: AppBar(title: const Text('Library')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _createPlaylist(context, ref),
        icon: const Icon(Icons.add),
        label: const Text('New playlist'),
      ),
      body: playlists.when(
        data: (rows) => ListView(
          children: [
            ListTile(
              leading: CircleAvatar(
                backgroundColor:
                    Theme.of(context).colorScheme.primaryContainer,
                child: Icon(
                  Icons.favorite,
                  color: Theme.of(context).colorScheme.onPrimaryContainer,
                ),
              ),
              title: const Text('Liked songs'),
              subtitle: Text(likedCount == 0
                  ? 'Hearted tracks live here'
                  : '$likedCount track${likedCount == 1 ? '' : 's'}'),
              onTap: () => context.push('/library/liked'),
            ),
            if (rows.isNotEmpty) const Divider(height: 1),
            ...rows.map((p) => ListTile(
                  leading: const CircleAvatar(
                    child: Icon(Icons.queue_music),
                  ),
                  title: Text(p.title),
                  subtitle: (p.description?.isNotEmpty ?? false)
                      ? Text(p.description!, maxLines: 1)
                      : null,
                  trailing: PopupMenuButton<String>(
                    onSelected: (a) => _onPlaylistAction(context, ref, p.id, a),
                    itemBuilder: (_) => const [
                      PopupMenuItem(value: 'rename', child: Text('Rename')),
                      PopupMenuItem(value: 'delete', child: Text('Delete')),
                    ],
                  ),
                  onTap: () => context.push('/library/${p.id}'),
                )),
            if (rows.isEmpty)
              const Padding(
                padding: EdgeInsets.all(24),
                child: Text(
                  'No playlists yet. Tap "+ New playlist" or long-press a '
                  'search result to add tracks.',
                  textAlign: TextAlign.center,
                ),
              ),
            const SizedBox(height: 88),
          ],
        ),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Error: $e')),
      ),
    );
  }

  Future<void> _createPlaylist(BuildContext context, WidgetRef ref) async {
    final title = await showDialog<String>(
      context: context,
      builder: (_) => const NewPlaylistDialog(),
    );
    if (title == null || title.isEmpty) return;
    await ref.read(playlistRepositoryProvider).create(title);
  }

  Future<void> _onPlaylistAction(
    BuildContext context,
    WidgetRef ref,
    String id,
    String action,
  ) async {
    final repo = ref.read(playlistRepositoryProvider);
    if (action == 'delete') {
      await repo.delete(id);
    } else if (action == 'rename') {
      final newTitle = await showDialog<String>(
        context: context,
        builder: (_) => const NewPlaylistDialog(),
      );
      if (newTitle != null && newTitle.isNotEmpty) {
        await repo.rename(id, newTitle);
      }
    }
  }
}
