import 'package:source_api/source_api.dart';
import 'package:source_youtube/source_youtube.dart';

MusicSource createNativeMusicSource() => YtMusicNativeSource();

String friendlyNativeMusicMessage(Object error) {
  return YtMusicNativeSource.friendlyMessage(error);
}
