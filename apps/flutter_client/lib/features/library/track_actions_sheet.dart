import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:source_api/source_api.dart';
import 'package:source_youtube/source_youtube.dart';

import '../../data/repositories/likes_repository.dart';
import '../../data/repositories/playlist_repository.dart';
import '../../services/audio/audio_providers.dart';
import '../../services/source/source_providers.dart';
import 'new_playlist_dialog.dart';

/// Bottom sheet with secondary actions on a track row.
///
/// Long-press on a search result or library entry pops this. Picks up the
/// current liked-state from [LikesRepository] so the heart icon reflects
/// reality without re-querying.
class TrackActionsSheet extends ConsumerWidget {
  const TrackActionsSheet({super.key, required this.track});
  final Track track;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isLikedAsync = ref.watch(_isLikedProvider(_TrackKey(
      sourceId: track.sourceId,
      trackId: track.id,
    )));
    final isLiked = isLikedAsync.maybeWhen(data: (v) => v, orElse: () => false);

    return SafeArea(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: Row(
              children: [
                if (track.artworkUrl != null)
                  ClipRRect(
                    borderRadius: BorderRadius.circular(4),
                    child: Image.network(
                      track.artworkUrl!,
                      width: 44,
                      height: 44,
                      fit: BoxFit.cover,
                      errorBuilder: (_, _, _) =>
                          const Icon(Icons.music_note),
                    ),
                  ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        track.title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      Text(
                        track.artists.map((a) => a.name).join(', '),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const Divider(height: 1),
          ListTile(
            leading: const Icon(Icons.queue_music),
            title: const Text('Add to queue'),
            onTap: () => _addToQueue(context, ref),
          ),
          ListTile(
            leading: Icon(isLiked ? Icons.favorite : Icons.favorite_border),
            title: Text(isLiked ? 'Unlike' : 'Like'),
            onTap: () => _toggleLike(context, ref, isLiked),
          ),
          ListTile(
            leading: const Icon(Icons.playlist_add),
            title: const Text('Add to playlist…'),
            onTap: () => _addToPlaylist(context, ref),
          ),
          const SizedBox(height: 8),
        ],
      ),
    );
  }

  Future<void> _addToQueue(BuildContext context, WidgetRef ref) async {
    Navigator.of(context).pop();
    final messenger = ScaffoldMessenger.of(context);
    try {
      final source = ref.read(musicSourceProvider);
      final details = await source.getTrack(track.id);
      final handler = await ref.read(audioHandlerProvider.future);
      await handler.enqueueTrackDetails(details);
      messenger.showSnackBar(
        SnackBar(content: Text('Queued: ${track.title}')),
      );
    } catch (e) {
      messenger.showSnackBar(
        SnackBar(content: Text(YtMusicNativeSource.friendlyMessage(e))),
      );
    }
  }

  Future<void> _toggleLike(
    BuildContext context,
    WidgetRef ref,
    bool isLiked,
  ) async {
    Navigator.of(context).pop();
    final repo = ref.read(likesRepositoryProvider);
    if (isLiked) {
      await repo.unlike(track.sourceId, track.id);
    } else {
      await repo.like(track);
    }
  }

  Future<void> _addToPlaylist(BuildContext context, WidgetRef ref) async {
    Navigator.of(context).pop();
    final picked = await showModalBottomSheet<String>(
      context: context,
      showDragHandle: true,
      builder: (_) => _PlaylistPickerSheet(),
    );
    if (picked == null) return;

    final repo = ref.read(playlistRepositoryProvider);
    String playlistId = picked;
    String? playlistTitle;
    if (picked == _PlaylistPickerSheet.newPlaylistSentinel) {
      // Wait — we shouldn't reach here without context. Handled inside sheet.
      return;
    }
    if (picked.startsWith('new:')) {
      playlistTitle = picked.substring(4);
      playlistId = await repo.create(playlistTitle);
    }
    await repo.addTrack(playlistId, track);

    if (!context.mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(playlistTitle == null
            ? 'Added to playlist'
            : 'Created "$playlistTitle" and added track'),
      ),
    );
  }
}

class _TrackKey {
  const _TrackKey({required this.sourceId, required this.trackId});
  final String sourceId;
  final String trackId;

  @override
  bool operator ==(Object other) =>
      other is _TrackKey &&
      other.sourceId == sourceId &&
      other.trackId == trackId;
  @override
  int get hashCode => Object.hash(sourceId, trackId);
}

final _isLikedProvider =
    StreamProvider.family.autoDispose<bool, _TrackKey>((ref, key) {
  return ref
      .watch(likesRepositoryProvider)
      .watchIsLiked(key.sourceId, key.trackId);
});

/// Lets the user pick an existing playlist or create a new one. Returns the
/// chosen playlist id, or `"new:<title>"` if the user opted to create.
class _PlaylistPickerSheet extends ConsumerWidget {
  static const newPlaylistSentinel = '__new_playlist__';

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final playlists = ref.watch(allPlaylistsProvider);
    return SafeArea(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          ListTile(
            leading: const Icon(Icons.add),
            title: const Text('New playlist…'),
            onTap: () async {
              final title = await showDialog<String>(
                context: context,
                builder: (_) => const NewPlaylistDialog(),
              );
              if (title == null || title.isEmpty) return;
              if (!context.mounted) return;
              Navigator.of(context).pop('new:$title');
            },
          ),
          const Divider(height: 1),
          ...playlists.maybeWhen(
            data: (rows) => rows
                .map((p) => ListTile(
                      leading: const Icon(Icons.queue_music),
                      title: Text(p.title),
                      onTap: () => Navigator.of(context).pop(p.id),
                    ))
                .toList(),
            orElse: () => const [
              Padding(
                padding: EdgeInsets.all(16),
                child: CircularProgressIndicator(),
              ),
            ],
          ),
          const SizedBox(height: 8),
        ],
      ),
    );
  }
}
