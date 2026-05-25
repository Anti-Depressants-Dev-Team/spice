import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:source_api/source_api.dart';

import '../../services/audio/audio_providers.dart';
import '../../services/source/source_providers.dart';
import '../library/track_actions_sheet.dart';
import '../player/player_state.dart';
import 'search_controller.dart';

class SearchScreen extends ConsumerStatefulWidget {
  const SearchScreen({super.key});

  @override
  ConsumerState<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends ConsumerState<SearchScreen> {
  final _controller = TextEditingController();
  Timer? _debounce;

  @override
  void dispose() {
    _debounce?.cancel();
    _controller.dispose();
    super.dispose();
  }

  void _onChanged(String q) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 350), () {
      ref.read(searchProvider.notifier).search(q);
    });
  }

  Future<void> _playTrack(Track track) async {
    final loadingNotifier = ref.read(loadingTrackIdProvider.notifier);
    if (loadingNotifier.state != null) {
      // Already resolving a track — drop spam taps.
      return;
    }
    loadingNotifier.state = track.id;
    final source = ref.read(musicSourceProvider);
    final handlerFuture = ref.read(audioHandlerProvider.future);
    try {
      final details = await source.getTrack(track.id);
      final handler = await handlerFuture;
      await handler.playTrackDetails(details);
    } catch (e, st) {
      // Full error to the dev console; friendly version to the user.
      debugPrint('playTrack(${track.id}) failed: ${e.runtimeType}: $e\n$st');
      if (!mounted) return;
      ScaffoldMessenger.of(context)
        ..hideCurrentSnackBar()
        ..showSnackBar(
          SnackBar(
            content: Text(friendlyMusicError(e)),
            duration: const Duration(seconds: 6),
          ),
        );
    } finally {
      if (loadingNotifier.state == track.id) {
        loadingNotifier.state = null;
      }
    }
  }

  void _showActions(Track track) {
    showModalBottomSheet(
      context: context,
      showDragHandle: true,
      builder: (_) => TrackActionsSheet(track: track),
    );
  }

  @override
  Widget build(BuildContext context) {
    final searchState = ref.watch(searchProvider);
    final loadingTrackId = ref.watch(loadingTrackIdProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Spice')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(12),
            child: TextField(
              controller: _controller,
              autofocus: true,
              textInputAction: TextInputAction.search,
              decoration: const InputDecoration(
                prefixIcon: Icon(Icons.search),
                hintText: 'Search YouTube Music',
                border: OutlineInputBorder(),
              ),
              onChanged: _onChanged,
              onSubmitted: (q) => ref.read(searchProvider.notifier).search(q),
            ),
          ),
          Expanded(
            child: searchState.when(
              data: (r) => r.tracks.isEmpty
                  ? const Center(child: Text('Type to search'))
                  : ListView.separated(
                      itemCount: r.tracks.length,
                      separatorBuilder: (_, _) => const Divider(height: 1),
                      itemBuilder: (context, i) {
                        final t = r.tracks[i];
                        final isLoading = loadingTrackId == t.id;
                        final blocked = loadingTrackId != null;
                        return ListTile(
                          enabled: !blocked,
                          leading: t.artworkUrl != null
                              ? ClipRRect(
                                  borderRadius: BorderRadius.circular(4),
                                  child: Image.network(
                                    t.artworkUrl!,
                                    width: 48,
                                    height: 48,
                                    fit: BoxFit.cover,
                                    errorBuilder: (_, _, _) =>
                                        const Icon(Icons.music_note),
                                  ),
                                )
                              : const Icon(Icons.music_note),
                          title: Text(
                            t.title,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          subtitle: Text(
                            t.artists.isEmpty
                                ? ''
                                : t.artists.map((a) => a.name).join(', '),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          trailing: isLoading
                              ? const SizedBox(
                                  width: 20,
                                  height: 20,
                                  child: CircularProgressIndicator(
                                      strokeWidth: 2),
                                )
                              : t.durationMs != null
                                  ? Text(_fmtDuration(Duration(
                                      milliseconds: t.durationMs!)))
                                  : null,
                          onTap: blocked ? null : () => _playTrack(t),
                          onLongPress: blocked ? null : () => _showActions(t),
                        );
                      },
                    ),
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => Center(child: Text('Error: $e')),
            ),
          ),
        ],
      ),
    );
  }
}

String _fmtDuration(Duration d) {
  final m = d.inMinutes;
  final s = d.inSeconds.remainder(60).toString().padLeft(2, '0');
  return '$m:$s';
}
