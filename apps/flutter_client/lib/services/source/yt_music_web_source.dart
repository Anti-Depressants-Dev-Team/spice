import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:source_api/source_api.dart';

class YtMusicWebException implements Exception {
  YtMusicWebException(this.message, {this.statusCode});

  final String message;
  final int? statusCode;

  @override
  String toString() => message;
}

class YtMusicWebSource implements MusicSource {
  YtMusicWebSource({
    http.Client? httpClient,
    Uri? baseUrl,
  })  : _http = httpClient ?? http.Client(),
        _baseUrl = baseUrl ?? defaultBackendBaseUrl();

  final http.Client _http;
  final Uri _baseUrl;

  static Uri defaultBackendBaseUrl() {
    const configured =
        String.fromEnvironment('SPICE_BACKEND_BASE_URL', defaultValue: '');
    if (configured.isNotEmpty) return Uri.parse(configured);

    final current = Uri.base;
    final isLocal = current.host == 'localhost' ||
        current.host == '127.0.0.1' ||
        current.host == '[::1]';
    if (isLocal) return Uri.parse('http://localhost:3000');
    return current.replace(path: '', query: '', fragment: '');
  }

  @override
  String get id => 'youtube_music';

  @override
  String get displayName => 'YouTube Music';

  @override
  Set<SourceCapability> get capabilities => const {
        SourceCapability.search,
        SourceCapability.streaming,
        SourceCapability.recommendations,
      };

  @override
  Future<SearchResults> search(
    String query, {
    SearchKind kind = SearchKind.all,
    int limit = 20,
  }) async {
    final uri = _apiUri('/api/yt/search', {
      'q': query,
      'kind': kind.name,
      'limit': '$limit',
    });
    final json = await _getJson(uri);
    return _parseSearchResults(json);
  }

  @override
  Future<TrackDetails> getTrack(String trackId) async {
    final json = await _getJson(_apiUri('/api/yt/track/$trackId'));
    return _parseTrackDetails(json);
  }

  @override
  Future<List<Track>> getPlaylist(String playlistId) {
    throw UnimplementedError('Web playlist reads land with Phase 4 library sync.');
  }

  Uri _apiUri(String path, [Map<String, String>? query]) {
    final normalizedBase = _baseUrl.path.endsWith('/')
        ? _baseUrl
        : _baseUrl.replace(path: '${_baseUrl.path}/');
    final relative = Uri(path: path.startsWith('/') ? path.substring(1) : path);
    return normalizedBase.resolveUri(relative).replace(queryParameters: query);
  }

  Future<Map<String, dynamic>> _getJson(Uri uri) async {
    final response = await _http.get(uri);
    Object? decoded;
    try {
      decoded = json.decode(response.body);
    } on FormatException {
      throw YtMusicWebException(
        'Backend returned a non-JSON response.',
        statusCode: response.statusCode,
      );
    }

    if (decoded is! Map<String, dynamic>) {
      throw YtMusicWebException(
        'Backend response had an unexpected shape.',
        statusCode: response.statusCode,
      );
    }
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw YtMusicWebException(
        decoded['message'] as String? ??
            decoded['error'] as String? ??
            'Backend request failed.',
        statusCode: response.statusCode,
      );
    }
    return decoded;
  }

  SearchResults _parseSearchResults(Map<String, dynamic> json) {
    final tracksJson = json['tracks'];
    return SearchResults(
      tracks: tracksJson is List
          ? tracksJson
              .whereType<Map<String, dynamic>>()
              .map(_parseTrack)
              .toList()
          : const [],
    );
  }

  TrackDetails _parseTrackDetails(Map<String, dynamic> json) {
    final trackJson = json['track'];
    final streamsJson = json['streams'];
    if (trackJson is! Map<String, dynamic> || streamsJson is! List) {
      throw YtMusicWebException('Track response had an unexpected shape.');
    }
    return TrackDetails(
      track: _parseTrack(trackJson),
      streams: streamsJson
          .whereType<Map<String, dynamic>>()
          .map(_parseStream)
          .toList(),
    );
  }

  Track _parseTrack(Map<String, dynamic> json) {
    final artistsJson = json['artists'];
    final albumJson = json['album'];
    return Track(
      sourceId: json['sourceId'] as String? ?? id,
      id: json['id'] as String? ?? '',
      title: json['title'] as String? ?? 'Unknown track',
      artists: artistsJson is List
          ? artistsJson
              .whereType<Map<String, dynamic>>()
              .map(_parseArtist)
              .toList()
          : const [],
      album: albumJson is Map<String, dynamic> ? _parseAlbum(albumJson) : null,
      durationMs: json['durationMs'] as int?,
      artworkUrl: json['artworkUrl'] as String?,
    );
  }

  Artist _parseArtist(Map<String, dynamic> json) {
    return Artist(
      id: json['id'] as String? ?? json['name'] as String? ?? '',
      name: json['name'] as String? ?? 'Unknown artist',
      artworkUrl: json['artworkUrl'] as String?,
    );
  }

  Album _parseAlbum(Map<String, dynamic> json) {
    final artistsJson = json['artists'];
    return Album(
      id: json['id'] as String? ?? '',
      title: json['title'] as String? ?? 'Unknown album',
      artists: artistsJson is List
          ? artistsJson
              .whereType<Map<String, dynamic>>()
              .map(_parseArtist)
              .toList()
          : const [],
      artworkUrl: json['artworkUrl'] as String?,
      year: json['year'] as int?,
    );
  }

  StreamVariant _parseStream(Map<String, dynamic> json) {
    final url = json['url'] as String?;
    if (url == null || url.isEmpty) {
      throw YtMusicWebException('Track stream response did not include a URL.');
    }
    final expiresAt = json['expiresAt'] as String?;
    return StreamVariant(
      url: Uri.parse(url),
      codec: json['codec'] as String? ?? 'unknown',
      bitrate: json['bitrate'] as int? ?? 0,
      container: json['container'] as String? ?? 'unknown',
      expiresAt: expiresAt == null ? null : DateTime.tryParse(expiresAt),
    );
  }
}

String friendlyWebMusicMessage(Object error) {
  if (error is YtMusicWebException) return error.message;
  final firstLine = error.toString().split('\n').first.trim();
  return firstLine.isEmpty ? 'Playback failed.' : firstLine;
}
