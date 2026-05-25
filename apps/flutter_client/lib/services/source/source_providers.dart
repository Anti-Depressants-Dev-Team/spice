import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:source_api/source_api.dart';

import 'native_source_factory.dart';
import 'yt_music_web_source.dart';

/// The active [MusicSource]. Web routes through the Spice backend because
/// browsers cannot fetch googlevideo streams directly; native platforms resolve
/// streams on-device.
final musicSourceProvider = Provider<MusicSource>((ref) {
  if (kIsWeb) return YtMusicWebSource();
  return createNativeMusicSource();
});

String friendlyMusicError(Object error) {
  if (kIsWeb) return friendlyWebMusicMessage(error);
  return friendlyNativeMusicMessage(error);
}
