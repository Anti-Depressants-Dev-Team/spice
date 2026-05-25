import 'package:drift/drift.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:source_api/source_api.dart';

import '../db/database.dart';
import '../db/database_provider.dart';

class LikesRepository {
  LikesRepository(this._db);
  final AppDatabase _db;

  Stream<List<SpiceLikeRow>> watchAll() {
    return (_db.select(_db.spiceLikes)
          ..orderBy([(l) => OrderingTerm.desc(l.likedAt)]))
        .watch();
  }

  Stream<bool> watchIsLiked(String sourceId, String trackId) {
    return (_db.select(_db.spiceLikes)
          ..where((l) =>
              l.sourceId.equals(sourceId) & l.trackId.equals(trackId)))
        .watchSingleOrNull()
        .map((r) => r != null);
  }

  Future<void> like(Track track) async {
    await _db.into(_db.spiceLikes).insertOnConflictUpdate(
          SpiceLikesCompanion.insert(
            sourceId: track.sourceId,
            trackId: track.id,
            title: track.title,
            artist: Value(track.artists.map((a) => a.name).join(', ')),
            durationMs: Value(track.durationMs),
            artworkUrl: Value(track.artworkUrl),
          ),
        );
  }

  Future<void> unlike(String sourceId, String trackId) {
    return (_db.delete(_db.spiceLikes)
          ..where((l) =>
              l.sourceId.equals(sourceId) & l.trackId.equals(trackId)))
        .go();
  }

  Track rowToTrack(SpiceLikeRow row) {
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

final likesRepositoryProvider = Provider<LikesRepository>((ref) {
  return LikesRepository(ref.watch(databaseProvider));
});

final allLikesProvider = StreamProvider<List<SpiceLikeRow>>((ref) {
  return ref.watch(likesRepositoryProvider).watchAll();
});
