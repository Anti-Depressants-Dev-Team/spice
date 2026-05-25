import 'package:source_api/source_api.dart';

MusicSource createNativeMusicSource() {
  throw UnsupportedError('Native YouTube Music source is unavailable on web.');
}

String friendlyNativeMusicMessage(Object error) {
  final firstLine = error.toString().split('\n').first.trim();
  return firstLine.isEmpty ? 'Playback failed.' : firstLine;
}
