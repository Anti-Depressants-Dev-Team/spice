package xyz.spiceapp.mobile.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.Album
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.ErrorOutline
import androidx.compose.material.icons.rounded.Favorite
import androidx.compose.material.icons.rounded.FavoriteBorder
import androidx.compose.material.icons.rounded.Forward10
import androidx.compose.material.icons.rounded.History
import androidx.compose.material.icons.rounded.Home
import androidx.compose.material.icons.rounded.LibraryMusic
import androidx.compose.material.icons.rounded.MusicNote
import androidx.compose.material.icons.rounded.Pause
import androidx.compose.material.icons.rounded.PlayArrow
import androidx.compose.material.icons.rounded.Refresh
import androidx.compose.material.icons.rounded.Replay10
import androidx.compose.material.icons.rounded.Search
import androidx.compose.material.icons.rounded.Settings
import androidx.compose.material.icons.rounded.Stop
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilledIconButton
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
import androidx.compose.material3.Tab
import androidx.compose.material3.PrimaryTabRow
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.Slider
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil3.compose.AsyncImage
import xyz.spiceapp.mobile.BuildConfig
import xyz.spiceapp.mobile.SpiceUiState
import xyz.spiceapp.mobile.model.AppScreen
import xyz.spiceapp.mobile.model.FeedSection
import xyz.spiceapp.mobile.model.LibraryTab
import xyz.spiceapp.mobile.model.StreamQuality
import xyz.spiceapp.mobile.model.Track
import xyz.spiceapp.mobile.playback.PlayerUiState

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SpiceApp(
    uiState: SpiceUiState,
    playerState: PlayerUiState,
    onScreenSelected: (AppScreen) -> Unit,
    onSearchQueryChanged: (String) -> Unit,
    onSearch: (String) -> Unit,
    onTrackSelected: (Track) -> Unit,
    onTogglePlayback: () -> Unit,
    onSeekTo: (Long) -> Unit,
    onSeekBy: (Long) -> Unit,
    onStopPlayback: () -> Unit,
    onToggleLike: (Track) -> Unit,
    onLibraryTabSelected: (LibraryTab) -> Unit,
    onQualitySelected: (StreamQuality) -> Unit,
    onTestEngine: () -> Unit,
    onRetryHome: () -> Unit,
    onClearMessage: () -> Unit,
) {
    val snackbarHostState = remember { SnackbarHostState() }
    var showPlayer by remember { mutableStateOf(false) }
    val message = uiState.message ?: playerState.error

    LaunchedEffect(message) {
        if (!message.isNullOrBlank()) {
            snackbarHostState.showSnackbar(message)
            onClearMessage()
        }
    }

    Scaffold(
        containerColor = SpiceBackground,
        topBar = { SpiceTopBar(uiState.screen.label) },
        snackbarHost = { SnackbarHost(snackbarHostState) },
        bottomBar = {
            Column(Modifier.background(SpiceBackground).navigationBarsPadding()) {
                uiState.currentTrack?.let { track ->
                    MiniPlayer(
                        track = track,
                        player = playerState,
                        resolving = uiState.resolvingTrackId == track.id,
                        onOpen = { showPlayer = true },
                        onToggle = onTogglePlayback,
                    )
                }
                SpiceNavigation(uiState.screen, onScreenSelected)
            }
        },
    ) { padding ->
        when (uiState.screen) {
            AppScreen.Home -> HomeScreen(uiState, padding, onTrackSelected, onSearch, onRetryHome)
            AppScreen.Search -> SearchScreen(
                uiState = uiState,
                contentPadding = padding,
                onQueryChanged = onSearchQueryChanged,
                onSearch = onSearch,
                onTrackSelected = onTrackSelected,
            )
            AppScreen.Library -> LibraryScreen(
                uiState = uiState,
                contentPadding = padding,
                onTabSelected = onLibraryTabSelected,
                onTrackSelected = onTrackSelected,
            )
            AppScreen.Settings -> SettingsScreen(uiState, padding, onQualitySelected, onTestEngine)
        }
    }

    if (showPlayer && uiState.currentTrack != null) {
        FullPlayer(
            track = uiState.currentTrack,
            player = playerState,
            liked = uiState.likedTracks.any { it.id == uiState.currentTrack.id },
            onDismiss = { showPlayer = false },
            onToggle = onTogglePlayback,
            onSeekTo = onSeekTo,
            onSeekBy = onSeekBy,
            onStop = onStopPlayback,
            onLike = { onToggleLike(uiState.currentTrack) },
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun SpiceTopBar(screenTitle: String) {
    TopAppBar(
        title = {
            Column {
                Text("SPICE MUSIC", color = SpicePink, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                Text(screenTitle, fontWeight = FontWeight.SemiBold, fontSize = 18.sp)
            }
        },
        actions = {
            Surface(shape = CircleShape, color = SpicePink, modifier = Modifier.padding(end = 16.dp).size(38.dp)) {
                Box(contentAlignment = Alignment.Center) {
                    Text("S", fontWeight = FontWeight.Bold, color = Color.White)
                }
            }
        },
        colors = TopAppBarDefaults.topAppBarColors(containerColor = SpiceBackground),
    )
}

@Composable
private fun HomeScreen(
    uiState: SpiceUiState,
    contentPadding: PaddingValues,
    onTrackSelected: (Track) -> Unit,
    onSearch: (String) -> Unit,
    onRetry: () -> Unit,
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(
            top = contentPadding.calculateTopPadding() + 12.dp,
            bottom = contentPadding.calculateBottomPadding() + 20.dp,
        ),
        verticalArrangement = Arrangement.spacedBy(22.dp),
    ) {
        item {
            Column(Modifier.padding(horizontal = 18.dp)) {
                Text("Welcome back", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
                Text("Native playback, your library, and Spice Connect-ready foundations.", color = SpiceTextMuted)
                Spacer(Modifier.height(16.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf("Pop Hits", "Lofi Chill", "Workout").forEach { category ->
                        AssistChip(onClick = { onSearch(category) }, label = { Text(category) })
                    }
                }
            }
        }

        if (uiState.historyTracks.isNotEmpty()) {
            item { TrackSection(FeedSection("Listen Again", uiState.historyTracks.take(10)), onTrackSelected) }
        }

        if (uiState.homeLoading) {
            item {
                Box(Modifier.fillMaxWidth().height(180.dp), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = SpicePink)
                }
            }
        } else if (uiState.homeSections.isEmpty()) {
            item {
                EmptyState("Home feed unavailable", "Retry the Spice search API.", onRetry)
            }
        } else {
            items(uiState.homeSections, key = { it.title }) { section ->
                TrackSection(section, onTrackSelected)
            }
        }
    }
}

@Composable
private fun ProviderBadge(label: String) {
    Surface(
        shape = RoundedCornerShape(8.dp),
        color = SpiceSurfaceHigh,
        border = BorderStroke(1.dp, Color.White.copy(alpha = 0.1f)),
    ) {
        Text(label, modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp), fontSize = 13.sp)
    }
}

@Composable
private fun TrackSection(section: FeedSection, onTrackSelected: (Track) -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Text(
            section.title,
            modifier = Modifier.padding(horizontal = 18.dp),
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Bold,
        )
        LazyRow(
            contentPadding = PaddingValues(horizontal = 18.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            items(section.tracks, key = { section.title + it.id }) { track ->
                TrackCard(track, onTrackSelected)
            }
        }
    }
}

@Composable
private fun TrackCard(track: Track, onTrackSelected: (Track) -> Unit) {
    Column(
        modifier = Modifier.width(148.dp).clickable { onTrackSelected(track) },
        verticalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        Box {
            AsyncImage(
                model = track.artworkUrl,
                contentDescription = track.title,
                contentScale = ContentScale.Crop,
                modifier = Modifier.fillMaxWidth().aspectRatio(1f).clip(RoundedCornerShape(8.dp)),
            )
            Surface(
                shape = CircleShape,
                color = SpicePink,
                modifier = Modifier.align(Alignment.BottomEnd).padding(8.dp).size(36.dp),
            ) {
                Icon(Icons.Rounded.PlayArrow, null, modifier = Modifier.padding(8.dp), tint = Color.White)
            }
        }
        Text(track.title, maxLines = 1, overflow = TextOverflow.Ellipsis, fontWeight = FontWeight.SemiBold)
        Text(trackSubtitle(track), maxLines = 1, overflow = TextOverflow.Ellipsis, color = SpiceTextMuted, fontSize = 13.sp)
    }
}

@Composable
private fun SearchScreen(
    uiState: SpiceUiState,
    contentPadding: PaddingValues,
    onQueryChanged: (String) -> Unit,
    onSearch: (String) -> Unit,
    onTrackSelected: (Track) -> Unit,
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(
            start = 18.dp,
            end = 18.dp,
            top = contentPadding.calculateTopPadding() + 10.dp,
            bottom = contentPadding.calculateBottomPadding() + 20.dp,
        ),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        item {
            OutlinedTextField(
                value = uiState.searchQuery,
                onValueChange = onQueryChanged,
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                label = { Text("Search Spice Music") },
                leadingIcon = { Icon(Icons.Rounded.Search, null) },
                trailingIcon = {
                    IconButton(onClick = { onSearch(uiState.searchQuery) }, enabled = uiState.searchQuery.isNotBlank()) {
                        Icon(Icons.Rounded.Search, "Search")
                    }
                },
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                keyboardActions = KeyboardActions(onSearch = { onSearch(uiState.searchQuery) }),
                shape = RoundedCornerShape(8.dp),
            )
        }
        item {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                ProviderBadge("Hybrid")
                ProviderBadge("YouTube + SoundCloud")
            }
        }
        if (uiState.searchResults.isEmpty() && !uiState.searchLoading) {
            item {
                Text("Browse", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                Spacer(Modifier.height(8.dp))
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf("Pop Hits", "Hip-Hop", "Rock Charts", "Lofi Chill", "Electronic", "Jazz Beats")
                        .chunked(2)
                        .forEach { row ->
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                row.forEach { category ->
                                    Card(
                                        onClick = { onSearch(category) },
                                        modifier = Modifier.weight(1f),
                                        shape = RoundedCornerShape(8.dp),
                                        colors = CardDefaults.cardColors(containerColor = SpiceSurfaceHigh),
                                    ) {
                                        Text(category, modifier = Modifier.padding(18.dp), fontWeight = FontWeight.SemiBold)
                                    }
                                }
                                if (row.size == 1) Spacer(Modifier.weight(1f))
                            }
                        }
                }
            }
        }
        if (uiState.searchLoading) {
            item { Box(Modifier.fillMaxWidth().height(120.dp), contentAlignment = Alignment.Center) { CircularProgressIndicator() } }
        } else {
            items(uiState.searchResults, key = { it.id }) { track -> TrackRow(track, onTrackSelected) }
        }
    }
}

@Composable
private fun LibraryScreen(
    uiState: SpiceUiState,
    contentPadding: PaddingValues,
    onTabSelected: (LibraryTab) -> Unit,
    onTrackSelected: (Track) -> Unit,
) {
    Column(
        modifier = Modifier.fillMaxSize().padding(top = contentPadding.calculateTopPadding()),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 18.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text("Your Library", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
            FilledIconButton(onClick = {}) { Icon(Icons.Rounded.Add, "Create playlist") }
        }
        PrimaryTabRow(selectedTabIndex = uiState.libraryTab.ordinal, containerColor = SpiceBackground) {
            LibraryTab.entries.forEach { tab ->
                Tab(
                    selected = uiState.libraryTab == tab,
                    onClick = { onTabSelected(tab) },
                    text = { Text(tab.label) },
                )
            }
        }
        when (uiState.libraryTab) {
            LibraryTab.Playlists -> EmptyState("No playlists yet", "Playlist sync will use the Spice account API.", null)
            LibraryTab.Liked -> TrackList(uiState.likedTracks, contentPadding.calculateBottomPadding(), onTrackSelected, "No liked tracks")
            LibraryTab.History -> TrackList(uiState.historyTracks, contentPadding.calculateBottomPadding(), onTrackSelected, "No listening history")
        }
    }
}

@Composable
private fun TrackList(tracks: List<Track>, bottomPadding: androidx.compose.ui.unit.Dp, onTrackSelected: (Track) -> Unit, empty: String) {
    if (tracks.isEmpty()) {
        EmptyState(empty, "Play or like a track to add it here.", null)
    } else {
        LazyColumn(
            contentPadding = PaddingValues(18.dp, 12.dp, 18.dp, bottomPadding + 16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            items(tracks, key = { it.id }) { track -> TrackRow(track, onTrackSelected) }
        }
    }
}

@Composable
private fun TrackRow(track: Track, onTrackSelected: (Track) -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth().clickable { onTrackSelected(track) }.padding(vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        AsyncImage(
            model = track.artworkUrl,
            contentDescription = track.title,
            contentScale = ContentScale.Crop,
            modifier = Modifier.size(58.dp).clip(RoundedCornerShape(6.dp)),
        )
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text(track.title, maxLines = 1, overflow = TextOverflow.Ellipsis, fontWeight = FontWeight.SemiBold)
            Text(trackSubtitle(track), maxLines = 1, overflow = TextOverflow.Ellipsis, color = SpiceTextMuted, fontSize = 13.sp)
        }
        IconButton(onClick = { onTrackSelected(track) }) { Icon(Icons.Rounded.PlayArrow, "Play ${track.title}") }
    }
}

@Composable
private fun SettingsScreen(
    uiState: SpiceUiState,
    contentPadding: PaddingValues,
    onQualitySelected: (StreamQuality) -> Unit,
    onTestEngine: () -> Unit,
) {
    LazyColumn(
        contentPadding = PaddingValues(
            start = 18.dp,
            end = 18.dp,
            top = contentPadding.calculateTopPadding() + 12.dp,
            bottom = contentPadding.calculateBottomPadding() + 20.dp,
        ),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {
            Text("Audio quality", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            Text("Applied when the Spice backend returns multiple direct streams.", color = SpiceTextMuted)
        }
        items(StreamQuality.entries) { quality ->
            Row(
                modifier = Modifier.fillMaxWidth().clickable { onQualitySelected(quality) }.padding(vertical = 6.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                RadioButton(selected = uiState.quality == quality, onClick = { onQualitySelected(quality) })
                Text(quality.label, modifier = Modifier.padding(start = 8.dp))
            }
        }
        item { HorizontalDivider() }
        item {
            Text("Playback transport", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(8.dp))
            StatusRow("Native engine", "Media3 / ExoPlayer", SpiceCyan)
            StatusRow("Spice search API", "Connected at runtime", SpiceCyan)
            StatusRow("Direct stream API", "Required for playback", SpicePink)
            Text(
                "YouTube iframe fallback is intentionally excluded because it cannot provide reliable Android background playback.",
                color = SpiceTextMuted,
                modifier = Modifier.padding(top = 10.dp),
            )
        }
        if (BuildConfig.DEBUG) {
            item {
                Button(onClick = onTestEngine, modifier = Modifier.fillMaxWidth()) {
                    Icon(Icons.Rounded.PlayArrow, null)
                    Text("Test native audio", modifier = Modifier.padding(start = 8.dp))
                }
                Text(
                    "Plays a bundled 30-second test tone through Media3 so notification and background controls can be verified without the stream API.",
                    color = SpiceTextMuted,
                    modifier = Modifier.padding(top = 8.dp),
                )
            }
        }
        item { HorizontalDivider() }
        item {
            Text("Coming next", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            Text("Spice account login, cloud playlists, lyrics, scrobbling, and Spice Connect device discovery.", color = SpiceTextMuted)
        }
    }
}

@Composable
private fun StatusRow(label: String, value: String, color: Color) {
    Row(Modifier.fillMaxWidth().padding(vertical = 7.dp), verticalAlignment = Alignment.CenterVertically) {
        Surface(shape = CircleShape, color = color, modifier = Modifier.size(8.dp)) {}
        Text(label, modifier = Modifier.padding(start = 10.dp).weight(1f), fontWeight = FontWeight.SemiBold)
        Text(value, color = SpiceTextMuted, fontSize = 13.sp)
    }
}

@Composable
private fun MiniPlayer(track: Track, player: PlayerUiState, resolving: Boolean, onOpen: () -> Unit, onToggle: () -> Unit) {
    Surface(
        modifier = Modifier.fillMaxWidth().clickable(onClick = onOpen),
        color = SpiceSurfaceHigh,
        border = BorderStroke(1.dp, Color.White.copy(alpha = 0.08f)),
    ) {
        Row(Modifier.padding(10.dp), verticalAlignment = Alignment.CenterVertically) {
            AsyncImage(
                model = track.artworkUrl,
                contentDescription = track.title,
                contentScale = ContentScale.Crop,
                modifier = Modifier.size(48.dp).clip(RoundedCornerShape(6.dp)),
            )
            Spacer(Modifier.width(10.dp))
            Column(Modifier.weight(1f)) {
                Text(track.title, maxLines = 1, overflow = TextOverflow.Ellipsis, fontWeight = FontWeight.SemiBold)
                Text(
                    if (resolving) "Resolving native stream..." else track.artist,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    color = SpiceTextMuted,
                    fontSize = 12.sp,
                )
            }
            if (resolving || player.isBuffering) {
                CircularProgressIndicator(modifier = Modifier.size(30.dp), strokeWidth = 3.dp)
            } else {
                FilledIconButton(onClick = onToggle) {
                    Icon(if (player.isPlaying) Icons.Rounded.Pause else Icons.Rounded.PlayArrow, "Play or pause")
                }
            }
        }
    }
}

@Composable
private fun SpiceNavigation(selected: AppScreen, onSelected: (AppScreen) -> Unit) {
    NavigationBar(containerColor = SpiceBackground) {
        AppScreen.entries.forEach { screen ->
            val icon = when (screen) {
                AppScreen.Home -> Icons.Rounded.Home
                AppScreen.Search -> Icons.Rounded.Search
                AppScreen.Library -> Icons.Rounded.LibraryMusic
                AppScreen.Settings -> Icons.Rounded.Settings
            }
            NavigationBarItem(
                selected = selected == screen,
                onClick = { onSelected(screen) },
                icon = { Icon(icon, screen.label) },
                label = { Text(screen.label) },
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun FullPlayer(
    track: Track,
    player: PlayerUiState,
    liked: Boolean,
    onDismiss: () -> Unit,
    onToggle: () -> Unit,
    onSeekTo: (Long) -> Unit,
    onSeekBy: (Long) -> Unit,
    onStop: () -> Unit,
    onLike: () -> Unit,
) {
    ModalBottomSheet(onDismissRequest = onDismiss, containerColor = SpiceSurface) {
        Column(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 24.dp).padding(bottom = 28.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            AsyncImage(
                model = track.artworkUrl,
                contentDescription = track.title,
                contentScale = ContentScale.Crop,
                modifier = Modifier.fillMaxWidth().aspectRatio(1f).clip(RoundedCornerShape(8.dp)),
            )
            Spacer(Modifier.height(20.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text(track.title, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, maxLines = 2)
                    Text(track.artist, color = SpiceTextMuted)
                }
                IconButton(onClick = onLike) {
                    Icon(if (liked) Icons.Rounded.Favorite else Icons.Rounded.FavoriteBorder, "Like", tint = if (liked) SpicePink else Color.White)
                }
            }
            Slider(
                value = player.positionMs.coerceAtMost(player.durationMs).toFloat(),
                onValueChange = { onSeekTo(it.toLong()) },
                valueRange = 0f..player.durationMs.coerceAtLeast(1).toFloat(),
                modifier = Modifier.fillMaxWidth(),
            )
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text(formatTime(player.positionMs), color = SpiceTextMuted, fontSize = 12.sp)
                Text(formatTime(player.durationMs), color = SpiceTextMuted, fontSize = 12.sp)
            }
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(18.dp)) {
                IconButton(onClick = { onSeekBy(-10_000) }) { Icon(Icons.Rounded.Replay10, "Back 10 seconds") }
                FilledIconButton(onClick = onToggle, modifier = Modifier.size(64.dp)) {
                    Icon(if (player.isPlaying) Icons.Rounded.Pause else Icons.Rounded.PlayArrow, "Play or pause", modifier = Modifier.size(34.dp))
                }
                IconButton(onClick = { onSeekBy(10_000) }) { Icon(Icons.Rounded.Forward10, "Forward 10 seconds") }
            }
            TextButton(onClick = { onStop(); onDismiss() }) {
                Icon(Icons.Rounded.Stop, null)
                Text("Stop", modifier = Modifier.padding(start = 6.dp))
            }
        }
    }
}

@Composable
private fun EmptyState(title: String, body: String, onAction: (() -> Unit)?) {
    Column(
        modifier = Modifier.fillMaxWidth().padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Icon(if (onAction == null) Icons.Rounded.Album else Icons.Rounded.ErrorOutline, null, modifier = Modifier.size(44.dp), tint = SpiceTextMuted)
        Text(title, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleMedium)
        Text(body, color = SpiceTextMuted)
        if (onAction != null) {
            TextButton(onClick = onAction) {
                Icon(Icons.Rounded.Refresh, null)
                Text("Retry", modifier = Modifier.padding(start = 6.dp))
            }
        }
    }
}

private fun formatTime(milliseconds: Long): String {
    val totalSeconds = milliseconds.coerceAtLeast(0) / 1000
    return "%d:%02d".format(totalSeconds / 60, totalSeconds % 60)
}

private fun trackSubtitle(track: Track): String {
    val source = if (track.sourceId.startsWith("soundcloud")) "SoundCloud" else "YouTube"
    return track.artist + " - " + source
}
