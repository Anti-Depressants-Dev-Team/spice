import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:source_api/source_api.dart';
import 'package:source_youtube/source_youtube.dart';

import '../../data/repositories/playlist_repository.dart';
import '../../services/audio/audio_providers.dart';
import '../../services/source/source_providers.dart';
import '../player/player_state.dart';

class PlaylistDetailScreen extends ConsumerWidget {
  const PlaylistDetailScreen({super.key, required this.playlistId});
  final String playlistId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final itemsAsync = ref.watch(playlistItemsProvider(playlistId));
    final loadingTrackId = ref.watch(loadingTrackIdProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Playlist')),
      body: itemsAsync.when(
        data: (items) {
          if (items.isEmpty) {
            return const Center(
              child: Padding(
                padding: EdgeInsets.all(24),
                child: Text(
                  'This playlist is empty. Long-press a search result to add '
                  'tracks.',
                  textAlign: TextAlign.center,
                ),
              ),
            );
          }
          return ListView.separated(
            itemCount: items.length,
            separatorBuilder: (_, _) => const Divider(height: 1),
            itemBuilder: (context, i) {
              final item = items[i];
              final isLoading = loadingTrackId == item.trackId;
              final blocked = loadingTrackId != null;
              return ListTile(
                enabled: !blocked,
                leading: item.artworkUrl != null
                    ? ClipRRect(
                        borderRadius: BorderRadius.circular(4),
                        child: Image.network(
                          item.artworkUrl!,
                          width: 48,
                          height: 48,
                          fit: BoxFit.cover,
                          errorBuilder: (_, _, _) =>
                              const Icon(Icons.music_note),
                        ),
                      )
                    : const Icon(Icons.music_note),
                title: Text(
                  item.title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                subtitle: Text(
                  item.artist,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                trailing: isLoading
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : item.durationMs != null
                        ? Text(_fmt(Duration(milliseconds: item.durationMs!)))
                        : null,
                onTap: blocked
                    ? null
                    : () => _play(
                          context,
                          ref,
                          ref
                              .read(playlistRepositoryProvider)
                              .itemToTrack(item),
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

  static String _fmt(Duration d) {
    final m = d.inMinutes;
    final s = d.inSeconds.remainder(60).toString().padLeft(2, '0');
    return '$m:$s';
  }
}
