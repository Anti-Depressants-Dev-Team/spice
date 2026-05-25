import 'package:audio_service/audio_service.dart';
import 'package:flutter/foundation.dart';
import 'package:just_audio/just_audio.dart';
import 'package:source_api/source_api.dart';

/// The single place that knows how to play things.
///
/// Wraps [AudioPlayer] backed by a [ConcatenatingAudioSource], so we get a
/// real queue: skip-next / skip-previous, shuffle, repeat, and gapless
/// playback all flow from `just_audio` rather than being reimplemented.
///
/// Two parallel mirrors are kept aligned by index:
///   - `_activeSource.children` — the actual playable queue handed to the player
///   - `_items` — the [MediaItem]s broadcast on `queue` and `mediaItem`
class SpiceAudioHandler extends BaseAudioHandler with QueueHandler, SeekHandler {
  SpiceAudioHandler() {
    _player.playbackEventStream.listen(
      _broadcastPlaybackState,
      onError: (Object e, StackTrace s) {
        debugPrint('AudioPlayer error: ${e.runtimeType}: $e');
        playbackState.add(
          playbackState.value.copyWith(
            processingState: AudioProcessingState.error,
            errorMessage: e.toString(),
          ),
        );
      },
    );
    _player.currentIndexStream.listen(_handleIndexChange);
    _player.durationStream.listen(_pushDuration);
    // Don't install an audio source yet — `just_audio` doesn't reliably load
    // when an empty ConcatenatingAudioSource is later mutated, so we set the
    // source on first play with real children instead.
  }

  final AudioPlayer _player = AudioPlayer();
  final List<MediaItem> _items = [];
  ConcatenatingAudioSource? _activeSource;

  /// Continuous playback position. Ticks ~5x/sec while playing.
  Stream<Duration> get positionStream => _player.positionStream;

  /// Replace the queue with a single track and start playing it.
  Future<void> playTrackDetails(TrackDetails details) async {
    final item = _toMediaItem(details);
    final source = _toAudioSource(details, item);

    _items
      ..clear()
      ..add(item);
    queue.add(List.unmodifiable(_items));
    mediaItem.add(item);

    // Always rebuild — handing the player a fresh ConcatenatingAudioSource is
    // the most reliable way to force a clean load.
    _activeSource = ConcatenatingAudioSource(children: [source]);
    await _player.setAudioSource(_activeSource!);
    await _player.play();
  }

  /// Add a track to the end of the queue. If the queue was empty, playback
  /// starts; otherwise the track waits its turn.
  Future<void> enqueueTrackDetails(TrackDetails details) async {
    if (_activeSource == null || _items.isEmpty) {
      await playTrackDetails(details);
      return;
    }
    final item = _toMediaItem(details);
    final source = _toAudioSource(details, item);
    await _activeSource!.add(source);
    _items.add(item);
    queue.add(List.unmodifiable(_items));
  }

  AudioSource _toAudioSource(TrackDetails details, MediaItem tag) {
    if (details.streams.isEmpty) {
      throw StateError('No playable streams for track ${details.track.id}');
    }
    return AudioSource.uri(
      details.streams.first.url,
      tag: tag,
      // googlevideo occasionally serves "source error 0" to unknown UAs.
      // Mimicking a YT Android client makes the fetch consistent with what
      // youtube_explode_dart's HEAD probe used during signature/manifest
      // resolution. just_audio will spin up a local proxy to inject this.
      headers: kIsWeb
          ? null
          : const {
              'User-Agent':
                  'com.google.android.youtube/19.29.1 (Linux; U; Android 11) gzip',
            },
    );
  }

  MediaItem _toMediaItem(TrackDetails details) {
    final track = details.track;
    return MediaItem(
      id: '${track.sourceId}:${track.id}',
      title: track.title,
      artist: track.artists.map((a) => a.name).join(', '),
      album: track.album?.title,
      duration: track.durationMs != null
          ? Duration(milliseconds: track.durationMs!)
          : null,
      artUri: track.artworkUrl != null ? Uri.parse(track.artworkUrl!) : null,
      extras: {
        'sourceId': track.sourceId,
        'trackId': track.id,
        'streamUrl': details.streams.first.url.toString(),
      },
    );
  }

  @override
  Future<void> play() => _player.play();

  @override
  Future<void> pause() => _player.pause();

  @override
  Future<void> stop() async {
    await _player.stop();
    await super.stop();
  }

  @override
  Future<void> seek(Duration position) => _player.seek(position);

  @override
  Future<void> skipToNext() async {
    if (_player.hasNext) await _player.seekToNext();
  }

  @override
  Future<void> skipToPrevious() async {
    // Mirror common music-player UX: if more than ~3s into the current track,
    // skip-previous restarts the current one rather than jumping back.
    if (_player.position > const Duration(seconds: 3)) {
      await _player.seek(Duration.zero);
    } else if (_player.hasPrevious) {
      await _player.seekToPrevious();
    } else {
      await _player.seek(Duration.zero);
    }
  }

  @override
  Future<void> skipToQueueItem(int index) async {
    if (index < 0 || index >= _items.length) return;
    await _player.seek(Duration.zero, index: index);
  }

  @override
  Future<void> setShuffleMode(AudioServiceShuffleMode shuffleMode) async {
    final enabled = shuffleMode != AudioServiceShuffleMode.none;
    if (enabled) await _player.shuffle();
    await _player.setShuffleModeEnabled(enabled);
    playbackState.add(playbackState.value.copyWith(shuffleMode: shuffleMode));
  }

  @override
  Future<void> setRepeatMode(AudioServiceRepeatMode repeatMode) async {
    await _player.setLoopMode(switch (repeatMode) {
      AudioServiceRepeatMode.none => LoopMode.off,
      AudioServiceRepeatMode.one => LoopMode.one,
      AudioServiceRepeatMode.group ||
      AudioServiceRepeatMode.all =>
        LoopMode.all,
    });
    playbackState.add(playbackState.value.copyWith(repeatMode: repeatMode));
  }

  void _handleIndexChange(int? index) {
    if (index == null) return;
    if (index >= 0 && index < _items.length) {
      mediaItem.add(_items[index]);
    }
  }

  void _pushDuration(Duration? duration) {
    final current = mediaItem.value;
    if (current != null && duration != null) {
      mediaItem.add(current.copyWith(duration: duration));
    }
  }

  void _broadcastPlaybackState(PlaybackEvent event) {
    final playing = _player.playing;
    playbackState.add(
      playbackState.value.copyWith(
        controls: [
          MediaControl.skipToPrevious,
          if (playing) MediaControl.pause else MediaControl.play,
          MediaControl.stop,
          MediaControl.skipToNext,
        ],
        systemActions: const {
          MediaAction.seek,
          MediaAction.seekForward,
          MediaAction.seekBackward,
        },
        androidCompactActionIndices: const [0, 1, 3],
        processingState: switch (_player.processingState) {
          ProcessingState.idle => AudioProcessingState.idle,
          ProcessingState.loading => AudioProcessingState.loading,
          ProcessingState.buffering => AudioProcessingState.buffering,
          ProcessingState.ready => AudioProcessingState.ready,
          ProcessingState.completed => AudioProcessingState.completed,
        },
        playing: playing,
        updatePosition: _player.position,
        bufferedPosition: _player.bufferedPosition,
        speed: _player.speed,
        queueIndex: event.currentIndex,
      ),
    );
  }
}
