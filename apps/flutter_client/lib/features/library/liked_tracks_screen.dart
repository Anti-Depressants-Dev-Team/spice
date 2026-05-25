import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:source_api/source_api.dart';
import 'package:source_youtube/source_youtube.dart';

import '../../data/repositories/likes_repository.dart';
import '../../services/audio/audio_providers.dart';
import '../../services/source/source_providers.dart';
import '../player/player_state.dart';

class LikedTracksScreen extends ConsumerWidget {
  const LikedTracksScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final likesAsync = ref.watch(allLikesProvider);
    final loadingTrackId = ref.watch(loadingTrackIdProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Liked songs')),
      body: likesAsync.when(
        data: (rows) {
          if (rows.isEmpty) {
            return const Center(
              child: Padding(
                padding: EdgeInsets.all(24),
                child: Text(
                  'Nothing liked yet. Long-press a search result and tap '
                  '"Like" to add it here.',
                  textAlign: TextAlign.center,
                ),
              ),
            );
          }
          return ListView.separated(
            itemCount: rows.length,
            separatorBuilder: (_, _) => const Divider(height: 1),
            itemBuilder: (context, i) {
              final row = rows[i];
              final isLoading = loadingTrackId == row.trackId;
              final blocked = loadingTrackId != null;
              return ListTile(
                enabled: !blocked,
                leading: row.artworkUrl != null
                    ? ClipRRect(
                        borderRadius: BorderRadius.circular(4),
                        child: Image.network(
                          row.artworkUrl!,
                          width: 48,
                          height: 48,
                          fit: BoxFit.cover,
                          errorBuilder: (_, _, _) =>
                              const Icon(Icons.music_note),
                        ),
                      )
                    : const Icon(Icons.music_note),
                title: Text(row.title, maxLines: 1, overflow: TextOverflow.ellipsis),
                subtitle: Text(row.artist, maxLines: 1, overflow: TextOverflow.ellipsis),
                trailing: isLoading
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : IconButton(
                        tooltip: 'Unlike',
                        icon: const Icon(Icons.favorite),
                        onPressed: blocked
                            ? null
                            : () => ref
                                .read(likesRepositoryProvider)
                                .unlike(row.sourceId, row.trackId),
                      ),
                onTap: blocked
                    ? null
                    : () => _play(
                          context,
                          ref,
                          ref.read(likesRepositoryProvider).rowToTrack(row),
                        ),
              );
            },
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Error: $e')),
      ),
    );
  }

  Future<void> _play(BuildContext context, WidgetRef ref, Track track) async {
    final notifier = ref.read(loadingTrackIdProvider.notifier);
    if (notifier.state != null) return;
    notifier.state = track.id;
    final messenger = ScaffoldMessenger.of(context);
    try {
      final source = ref.read(musicSourceProvider);
      final details = await source.getTrack(track.id);
      final handler = await ref.read(audioHandlerProvider.future);
      await handler.playTrackDetails(details);
    } catch (e) {
      messenger
        ..hideCurrentSnackBar()
        ..showSnackBar(
          SnackBar(content: Text(YtMusicNativeSource.friendlyMessage(e))),
        );
    } finally {
      if (notifier.state == track.id) notifier.state = null;
    }
  }
}
