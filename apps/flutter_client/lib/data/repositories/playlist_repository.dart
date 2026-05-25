import 'package:drift/drift.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:source_api/source_api.dart';

import '../db/database.dart';
import '../db/database_provider.dart';

class PlaylistRepository {
  PlaylistRepository(this._db);
  final AppDatabase _db;

  /// All non-deleted playlists, ordered by user-defined sort then update time.
  Stream<List<SpicePlaylistRow>> watchAll() {
    return (_db.select(_db.spicePlaylists)
          ..where((p) => p.deletedAt.isNull())
          ..orderBy([
            (p) => OrderingTerm.asc(p.sortIndex),
            (p) => OrderingTerm.desc(p.updatedAt),
          ]))
        .watch();
  }

  Future<String> create(String title, {String? description}) async {
    final row = await _db.into(_db.spicePlaylists).insertReturning(
          SpicePlaylistsCompanion.insert(
            title: title,
            description: Value(description),
          ),
        );
    return row.id;
  }

  Future<void> rename(String playlistId, String title) {
    return (_db.update(_db.spicePlaylists)
          ..where((p) => p.id.equals(playlistId)))
        .write(
      SpicePlaylistsCompanion(
        title: Value(title),
        updatedAt: Value(DateTime.now()),
      ),
    );
  }

  /// Soft-delete; the row stays around as a tombstone for sync.
  Future<void> delete(String playlistId) {
    return (_db.update(_db.spicePlaylists)
          ..where((p) => p.id.equals(playlistId)))
        .write(
      SpicePlaylistsCompanion(
        deletedAt: Value(DateTime.now()),
        updatedAt: Value(DateTime.now()),
      ),
    );
  }

  /// Items in a playlist, ordered by position.
  Stream<List<SpicePlaylistItemRow>> watchItems(String playlistId) {
    return (_db.select(_db.spicePlaylistItems)
          ..where((i) => i.playlistId.equals(playlistId))
          ..orderBy([(i) => OrderingTerm.asc(i.position)]))
        .watch();
  }

  Future<void> addTrack(String playlistId, Track track) async {
    // Append: position = current max + 1.
    final maxQuery = _db.selectOnly(_db.spicePlaylistItems)
      ..addColumns([_db.spicePlaylistItems.position.max()])
      ..where(_db.spicePlaylistItems.playlistId.equals(playlistId));
    final result = await maxQuery.getSingle();
    final nextPosition =
        (result.read(_db.spicePlaylistItems.position.max()) ?? -1) + 1;

    await _db.into(_db.spicePlaylistItems).insert(
          SpicePlaylistItemsCompanion.insert(
            playlistId: playlistId,
            position: nextPosition,
            sourceId: track.sourceId,
            trackId: track.id,
            title: track.title,
            artist: Value(track.artists.map((a) => a.name).join(', ')),
            durationMs: Value(track.durationMs),
            artworkUrl: Value(track.artworkUrl),
          ),
        );

    await (_db.update(_db.spicePlaylists)
          ..where((p) => p.id.equals(playlistId)))
        .write(SpicePlaylistsCompanion(updatedAt: Value(DateTime.now())));
  }

  /// Convert a stored row back into a domain [Track] for playback wiring.
  Track itemToTrack(SpicePlaylistItemRow row) {
    return Track(
      sourceId: row.sourceId,
      id: row.trackId,
      title: row.title,
      artists:
          row.artist.isEmpty ? const [] : [Artist(id: row.artist, name: row.artist)],
      durationMs: row.durationMs,
      artworkUrl: row.artworkUrl,
    );
  }
}

final playlistRepositoryProvider = Provider<PlaylistRepository>((ref) {
  return PlaylistRepository(ref.watch(databaseProvider));
});

final allPlaylistsProvider = StreamProvider<List<SpicePlaylistRow>>((ref) {
  return ref.watch(playlistRepositoryProvider).watchAll();
});

final playlistItemsProvider =
    StreamProvider.family<List<SpicePlaylistItemRow>, String>((ref, id) {
  return ref.watch(playlistRepositoryProvider).watchItems(id);
});
