'use client';

/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/exhaustive-deps */

import { type FormEvent, useEffect, useRef, useState, useCallback } from 'react';

// ── Icons ──────────────────────────────────────────────────────────
const Icons = {
  play: (
    <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
      <path d="M8 5v14l11-7z" />
    </svg>
  ),
  pause: (
    <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
    </svg>
  ),
  prev: (
    <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
      <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
    </svg>
  ),
  next: (
    <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
      <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
    </svg>
  ),
  heart: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  ),
  heartFilled: (
    <svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1" width="16" height="16">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  ),
  home: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  search: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  library: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  ),
  account: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  chevronLeft: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  ),
  chevronRight: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  ),
  volume: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    </svg>
  ),
  playlist: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width="18" height="18">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  ),
  list: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width="18" height="18">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <circle cx="4" cy="6" r="1" fill="currentColor" />
      <circle cx="4" cy="12" r="1" fill="currentColor" />
      <circle cx="4" cy="18" r="1" fill="currentColor" />
    </svg>
  ),
  grid: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </svg>
  ),
  trash: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  ),
  clock: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  back: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  ),
  lock: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ),
  unlock: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 9.9-1" />
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
};

// ── Types ──────────────────────────────────────────────────────────
interface Artist {
  id: string;
  name: string;
  artworkUrl?: string;
}

interface Album {
  id: string;
  title: string;
  artists: Artist[];
  artworkUrl?: string;
  year?: number;
}

interface Track {
  id: string;
  title: string;
  artists: Artist[];
  album?: Album;
  durationMs?: number;
  artworkUrl?: string;
}

interface Playlist {
  id: string;
  title: string;
  description?: string;
  tracks: Track[];
  gradient: string;
  createdAt: string;
}

interface UserProfile {
  id: string;
  displayName: string;
  bio: string;
  gradient: string;
  songsPlayed: number;
  joinedAt: string;
  passcode?: string; // 4 digit passcode
  likedTracks: string[];
  likedTrackDetails: Record<string, Track>;
  customPlaylists: Playlist[];
  history: Track[];
}

const PRESET_GRADIENTS = [
  'linear-gradient(135deg, #a855f7, #ec4899)',
  'linear-gradient(135deg, #f97316, #ef4444)',
  'linear-gradient(135deg, #06b6d4, #3b82f6)',
  'linear-gradient(135deg, #10b981, #059669)',
  'linear-gradient(135deg, #f59e0b, #d97706)',
  'linear-gradient(135deg, #6366f1, #4f46e5)',
];

const genres = [
  { name: 'Pop Hits', gradient: 'linear-gradient(135deg, #ec4899, #f43f5e)', emoji: '🎤' },
  { name: 'Hip-Hop', gradient: 'linear-gradient(135deg, #f97316, #ef4444)', emoji: '🎧' },
  { name: 'Rock Charts', gradient: 'linear-gradient(135deg, #64748b, #334155)', emoji: '🎸' },
  { name: 'Lofi Chill', gradient: 'linear-gradient(135deg, #8b5cf6, #06b6d4)', emoji: '☕' },
  { name: 'Electronic', gradient: 'linear-gradient(135deg, #d97706, #b45309)', emoji: '🎹' },
  { name: 'Jazz Beats', gradient: 'linear-gradient(135deg, #059669, #0d9488)', emoji: '🎺' },
];

const formatTime = (seconds: number) => {
  if (isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const initialDefaultProfile: UserProfile = {
  id: 'default',
  displayName: 'Spice Listener',
  bio: 'Chasing the craziest tunes.',
  gradient: PRESET_GRADIENTS[0],
  songsPlayed: 0,
  joinedAt: new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long' }),
  likedTracks: [],
  likedTrackDetails: {},
  customPlaylists: [],
  history: []
};

export default function SpiceApp() {
  const [currentPage, setCurrentPage] = useState<'home' | 'search' | 'library' | 'account' | 'settings'>('home');
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);

  // Settings Configuration states
  const [accentTheme, setAccentTheme] = useState<'pink' | 'blue' | 'orange' | 'green' | 'gold'>('pink');
  const [audioQuality, setAudioQuality] = useState<'standard' | 'high' | 'low'>('standard');
  const [streamProtocol, setStreamProtocol] = useState<'proxy' | 'web' | 'embed'>('proxy');
  const [showQueueDrawer, setShowQueueDrawer] = useState(false);

  // ── Multi-Profile Accounts Setup ──────────────────────────────────
  const [profiles, setProfiles] = useState<UserProfile[]>([initialDefaultProfile]);
  const [activeProfileId, setActiveProfileId] = useState<string>('default');

  const activeProfile = profiles.find(p => p.id === activeProfileId) || profiles[0] || initialDefaultProfile;

  // Security Locking
  const [isLocked, setIsLocked] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const activeId = localStorage.getItem('spice_active_profile_id') || 'default';
      const saved = localStorage.getItem('spice_profiles_list');
      if (saved) {
        try {
          const list: UserProfile[] = JSON.parse(saved);
          const found = list.find(p => p.id === activeId);
          return !!found?.passcode;
        } catch (e) {
          console.error(e);
        }
      }
    }
    return false;
  });
  const [passcodeInput, setPasscodeInput] = useState<string>('');
  const [passcodeError, setPasscodeError] = useState<string | null>(null);

  // Profile management dialogs
  const [showCreateProfileDialog, setShowCreateProfileDialog] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfileBio, setNewProfileBio] = useState('');
  const [newProfileGradient, setNewProfileGradient] = useState(PRESET_GRADIENTS[0]);
  const [newProfilePasscode, setNewProfilePasscode] = useState('');

  // ── Music Core State (Decoupled & Bound to Active Profile) ────────
  const [currentTrack, setCurrentTrack] = useState<Track>({
    id: 'Starboy',
    title: 'Starboy',
    artists: [{ id: 'The Weeknd', name: 'The Weeknd' }],
    artworkUrl: 'https://lh3.googleusercontent.com/e44T8B4s4HwT1kX5j1Y0qN_fRj5fLwVvDkO04EwU8T2v9K51hVd6qO9yPZ5zPZ5v=w120-h120'
  });
  
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingStream, setIsLoadingStream] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(70);

  // States synchronized to the Active Profile
  const [likedTracks, setLikedTracks] = useState<Set<string>>(new Set(activeProfile.likedTracks));
  const [likedTrackDetails, setLikedTrackDetails] = useState<Record<string, Track>>(activeProfile.likedTrackDetails || {});
  const [customPlaylists, setCustomPlaylists] = useState<Playlist[]>(activeProfile.customPlaylists || []);
  const [history, setHistory] = useState<Track[]>(activeProfile.history || []);
  const [queue, setQueue] = useState<Track[]>([currentTrack]);
  const [queueIndex, setQueueIndex] = useState(0);

  const [libraryView, setLibraryView] = useState<'list' | 'grid'>('list');
  const [libraryFilter, setLibraryFilter] = useState<'playlists' | 'liked' | 'history'>('playlists');

  // Sync profile details when changing profile
  const [editName, setEditName] = useState(activeProfile.displayName);
  const [editBio, setEditBio] = useState(activeProfile.bio);
  const [editGradient, setEditGradient] = useState(activeProfile.gradient);
  const [editPasscode, setEditPasscode] = useState(activeProfile.passcode || '');
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  // Transfer Tool states
  const [ytPlaylistLink, setYtPlaylistLink] = useState('');
  const [isImportingPlaylist, setIsImportingPlaylist] = useState(false);
  const [playlistImportError, setPlaylistImportError] = useState<string | null>(null);
  const [playlistImportSuccess, setPlaylistImportSuccess] = useState<string | null>(null);
  
  const [jsonImportText, setJsonImportText] = useState('');
  const [_jsonBackupStatus, setJsonBackupStatus] = useState<'success' | 'error' | null>(null);

  // Dialog & Form states for Playlists
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newPlTitle, setNewPlTitle] = useState('');
  const [newPlDesc, setNewPlDesc] = useState('');

  // Cloud Sync & Accounts state
  const [cloudToken, setCloudToken] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('spice_cloud_token');
    }
    return null;
  });
  const [cloudUser, setCloudUser] = useState<{ id: string; email: string } | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('spice_cloud_user');
      if (saved) {
        try { return JSON.parse(saved); } catch { return null; }
      }
    }
    return null;
  });
  const [syncingStatus, setSyncingStatus] = useState<'idle' | 'syncing' | 'success' | 'error' | null>(null);
  const [dbError, setDbError] = useState<string | null>(null);
  const [isLocalDbFallback, setIsLocalDbFallback] = useState<boolean>(false);
  const [playerPlacement, setPlayerPlacement] = useState<'bottom' | 'top'>('bottom');
  const [playerViewMode, setPlayerViewMode] = useState<'bar' | 'expanded' | 'mini'>('bar');
  const [miniPlayerPos, setMiniPlayerPos] = useState<{ x: number; y: number } | null>(null);
  const [isDraggingMini, setIsDraggingMini] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isShuffle, setIsShuffle] = useState<boolean>(false);
  const [repeatMode, setRepeatMode] = useState<'none' | 'all' | 'one'>('all');
  const [expandedTab, setExpandedTab] = useState<'controls' | 'queue' | 'lyrics'>('controls');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  // Dynamic Home Page Queries
  const [homeTrending, setHomeTrending] = useState<Track[]>([]);
  const [homeChill, setHomeChill] = useState<Track[]>([]);
  const [homeEnergy, setHomeEnergy] = useState<Track[]>([]);
  const [homeListenAgain, setHomeListenAgain] = useState<Track[]>([]);
  const [isLoadingHome, setIsLoadingHome] = useState(true);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string>();

  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [selfTestRunning, setSelfTestRunning] = useState(false);
  const [selfTestResults, setSelfTestResults] = useState<{
    api: 'passed' | 'failed' | null;
    db: 'passed' | 'failed' | 'disabled' | null;
    latency: number | null;
  }>({ api: null, db: null, latency: null });
  const [terminalFilter, setTerminalFilter] = useState('');
  const [terminalAutoScroll, setTerminalAutoScroll] = useState(true);
  const [logsCopied, setLogsCopied] = useState(false);
  const terminalEndRef = useRef<HTMLDivElement | null>(null);

  const logDebug = useCallback((category: string, message: string) => {
    const time = new Date().toLocaleTimeString();
    setDebugLogs(prev => [...prev.slice(-99), `[${time}] [${category.toUpperCase()}] ${message}`]);
  }, []);

  useEffect(() => {
    if (terminalAutoScroll && terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [debugLogs, terminalAutoScroll]);

  const runSelfTest = async () => {
    setSelfTestRunning(true);
    logDebug('diagnostics', 'Starting full-system diagnostics self-test...');
    
    let apiStatus: 'passed' | 'failed' = 'failed';
    let dbStatus: 'passed' | 'failed' | 'disabled' = 'disabled';
    const startTime = Date.now();
    
    try {
      logDebug('diagnostics', 'Pinging YouTube InnerTube search endpoint...');
      const apiPing = await fetch(`/api/yt/search?q=Top%20Hits&limit=1`);
      if (apiPing.ok) {
        apiStatus = 'passed';
        logDebug('diagnostics', 'InnerTube API ping successful!');
      } else {
        logDebug('diagnostics', `InnerTube API ping failed with status ${apiPing.status}`);
      }
    } catch (err) {
      logDebug('diagnostics', 'InnerTube API ping failed to connect.');
    }
    
    try {
      logDebug('diagnostics', 'Pinging server database sync endpoint...');
      const headers: HeadersInit = {};
      if (cloudToken) {
        headers['Authorization'] = `Bearer ${cloudToken}`;
      }
      const dbPing = await fetch(`/api/sync/likes`, { headers });
      if (dbPing.status === 501) {
        dbStatus = 'disabled';
        logDebug('diagnostics', 'Cloud database bypassed: server is running in offline LocalStorage mode.');
      } else if (dbPing.status === 401) {
        dbStatus = 'passed';
        logDebug('diagnostics', 'Neon Cloud Database endpoint reachable (authentication required).');
      } else if (dbPing.ok) {
        dbStatus = 'passed';
        logDebug('diagnostics', 'Neon Cloud Database connection healthy and authenticated!');
      } else {
        dbStatus = 'failed';
        logDebug('diagnostics', `Cloud Database sync ping failed with status ${dbPing.status}`);
      }
    } catch (err) {
      logDebug('diagnostics', 'Cloud Database connection failed.');
    }
    
    const latency = Date.now() - startTime;
    setSelfTestResults({ api: apiStatus, db: dbStatus, latency });
    setSelfTestRunning(false);
    logDebug('diagnostics', `Self-test completed in ${latency}ms. Status: API=${apiStatus}, DB=${dbStatus}`);
  };

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ytPlayerRef = useRef<any>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ── Sync Active Profile back to Profiles DB Helper ──────────────
  const updateActiveProfileData = (updates: Partial<UserProfile>) => {
    setProfiles(prev => {
      const updated = prev.map(p => {
        if (p.id === activeProfileId) {
          return { ...p, ...updates };
        }
        return p;
      });
      localStorage.setItem('spice_profiles_list', JSON.stringify(updated));
      return updated;
    });
  };

  const [isMounted, setIsMounted] = useState(false);

  // Load localStorage states safely on client mount to prevent SSR hydration mismatch
  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('spice_accent_theme');
      if (savedTheme) setAccentTheme(savedTheme as any);

      const savedQuality = localStorage.getItem('spice_audio_quality');
      if (savedQuality) setAudioQuality(savedQuality as any);

      const savedProtocol = localStorage.getItem('spice_stream_protocol');
      if (savedProtocol) setStreamProtocol(savedProtocol as any);

      const savedLocalDb = localStorage.getItem('spice_local_db_fallback');
      if (savedLocalDb) setIsLocalDbFallback(savedLocalDb === 'true');

      const savedPlacement = localStorage.getItem('spice_player_placement');
      if (savedPlacement) setPlayerPlacement(savedPlacement as any);

      const savedViewMode = localStorage.getItem('spice_player_view_mode');
      if (savedViewMode) setPlayerViewMode(savedViewMode as any);

      const savedShuffle = localStorage.getItem('spice_is_shuffle');
      if (savedShuffle) setIsShuffle(savedShuffle === 'true');

      const savedRepeat = localStorage.getItem('spice_repeat_mode');
      if (savedRepeat) setRepeatMode(savedRepeat as any);

      const savedProfiles = localStorage.getItem('spice_profiles_list');
      const savedActiveId = localStorage.getItem('spice_active_profile_id') || 'default';
      
      let parsedProfiles = [initialDefaultProfile];
      if (savedProfiles) {
        try {
          const list = JSON.parse(savedProfiles);
          if (list.length > 0) {
            parsedProfiles = list;
            setProfiles(list);
          }
        } catch (e) {
          console.error(e);
        }
      }

      const activeProf = parsedProfiles.find(p => p.id === savedActiveId) || parsedProfiles[0];
      if (activeProf) {
        setActiveProfileId(activeProf.id);
        setLikedTracks(new Set(activeProf.likedTracks));
        setLikedTrackDetails(activeProf.likedTrackDetails || {});
        setCustomPlaylists(activeProf.customPlaylists || []);
        setHistory(activeProf.history || []);
        setEditName(activeProf.displayName);
        setEditBio(activeProf.bio);
        setEditGradient(activeProf.gradient);
        setEditPasscode(activeProf.passcode || '');

        if (activeProf.history && activeProf.history.length > 0) {
          setCurrentTrack(activeProf.history[0]);
          setQueue([activeProf.history[0]]);
        }
        logDebug('system', `Loaded active profile "${activeProf.displayName}" successfully. Hydration secured.`);
      }
    }
  }, []);

  // ── YouTube Embedded Player Fallback API Integration ──────────────
  const initializeYtPlayer = useCallback(() => {
    if (typeof window === 'undefined' || ytPlayerRef.current) return;
    try {
      ytPlayerRef.current = new (window as any).YT.Player('spice-yt-iframe-container', {
        height: '1',
        width: '1',
        videoId: 'Starboy',
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          rel: 0,
          showinfo: 0,
          iv_load_policy: 3
        },
        events: {
          onReady: (event: any) => {
            logDebug('system', 'YouTube Iframe Embed Player initialized successfully.');
            event.target.setVolume(volume);
          },
          onStateChange: (event: any) => {
            const state = event.data;
            if (state === 1) { // Playing
              setIsPlaying(true);
              setIsLoadingStream(false);
            } else if (state === 2) { // Paused
              setIsPlaying(false);
            } else if (state === 0) { // Ended
              handleAudioEnded();
            }
          },
          onError: (event: any) => {
            logDebug('error', `YouTube Embed Player error: code ${event.data}`);
          }
        }
      });
    } catch (e) {
      console.error('Error initializing YouTube player:', e);
    }
  }, [volume, logDebug]);

  // Load YouTube Iframe API on client mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    if (!document.getElementById('youtube-iframe-api-script')) {
      const tag = document.createElement('script');
      tag.id = 'youtube-iframe-api-script';
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }

    (window as any).onYouTubeIframeAPIReady = () => {
      initializeYtPlayer();
    };

    if ((window as any).YT && (window as any).YT.Player) {
      initializeYtPlayer();
    }
  }, [initializeYtPlayer]);

  // Track progress updates for Embed mode via standard interval
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && streamProtocol === 'embed' && ytPlayerRef.current && typeof ytPlayerRef.current.getCurrentTime === 'function') {
      interval = setInterval(() => {
        try {
          const currentTime = ytPlayerRef.current.getCurrentTime();
          const durationTime = ytPlayerRef.current.getDuration();
          setProgress(currentTime);
          if (durationTime > 0) {
            setDuration(durationTime);
          }
        } catch (e) {}
      }, 500);
    }
    return () => clearInterval(interval);
  }, [isPlaying, streamProtocol]);

  // Sync volume with Embed Player
  useEffect(() => {
    if (streamProtocol === 'embed' && ytPlayerRef.current && typeof ytPlayerRef.current.setVolume === 'function') {
      ytPlayerRef.current.setVolume(volume);
    }
  }, [volume, streamProtocol]);

  // Fetch dynamic content on mount
  useEffect(() => {
    async function loadHomeContent() {
      setIsLoadingHome(true);
      try {
        const trendRes = await fetch(`/api/yt/search?q=${encodeURIComponent('Top Hits 2026')}&limit=8`);
        const chillRes = await fetch(`/api/yt/search?q=${encodeURIComponent('Chill Study Lofi Beats')}&limit=8`);
        const energyRes = await fetch(`/api/yt/search?q=${encodeURIComponent('Workout Gym Power')}&limit=8`);

        const trendData = trendRes.ok ? await trendRes.json() : { tracks: [] };
        const chillData = chillRes.ok ? await chillRes.json() : { tracks: [] };
        const energyData = energyRes.ok ? await energyRes.json() : { tracks: [] };

        if (trendData.tracks?.length > 0) {
          setHomeTrending(trendData.tracks);
          // Set trending pick as default if queue only contains placeholder Starboy
          const firstTrack = trendData.tracks[0];
          setQueue(prevQueue => {
            if (prevQueue.length === 1 && prevQueue[0].id === 'Starboy') {
              return [firstTrack];
            }
            return prevQueue;
          });
          setCurrentTrack(prevTrack => {
            if (prevTrack.id === 'Starboy') {
              return firstTrack;
            }
            return prevTrack;
          });
        }
        if (chillData.tracks?.length > 0) setHomeChill(chillData.tracks);
        if (energyData.tracks?.length > 0) setHomeEnergy(energyData.tracks);

      } catch (err) {
        console.error('Failed to load dynamic home feeds:', err);
      } finally {
        setIsLoadingHome(false);
      }
    }

    loadHomeContent();

    // Register Service Worker
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => console.log('Spice Service Worker registered:', reg.scope))
        .catch((err) => console.error('Spice SW registration failed:', err));
    }
  }, []);

  // Sync volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
    }
  }, [volume]);

  // Audio Handlers
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setProgress(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  // ── Cloud Accounts Synchronization & Authentication ──────────────
  const syncWithCloud = async (token: string | null = cloudToken) => {
    if (!token) return;
    setSyncingStatus('syncing');
    setDbError(null);
    logDebug('database', 'Initiating full sync merge with Cloud Neon Database...');
    try {
      // 1. Pull likes
      const likesRes = await fetch('/api/sync/likes', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const likesData = await likesRes.json();
      const serverLikes = likesData.likedTracks ?? [];

      if (likesData.localFallback) {
        setIsLocalDbFallback(true);
        localStorage.setItem('spice_local_db_fallback', 'true');
      } else {
        setIsLocalDbFallback(false);
        localStorage.setItem('spice_local_db_fallback', 'false');
      }
      
      // 2. Pull history
      const histRes = await fetch('/api/sync/history', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const histData = await histRes.json();
      const serverHistory = histData.history ?? [];

      // 3. Pull playlists
      const plRes = await fetch('/api/sync/playlists', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const plData = await plRes.json();
      const serverPlaylists = plData.playlists ?? [];

      // Merge Likes
      const mergedLikes = new Set([...likedTracks, ...serverLikes]);
      const mergedLikesArray = Array.from(mergedLikes);

      // Merge History (deduplicated by track id, limit 50)
      const mergedHistoryMap = new Map<string, Track>();
      [...serverHistory, ...history].forEach(track => {
        mergedHistoryMap.set(track.id, track);
      });
      const mergedHistory = Array.from(mergedHistoryMap.values()).slice(0, 50);

      // Merge Playlists
      const mergedPlaylists = [...customPlaylists];
      serverPlaylists.forEach((serverPl: any) => {
        const existing = mergedPlaylists.find(pl => pl.title === serverPl.title);
        if (!existing) {
          mergedPlaylists.push({
            id: serverPl.id,
            title: serverPl.title,
            description: serverPl.description || '',
            gradient: serverPl.gradient || PRESET_GRADIENTS[0],
            createdAt: serverPl.createdAt || new Date().toLocaleDateString(),
            tracks: serverPl.tracks || []
          });
        } else {
          const trackIds = new Set(existing.tracks.map((t: any) => t.id));
          serverPl.tracks.forEach((t: any) => {
            if (!trackIds.has(t.id)) {
              existing.tracks.push(t);
            }
          });
        }
      });

      // Update Local State
      setLikedTracks(mergedLikes);
      setHistory(mergedHistory);
      setCustomPlaylists(mergedPlaylists);

      updateActiveProfileData({
        likedTracks: mergedLikesArray,
        history: mergedHistory,
        customPlaylists: mergedPlaylists
      });

      // 4. Push Merged State to Cloud Database
      await fetch('/api/sync/likes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ likedTracks: mergedLikesArray })
      });

      await fetch('/api/sync/history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ history: mergedHistory })
      });

      await fetch('/api/sync/playlists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ playlists: mergedPlaylists })
      });

      logDebug('database', `Merged state with cloud database successfully. Merged: ${mergedLikesArray.length} likes, ${mergedHistory.length} history items, ${mergedPlaylists.length} playlists.`);
      setSyncingStatus('success');
      setTimeout(() => setSyncingStatus(null), 3000);
    } catch (err: any) {
      console.error('Cloud synchronization error:', err);
      logDebug('error', `Cloud synchronization failed: ${err.message || err}`);
      if (err.message === 'db_not_configured') {
        setDbError('DATABASE_URL is not set in backend environment.');
      }
      setSyncingStatus('error');
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);
    setDbError(null);

    const url = authMode === 'login' ? '/api/auth/spice/signin' : '/api/auth/spice/signup';
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: authEmail, password: authPassword })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Authentication failed.');
      }

      if (data.localFallback) {
        setIsLocalDbFallback(true);
        localStorage.setItem('spice_local_db_fallback', 'true');
      } else {
        setIsLocalDbFallback(false);
        localStorage.setItem('spice_local_db_fallback', 'false');
      }

      localStorage.setItem('spice_cloud_token', data.token);
      localStorage.setItem('spice_cloud_user', JSON.stringify(data.user));
      setCloudToken(data.token);
      setCloudUser(data.user);
      setAuthEmail('');
      setAuthPassword('');
      logDebug('auth', `User "${data.user.email}" authenticated successfully via ${authMode}. Token generated.`);
      
      // Auto sync after login
      await syncWithCloud(data.token);
    } catch (err: any) {
      console.error(err);
      logDebug('error', `Authentication attempt failed: ${err.message || err}`);
      setAuthError(err.message || 'Server authentication failed.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('spice_cloud_token');
    localStorage.removeItem('spice_cloud_user');
    setCloudToken(null);
    setCloudUser(null);
    setDbError(null);
    setAuthError(null);
    logDebug('auth', 'Logged out from Spice Cloud Account. Switched to offline database sandbox mode.');
  };

  // ── Listen Again Calculation Hook ──────────────────────────────
  useEffect(() => {
    if (history && history.length > 0) {
      const uniqueHistoryTracks: Track[] = [];
      const ids = new Set<string>();
      history.forEach(t => {
        if (!ids.has(t.id)) {
          ids.add(t.id);
          uniqueHistoryTracks.push(t);
        }
      });

      if (uniqueHistoryTracks.length < 5 && homeTrending.length > 0) {
        const combined = [...uniqueHistoryTracks];
        homeTrending.forEach(t => {
          if (!ids.has(t.id) && combined.length < 8) {
            combined.push(t);
          }
        });
        setHomeListenAgain(combined);
      } else {
        setHomeListenAgain(uniqueHistoryTracks.slice(0, 8));
      }
    } else {
      if (homeTrending.length > 0) {
        setHomeListenAgain(homeTrending.slice(0, 8));
      }
    }
  }, [history, homeTrending]);

  // Sync on load or profile switch
  useEffect(() => {
    if (cloudToken) {
      syncWithCloud(cloudToken);
    }
  }, [cloudToken, activeProfileId]);

  const handleAudioEnded = () => {
    // Increment songs played on completion
    const updatedSongsCount = activeProfile.songsPlayed + 1;
    updateActiveProfileData({ songsPlayed: updatedSongsCount });
    
    if (repeatMode === 'one') {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(handleAudioError);
        setProgress(0);
        setIsPlaying(true);
      }
    } else if (repeatMode === 'none' && queueIndex === queue.length - 1) {
      setIsPlaying(false);
      setProgress(0);
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
      }
    } else {
      handleNext();
    }
  };

  const handleAudioError = () => {
    setIsPlaying(false);
    setIsLoadingStream(false);
    setError('Failed to play stream. Upstream YouTube Music connection reset.');
  };

  // Play a track
  const playTrack = async (track: Track, newQueue?: Track[]) => {
    setError(undefined);
    setIsPlaying(false);
    setStreamUrl(null);
    setCurrentTrack(track);
    setIsLoadingStream(true);

    let updatedQueue = [...queue];
    let updatedIndex = queueIndex;

    if (newQueue && newQueue.length > 0) {
      updatedQueue = newQueue;
      const idx = newQueue.findIndex(t => t.id === track.id);
      updatedIndex = idx >= 0 ? idx : 0;
    } else {
      if (!queue.some(t => t.id === track.id)) {
        updatedQueue = [...queue];
        updatedQueue.splice(queueIndex + 1, 0, track);
        updatedIndex = queueIndex + 1;
      } else {
        const idx = queue.findIndex(t => t.id === track.id);
        updatedIndex = idx >= 0 ? idx : 0;
      }
    }

    setQueue(updatedQueue);
    setQueueIndex(updatedIndex);

    try {
      logDebug('player', `Initiating format resolution for track "${track.title}" (ID: ${track.id})`);
      
      if (streamProtocol === 'embed') {
        logDebug('stream', `YouTube Embedded Player active. Loading iframe player for track ID: ${track.id}`);
        setStreamUrl('youtube-embed-active');
        setIsLoadingStream(false);
        setIsPlaying(true);

        const filteredHist = history.filter(t => t.id !== track.id);
        const newHist = [track, ...filteredHist].slice(0, 50);
        setHistory(newHist);
        updateActiveProfileData({
          history: newHist,
          songsPlayed: activeProfile.songsPlayed + 1
        });

        if (ytPlayerRef.current && typeof ytPlayerRef.current.loadVideoById === 'function') {
          ytPlayerRef.current.loadVideoById(track.id);
          ytPlayerRef.current.playVideo();
        }
        return;
      }

      // Direct stream URL fetch from YouTube endpoint
      const resTrack = await fetch(`/api/yt/track/${encodeURIComponent(track.id)}`);
      if (!resTrack.ok) throw new Error('Could not resolve audio streams for this track.');
      
      const payload = await resTrack.json();
      const streams = payload.streams ?? [];
      if (streams.length === 0) throw new Error('No compatible stream format discovered.');

      const bestStream = streams[0];
      logDebug('stream', `Resolved ${streams.length} formats. Selected itag ${bestStream.itag} (${bestStream.container}, bitrate: ${Math.round(bestStream.bitrate / 1000)}kbps)`);
      setStreamUrl(bestStream.url);
      setIsPlaying(true);

      // Track playback in history
      const filteredHist = history.filter(t => t.id !== track.id);
      const newHist = [track, ...filteredHist].slice(0, 50);
      setHistory(newHist);

      // Sync history & stats increments to active profile
      updateActiveProfileData({
        history: newHist,
        songsPlayed: activeProfile.songsPlayed + 1
      });

    } catch (err: any) {
      console.error(err);
      logDebug('error', `Track streaming failed: ${err.message || err}`);
      setError(err.message ?? 'Playback connection failed.');
    } finally {
      setIsLoadingStream(false);
    }
  };

  const togglePlayPause = () => {
    if (!streamUrl && !isLoadingStream) {
      playTrack(currentTrack);
      return;
    }
    if (streamProtocol === 'embed' && ytPlayerRef.current) {
      if (isPlaying) {
        ytPlayerRef.current.pauseVideo();
        setIsPlaying(false);
      } else {
        ytPlayerRef.current.playVideo();
        setIsPlaying(true);
      }
      return;
    }
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play().then(() => {
          setIsPlaying(true);
        }).catch(handleAudioError);
      }
    }
  };

  const handleMiniPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input')) return;

    setIsDraggingMini(true);
    e.currentTarget.setPointerCapture(e.pointerId);

    const rect = e.currentTarget.getBoundingClientRect();
    dragStartRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handleMiniPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingMini) return;

    const x = e.clientX - dragStartRef.current.x;
    const y = e.clientY - dragStartRef.current.y;

    const maxX = typeof window !== 'undefined' ? window.innerWidth - 356 : 800;
    const maxY = typeof window !== 'undefined' ? window.innerHeight - 124 : 600;

    setMiniPlayerPos({
      x: Math.max(16, Math.min(x, maxX)),
      y: Math.max(16, Math.min(y, maxY)),
    });
  };

  const handleMiniPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDraggingMini(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const handleMiniPlayerSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (duration <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newProgress = percentage * duration;

    setProgress(newProgress);
    if (streamProtocol === 'embed' && ytPlayerRef.current && typeof ytPlayerRef.current.seekTo === 'function') {
      ytPlayerRef.current.seekTo(newProgress, true);
    }
    if (audioRef.current) {
      audioRef.current.currentTime = newProgress;
    }
  };

  const handlePrev = () => {
    if (progress > 3) {
      if (streamProtocol === 'embed' && ytPlayerRef.current && typeof ytPlayerRef.current.seekTo === 'function') {
        ytPlayerRef.current.seekTo(0, true);
        setProgress(0);
        return;
      }
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        setProgress(0);
      }
      return;
    }
    if (queue.length === 0) return;
    
    let prevIdx = queueIndex;
    if (isShuffle) {
      if (queue.length > 1) {
        do {
          prevIdx = Math.floor(Math.random() * queue.length);
        } while (prevIdx === queueIndex);
      } else {
        prevIdx = 0;
      }
    } else {
      prevIdx = (queueIndex - 1 + queue.length) % queue.length;
    }
    playTrack(queue[prevIdx]);
  };

  const handleNext = () => {
    if (queue.length === 0) return;
    
    let nextIdx = queueIndex;
    if (isShuffle) {
      if (queue.length > 1) {
        do {
          nextIdx = Math.floor(Math.random() * queue.length);
        } while (nextIdx === queueIndex);
      } else {
        nextIdx = 0;
      }
    } else {
      nextIdx = (queueIndex + 1) % queue.length;
    }
    playTrack(queue[nextIdx]);
  };

  const toggleLike = (track: Track) => {
    const updated = new Set(likedTracks);
    const isLiked = !updated.has(track.id);
    if (updated.has(track.id)) {
      updated.delete(track.id);
    } else {
      updated.add(track.id);
    }
    setLikedTracks(updated);
    logDebug('database', `${isLiked ? 'Liked' : 'Unliked'} track "${track.title}" (ID: ${track.id}) - Synchronized to active profile.`);

    const savedLikedDetails = { ...likedTrackDetails };
    if (updated.has(track.id)) {
      savedLikedDetails[track.id] = track;
    } else {
      delete savedLikedDetails[track.id];
    }
    setLikedTrackDetails(savedLikedDetails);

    // Sync to profiles list database
    updateActiveProfileData({
      likedTracks: Array.from(updated),
      likedTrackDetails: savedLikedDetails
    });
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (duration === 0) return;
    if (streamProtocol === 'embed' && ytPlayerRef.current && typeof ytPlayerRef.current.seekTo === 'function') {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const pct = x / rect.width;
      const seekTime = pct * duration;
      ytPlayerRef.current.seekTo(seekTime, true);
      setProgress(seekTime);
      return;
    }
    if (!audioRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = x / rect.width;
    const seekTime = pct * duration;
    audioRef.current.currentTime = seekTime;
    setProgress(seekTime);
  };

  // Search logic (debounced)
  const handleSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const searchParams = new URLSearchParams({
          q: query,
          kind: 'tracks',
          limit: '20',
        });
        const res = await fetch(`/api/yt/search?${searchParams}`);
        if (!res.ok) throw new Error('Search failed');
        const data = await res.json();
        setSearchResults(data.tracks ?? []);
      } catch (err: any) {
        console.error(err);
      } finally {
        setIsSearching(false);
      }
    }, 400);
  };

  // Playlists Operations
  const createPlaylist = (e: FormEvent) => {
    e.preventDefault();
    if (!newPlTitle.trim()) return;

    const newPlaylist: Playlist = {
      id: Date.now().toString(),
      title: newPlTitle,
      description: newPlDesc || 'Custom Spice compilation.',
      tracks: [],
      gradient: PRESET_GRADIENTS[Math.floor(Math.random() * PRESET_GRADIENTS.length)],
      createdAt: new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
    };

    const updated = [...customPlaylists, newPlaylist];
    setCustomPlaylists(updated);
    updateActiveProfileData({ customPlaylists: updated });

    setNewPlTitle('');
    setNewPlDesc('');
    setShowCreateDialog(false);
  };

  const deletePlaylist = (playlistId: string) => {
    if (!confirm('Are you sure you want to delete this playlist?')) return;
    const updated = customPlaylists.filter(pl => pl.id !== playlistId);
    setCustomPlaylists(updated);
    updateActiveProfileData({ customPlaylists: updated });
    setSelectedPlaylist(null);
  };

  const addTrackToPlaylist = (track: Track, playlistId: string) => {
    const updated = customPlaylists.map(pl => {
      if (pl.id === playlistId) {
        if (pl.tracks.some(t => t.id === track.id)) return pl;
        return { ...pl, tracks: [...pl.tracks, track] };
      }
      return pl;
    });
    setCustomPlaylists(updated);
    updateActiveProfileData({ customPlaylists: updated });

    if (selectedPlaylist && selectedPlaylist.id === playlistId) {
      setSelectedPlaylist(updated.find(p => p.id === playlistId) || null);
    }
  };

  const removeTrackFromPlaylist = (trackId: string, playlistId: string) => {
    const updated = customPlaylists.map(pl => {
      if (pl.id === playlistId) {
        return { ...pl, tracks: pl.tracks.filter(t => t.id !== trackId) };
      }
      return pl;
    });
    setCustomPlaylists(updated);
    updateActiveProfileData({ customPlaylists: updated });

    if (selectedPlaylist && selectedPlaylist.id === playlistId) {
      setSelectedPlaylist(updated.find(p => p.id === playlistId) || null);
    }
  };

  const getLikedTracksList = (): Track[] => {
    return Object.values(likedTrackDetails);
  };

  const clearHistory = () => {
    if (!confirm('Clear all recently played tracks?')) return;
    setHistory([]);
    updateActiveProfileData({ history: [] });
  };

  // Profile switching, locking and passcode validations
  const switchProfile = (profileId: string) => {
    const target = profiles.find(p => p.id === profileId);
    if (!target) return;

    setActiveProfileId(profileId);
    localStorage.setItem('spice_active_profile_id', profileId);
    logDebug('profile', `Switched active profile to "${target.displayName}" (Playlists: ${target.customPlaylists?.length || 0}, Likes: ${target.likedTracks?.length || 0})`);

    // Synchronize states immediately to prevent cascading renders
    setLikedTracks(new Set(target.likedTracks));
    setLikedTrackDetails(target.likedTrackDetails || {});
    setCustomPlaylists(target.customPlaylists || []);
    setHistory(target.history || []);
    setEditName(target.displayName);
    setEditBio(target.bio);
    setEditGradient(target.gradient);
    setEditPasscode(target.passcode || '');

    if (target.history && target.history.length > 0) {
      setCurrentTrack(target.history[0]);
      setQueue([target.history[0]]);
    } else {
      const starboy = {
        id: 'Starboy',
        title: 'Starboy',
        artists: [{ id: 'The Weeknd', name: 'The Weeknd' }],
        artworkUrl: 'https://lh3.googleusercontent.com/e44T8B4s4HwT1kX5j1Y0qN_fRj5fLwVvDkO04EwU8T2v9K51hVd6qO9yPZ5zPZ5v=w120-h120'
      };
      setCurrentTrack(starboy);
      setQueue([starboy]);
    }
    setQueueIndex(0);
    setProgress(0);
    setStreamUrl(null);
    setIsPlaying(false);

    // Lock screen trigger if passcode exists
    if (target.passcode) {
      setIsLocked(true);
      setPasscodeInput('');
      setPasscodeError(null);
    } else {
      setIsLocked(false);
    }
  };

  const createProfile = (e: FormEvent) => {
    e.preventDefault();
    if (!newProfileName.trim()) return;

    const newId = 'profile_' + Date.now();
    const newProf: UserProfile = {
      id: newId,
      displayName: newProfileName.trim(),
      bio: newProfileBio.trim() || 'A fresh Spice listener.',
      gradient: newProfileGradient,
      songsPlayed: 0,
      joinedAt: new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long' }),
      passcode: newProfilePasscode.length === 4 ? newProfilePasscode : undefined,
      likedTracks: [],
      likedTrackDetails: {},
      customPlaylists: [],
      history: []
    };

    const updatedList = [...profiles, newProf];
    setProfiles(updatedList);
    localStorage.setItem('spice_profiles_list', JSON.stringify(updatedList));

    // Reset forms and dialogs
    setNewProfileName('');
    setNewProfileBio('');
    setNewProfilePasscode('');
    setShowCreateProfileDialog(false);

    // Switch instantly
    switchProfile(newId);
  };

  const deleteProfile = (profileId: string) => {
    if (profiles.length <= 1) {
      alert('You must have at least one active profile.');
      return;
    }
    if (!confirm('Are you sure you want to delete this profile and all its playlists/likes? This cannot be undone.')) return;

    const updated = profiles.filter(p => p.id !== profileId);
    setProfiles(updated);
    localStorage.setItem('spice_profiles_list', JSON.stringify(updated));

    // Switch to first profile
    switchProfile(updated[0].id);
  };

  const handlePasscodeKey = (num: string) => {
    setPasscodeError(null);
    if (passcodeInput.length >= 4) return;
    const nextVal = passcodeInput + num;
    setPasscodeInput(nextVal);

    if (nextVal.length === 4) {
      // Validate
      if (nextVal === activeProfile.passcode) {
        setIsLocked(false);
        setPasscodeInput('');
      } else {
        setPasscodeError('Incorrect Passcode. Access Denied.');
        // Vibrate clear trigger after delay
        setTimeout(() => {
          setPasscodeInput('');
        }, 600);
      }
    }
  };

  const clearPasscode = () => {
    setPasscodeInput('');
    setPasscodeError(null);
  };

  const removePasscodeFromActive = () => {
    setEditPasscode('');
    updateActiveProfileData({ passcode: undefined });
    alert('Passcode protection removed successfully.');
  };

  const saveProfile = (e: FormEvent) => {
    e.preventDefault();
    
    // Passcode validation
    const passcodeVal = editPasscode.trim();
    if (passcodeVal && passcodeVal.length !== 4) {
      alert('Passcode must be exactly 4 digits.');
      return;
    }

    updateActiveProfileData({
      displayName: editName.trim() || 'Spice Listener',
      bio: editBio.trim() || 'No bio written yet.',
      gradient: editGradient,
      passcode: passcodeVal ? passcodeVal : undefined,
    });

    setIsEditingProfile(false);
  };

  // ── Playlist Transfer Tool Implementations ────────────────────────
  const importYouTubePlaylist = async () => {
    setPlaylistImportError(null);
    setPlaylistImportSuccess(null);
    setIsImportingPlaylist(true);

    let parsedId = ytPlaylistLink.trim();
    if (parsedId.includes('list=')) {
      const match = parsedId.match(/list=([^&]+)/);
      if (match) parsedId = match[1];
    }

    if (!parsedId || parsedId.length < 5) {
      setPlaylistImportError('Invalid YouTube Playlist URL or ID format.');
      setIsImportingPlaylist(false);
      return;
    }

    try {
      const res = await fetch(`/api/yt/playlist/${encodeURIComponent(parsedId)}`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to fetch playlist details.');
      }

      const playlistData = await res.json();
      const tracks: Track[] = (playlistData.tracks ?? []).map((t: any) => ({
        id: t.id,
        title: t.title,
        artists: t.artists,
        artworkUrl: t.artworkUrl,
        durationMs: t.durationMs
      }));

      if (tracks.length === 0) {
        throw new Error('This public playlist does not contain any playable tracks.');
      }

      // Add as custom playlist
      const newPlaylist: Playlist = {
        id: 'imported_' + Date.now(),
        title: playlistData.title || 'YT Import',
        description: playlistData.description || 'Imported YouTube playlist.',
        tracks,
        gradient: PRESET_GRADIENTS[Math.floor(Math.random() * PRESET_GRADIENTS.length)],
        createdAt: new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
      };

      const updated = [...customPlaylists, newPlaylist];
      setCustomPlaylists(updated);
      updateActiveProfileData({ customPlaylists: updated });

      setPlaylistImportSuccess(`Successfully imported "${playlistData.title}" with ${tracks.length} tracks!`);
      setYtPlaylistLink('');

    } catch (err: any) {
      console.error(err);
      setPlaylistImportError(err.message || 'Playlist retrieval failed.');
    } finally {
      setIsImportingPlaylist(false);
    }
  };

  // JSON Database Backups
  const downloadBackupFile = () => {
    const backupData = {
      version: 'spice-v1',
      profile: {
        displayName: activeProfile.displayName,
        bio: activeProfile.bio,
        gradient: activeProfile.gradient,
        joinedAt: activeProfile.joinedAt,
        songsPlayed: activeProfile.songsPlayed
      },
      likedTracks: Array.from(likedTracks),
      likedTrackDetails,
      customPlaylists,
      history
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeProfile.displayName.replace(/\s+/g, '_')}_spice_backup.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const copyBackupToClipboard = () => {
    const backupData = {
      version: 'spice-v1',
      likedTracks: Array.from(likedTracks),
      likedTrackDetails,
      customPlaylists,
      history
    };
    navigator.clipboard.writeText(JSON.stringify(backupData))
      .then(() => alert('Spice JSON Backup copied to clipboard!'))
      .catch(err => console.error('Failed to copy JSON:', err));
  };

  const restoreBackupData = () => {
    setJsonBackupStatus(null);
    if (!jsonImportText.trim()) return;

    try {
      const payload = JSON.parse(jsonImportText.trim());
      if (payload.version !== 'spice-v1') {
        throw new Error('Incompatible backup version tag.');
      }

      // Merge Liked tracks
      const newLikesSet = new Set([...likedTracks, ...(payload.likedTracks || [])]);
      setLikedTracks(newLikesSet);

      const mergedDetails = { ...likedTrackDetails, ...(payload.likedTrackDetails || {}) };
      setLikedTrackDetails(mergedDetails);

      // Merge Playlists
      const newPlaylists = [...customPlaylists];
      const parsedPlaylists: Playlist[] = payload.customPlaylists || [];
      for (const pl of parsedPlaylists) {
        if (!newPlaylists.some(p => p.title === pl.title && p.tracks.length === pl.tracks.length)) {
          newPlaylists.push({
            ...pl,
            id: 'backup_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5)
          });
        }
      }
      setCustomPlaylists(newPlaylists);

      // Merge history
      const newHistory = [...(payload.history || []), ...history].slice(0, 50);
      setHistory(newHistory);

      // Sync to local profiles DB
      updateActiveProfileData({
        likedTracks: Array.from(newLikesSet),
        likedTrackDetails: mergedDetails,
        customPlaylists: newPlaylists,
        history: newHistory
      });

      setJsonBackupStatus('success');
      setJsonImportText('');
      alert('Backup database parsed and merged successfully!');

    } catch (e: any) {
      console.error(e);
      setJsonBackupStatus('error');
      alert('Error parsing JSON backup: ' + e.message);
    }
  };

  const getAccentStyles = () => {
    let base = '';
    switch (accentTheme) {
      case 'blue':
        base = `
          :root {
            --accent-pink: #3b82f6 !important;
            --accent-pink-rgb: 59, 130, 246 !important;
            --accent-purple: #06b6d4 !important;
          }
        `;
        break;
      case 'orange':
        base = `
          :root {
            --accent-pink: #f97316 !important;
            --accent-pink-rgb: 249, 115, 22 !important;
            --accent-purple: #ef4444 !important;
          }
        `;
        break;
      case 'green':
        base = `
          :root {
            --accent-pink: #10b981 !important;
            --accent-pink-rgb: 16, 185, 129 !important;
            --accent-purple: #059669 !important;
          }
        `;
        break;
      case 'gold':
        base = `
          :root {
            --accent-pink: #f59e0b !important;
            --accent-pink-rgb: 245, 158, 11 !important;
            --accent-purple: #d97706 !important;
          }
        `;
        break;
      default: // pink
        base = `
          :root {
            --accent-pink: #ec4899 !important;
            --accent-pink-rgb: 236, 72, 153 !important;
            --accent-purple: #a855f7 !important;
          }
        `;
        break;
    }

    if (playerPlacement === 'top') {
      base += `
        .app {
          grid-template-rows: var(--now-playing-height) 1fr !important;
        }
        .now-playing {
          grid-row: 1 / 2 !important;
          border-top: none !important;
          border-bottom: 1px solid var(--border-glass) !important;
        }
        .sidebar {
          grid-row: 2 / 3 !important;
        }
        .main {
          grid-row: 2 / 3 !important;
        }
      `;
    }

    if (playerViewMode === 'mini') {
      base += `
        .app {
          grid-template-rows: 1fr !important;
        }
        .now-playing {
          display: none !important;
        }
      `;
    }

    base += `
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      .vinyl-spin {
        animation: spin 20s linear infinite;
      }
      .expanded-player__btn:hover {
        transform: scale(1.15);
        color: var(--accent-pink) !important;
      }
      .expanded-player__btn-play:hover {
        transform: scale(1.08);
        box-shadow: 0 12px 32px rgba(var(--accent-pink-rgb), 0.6) !important;
      }
      .mini-player:hover .mini-player__art-hover {
        opacity: 1 !important;
      }
    `;

    return base;
  };

  return (
    <div className="app">
      <style dangerouslySetInnerHTML={{ __html: getAccentStyles() }} />
      {/* ── Security Passcode Lock Overlay ── */}
      {isLocked && (
        <div className="passcode-overlay animate-in" style={{ position: 'fixed', inset: 0, background: '#000000', zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(32px)' }}>
          <div style={{ textAlign: 'center', maxWidth: '320px', width: '100%', padding: '24px' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: activeProfile.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 900, color: '#fff', margin: '0 auto 24px auto', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
              {activeProfile.displayName.charAt(0).toUpperCase()}
            </div>
            <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.5rem', fontWeight: 700, color: '#fff', margin: '0 0 8px 0' }}>Profile Locked</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '32px' }}>
              Enter passcode to unlock <strong>{activeProfile.displayName}</strong>
            </p>

            {/* Indicator dots */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '40px' }}>
              {[...Array(4)].map((_, i) => (
                <div 
                  key={i} 
                  style={{ width: '16px', height: '16px', borderRadius: '50%', background: passcodeInput.length > i ? 'var(--accent-pink)' : '#222', border: '1px solid #444', transition: 'all 0.15s ease', boxShadow: passcodeInput.length > i ? '0 0 12px var(--accent-pink)' : 'none' }}
                />
              ))}
            </div>

            {passcodeError && (
              <div className="loader-glow" style={{ color: '#f87171', fontSize: '0.85rem', marginBottom: '24px', fontWeight: 600 }}>
                {passcodeError}
              </div>
            )}

            {/* Custom Premium Virtual Keypad */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
                <button 
                  key={num} 
                  type="button"
                  onClick={() => handlePasscodeKey(num)}
                  style={{ height: '56px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: '#fff', fontSize: '1.25rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.15s ease' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.transform = 'scale(1.05)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.transform = 'scale(1)'; }}
                >
                  {num}
                </button>
              ))}
              <button 
                type="button" 
                onClick={clearPasscode}
                style={{ height: '56px', borderRadius: '12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
              >
                Clear
              </button>
              <button 
                type="button"
                onClick={() => handlePasscodeKey('0')}
                style={{ height: '56px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: '#fff', fontSize: '1.25rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.15s' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.transform = 'scale(1.05)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.transform = 'scale(1)'; }}
              >
                0
              </button>
              <button 
                type="button"
                onClick={() => {
                  // Switch to default profile or other profiles if they aren't locked
                  const unlocked = profiles.find(p => !p.passcode);
                  if (unlocked) {
                    switchProfile(unlocked.id);
                  } else {
                    alert('All profiles are locked. Please enter correct credentials.');
                  }
                }}
                style={{ height: '56px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
              >
                Switch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Audio Player */}
      {streamUrl && streamUrl !== 'youtube-embed-active' && (
        <audio
          ref={audioRef}
          src={streamUrl}
          autoPlay={isPlaying}
          {...{ referrerpolicy: 'no-referrer' }}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleAudioEnded}
          onError={handleAudioError}
        />
      )}

      {/* Hidden YouTube Iframe Player for Embed Fallback Mode */}
      <div 
        id="spice-yt-iframe-container" 
        style={{ 
          position: 'absolute', 
          width: '1px', 
          height: '1px', 
          opacity: 0, 
          pointerEvents: 'none', 
          left: '-9999px',
          top: '-9999px'
        }} 
      />

      {/* ═══ Sidebar Panel ═══ */}
      <aside className="sidebar">
        <div className="sidebar__logo" onClick={() => { setCurrentPage('home'); setSelectedPlaylist(null); }}>
          <div className="sidebar__logo-icon" style={{ background: activeProfile.gradient }}>
            <span style={{ fontSize: '1rem', fontWeight: 900, color: '#fff' }}>S</span>
          </div>
          <span className="sidebar__logo-text">Spice</span>
        </div>

        <nav className="sidebar__nav">
          <button
            className={`sidebar__nav-item ${currentPage === 'home' && !selectedPlaylist ? 'active' : ''}`}
            onClick={() => { setCurrentPage('home'); setSelectedPlaylist(null); }}
          >
            {Icons.home}
            <span className="sidebar__nav-label">Home</span>
          </button>
          <button
            className={`sidebar__nav-item ${currentPage === 'search' && !selectedPlaylist ? 'active' : ''}`}
            onClick={() => { setCurrentPage('search'); setSelectedPlaylist(null); }}
          >
            {Icons.search}
            <span className="sidebar__nav-label">Search</span>
          </button>
          <button
            className={`sidebar__nav-item ${currentPage === 'library' && !selectedPlaylist ? 'active' : ''}`}
            onClick={() => { setCurrentPage('library'); setSelectedPlaylist(null); }}
          >
            {Icons.library}
            <span className="sidebar__nav-label">Library</span>
          </button>
          <button
            className={`sidebar__nav-item ${currentPage === 'account' && !selectedPlaylist ? 'active' : ''}`}
            onClick={() => { setCurrentPage('account'); setSelectedPlaylist(null); }}
          >
            {Icons.account}
            <span className="sidebar__nav-label">Account</span>
          </button>
          <button
            className={`sidebar__nav-item ${currentPage === 'settings' && !selectedPlaylist ? 'active' : ''}`}
            onClick={() => { setCurrentPage('settings'); setSelectedPlaylist(null); }}
          >
            {Icons.settings}
            <span className="sidebar__nav-label">Settings</span>
          </button>
        </nav>

        <div className="sidebar__divider"></div>
        <div className="sidebar__header-row">
          <div className="sidebar__section-title">Playlists</div>
          <button className="sidebar__add-btn" onClick={() => setShowCreateDialog(true)} title="Create Playlist">+</button>
        </div>

        <div className="sidebar__playlists">
          {!isMounted || customPlaylists.length === 0 ? (
            <div className="sidebar__empty">No playlists yet</div>
          ) : (
            customPlaylists.map(pl => (
              <button
                key={pl.id}
                className={`sidebar__playlist-item ${selectedPlaylist?.id === pl.id ? 'active' : ''}`}
                onClick={() => {
                  setSelectedPlaylist(pl);
                  setCurrentPage('library');
                }}
              >
                {Icons.playlist}
                <span className="truncate">{pl.title}</span>
              </button>
            ))
          )}
        </div>
      </aside>

      {/* ═══ Main Content Area ═══ */}
      <main className="main" id="main">
        <div className="main__content">
          
          {error && (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '12px 20px', borderRadius: '8px', marginBottom: '24px', color: '#f87171', display: 'flex', alignItems: 'center' }}>
              <span>⚠️ {error}</span>
              <button onClick={() => setError(undefined)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
            </div>
          )}

          {/* ── Playlist Details View (Intercepts regular screens) ── */}
          {selectedPlaylist ? (
            <div className="animate-in">
              <button 
                onClick={() => setSelectedPlaylist(null)} 
                className="btn btn--ghost" 
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '24px', padding: '6px 12px', fontSize: '0.85rem' }}
              >
                {Icons.back} Back to Library
              </button>

              <div className="playlist-detail-banner" style={{ background: selectedPlaylist.gradient }}>
                <div className="playlist-detail-banner__overlay"></div>
                <div className="playlist-detail-banner__content">
                  <div className="playlist-detail-banner__cover" style={{ background: selectedPlaylist.gradient }}>
                    {selectedPlaylist.tracks.length > 0 ? (
                      <img src={selectedPlaylist.tracks[0].artworkUrl} alt={selectedPlaylist.title} />
                    ) : (
                      <span style={{ fontSize: '4rem' }}>🎵</span>
                    )}
                  </div>
                  <div className="playlist-detail-banner__info">
                    <span className="playlist-detail-banner__tag">Playlist</span>
                    <h1 className="playlist-detail-banner__title">{selectedPlaylist.title}</h1>
                    <p className="playlist-detail-banner__desc">{selectedPlaylist.description}</p>
                    <p className="playlist-detail-banner__meta">
                      Created on {selectedPlaylist.createdAt} · {selectedPlaylist.tracks.length} tracks
                    </p>
                    <div className="playlist-detail-banner__actions">
                      {selectedPlaylist.tracks.length > 0 && (
                        <button 
                          className="btn btn--primary" 
                          onClick={() => playTrack(selectedPlaylist.tracks[0], selectedPlaylist.tracks)}
                        >
                          {Icons.play} Play
                        </button>
                      )}
                      <button 
                        className="btn btn--danger" 
                        onClick={() => deletePlaylist(selectedPlaylist.id)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#f87171' }}
                      >
                        {Icons.trash} Delete Playlist
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <section className="section" style={{ marginTop: '32px' }}>
                {selectedPlaylist.tracks.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--text-secondary)', background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                    <p style={{ fontSize: '1.2rem', marginBottom: '8px', color: '#fff' }}>This playlist is empty</p>
                    <p style={{ fontSize: '0.9rem', marginBottom: '16px' }}>Search and add your favorite tracks</p>
                    <button className="btn btn--primary" onClick={() => { setSelectedPlaylist(null); setCurrentPage('search'); }}>
                      Search Tracks
                    </button>
                  </div>
                ) : (
                  <div className="library-list">
                    {selectedPlaylist.tracks.map((song, i) => {
                      const isLiked = likedTracks.has(song.id);
                      const isPlayingCurrent = currentTrack.id === song.id;
                      return (
                        <div key={song.id} className="library-item animate-in">
                          <span className="library-item__index" style={{ width: '24px', color: 'var(--text-secondary)' }}>{i + 1}</span>
                          <img className="library-item__art" src={song.artworkUrl || '/icon.svg'} alt={song.title} onClick={() => playTrack(song, selectedPlaylist.tracks)} />
                          <div className="library-item__info" onClick={() => playTrack(song, selectedPlaylist.tracks)}>
                            <span className="library-item__title" style={isPlayingCurrent ? { color: 'var(--accent-pink)' } : {}}>
                              {song.title}
                            </span>
                            <span className="library-item__subtitle">
                              {song.artists.map(a => a.name).join(', ')}
                            </span>
                          </div>

                          <button
                            className="library-item__action"
                            style={{ opacity: 1, color: '#ef4444', marginRight: '8px' }}
                            onClick={() => removeTrackFromPlaylist(song.id, selectedPlaylist.id)}
                            title="Remove from playlist"
                          >
                            {Icons.trash}
                          </button>

                          <button
                            className="library-item__action"
                            style={{ opacity: 1, color: isLiked ? 'var(--accent-pink)' : 'var(--text-muted)' }}
                            onClick={() => toggleLike(song)}
                          >
                            {isLiked ? Icons.heartFilled : Icons.heart}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>
          ) : (
            <>
              {/* ── Home Page ── */}
              {currentPage === 'home' && (
                <>
                  {/* cover greetings header */}
                  <section style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color)', padding: '28px', borderRadius: '16px', backdropFilter: 'blur(10px)' }} className="animate-in">
                    <div>
                      <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '2.25rem', fontWeight: 800, margin: '0 0 6px 0', background: activeProfile.gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        Welcome back, {activeProfile.displayName}!
                      </h1>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: 0 }}>
                        Discover, stream, and sync your favorite music on the ultimate closed-source player.
                      </p>
                    </div>
                    <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: activeProfile.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.75rem', fontWeight: 900, color: '#fff', boxShadow: '0 4px 20px rgba(0,0,0,0.4)', textShadow: '0 2px 8px rgba(0,0,0,0.3)', flexShrink: 0 }}>
                      {activeProfile.displayName.charAt(0).toUpperCase()}
                    </div>
                  </section>

                  {/* Your Playlists Carousel */}
                  {customPlaylists.length > 0 && (
                    <section className="section animate-in">
                      <div className="section__header">
                        <h2 className="section__title">Your Playlists</h2>
                        <button onClick={() => setCurrentPage('library')} style={{ background: 'none', border: 'none', color: 'var(--accent-pink)', fontSize: '0.85rem', cursor: 'pointer' }}>View All</button>
                      </div>
                      <div className="carousel-wrapper">
                        <div className="carousel">
                          {customPlaylists.map((pl) => (
                            <div key={pl.id} className="card animate-in" onClick={() => setSelectedPlaylist(pl)}>
                              <div className="card__art-wrapper" style={{ background: pl.gradient || PRESET_GRADIENTS[0], display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '180px' }}>
                                <div style={{ fontSize: '3rem', textShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>📁</div>
                                <div className="card__play-overlay">{Icons.play}</div>
                              </div>
                              <div className="card__title truncate" style={{ marginTop: '8px', fontWeight: 600 }}>{pl.title}</div>
                              <div className="card__subtitle truncate">{pl.tracks.length} tracks</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </section>
                  )}

                  {/* Recently Played */}
                  {history.length > 0 && (
                    <section className="section animate-in">
                      <div className="section__header">
                        <h2 className="section__title">Recently Played</h2>
                        <button onClick={clearHistory} style={{ background: 'none', border: 'none', color: 'var(--accent-pink)', fontSize: '0.85rem', cursor: 'pointer' }}>Clear</button>
                      </div>
                      <div className="carousel-wrapper">
                        <div className="carousel">
                          {history.map((song) => (
                            <div key={song.id} className="card card--round animate-in" onClick={() => playTrack(song, history)}>
                              <div className="card__art-wrapper">
                                <img className="card__art" src={song.artworkUrl || '/icon.svg'} alt={song.title} />
                                <div className="card__play-overlay">{Icons.play}</div>
                              </div>
                              <div className="card__title truncate">{song.title}</div>
                              <div className="card__subtitle truncate">{song.artists.map(a => a.name).join(', ')}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </section>
                  )}

                  {/* Listen Again */}
                  {homeListenAgain.length > 0 && (
                    <section className="section animate-in">
                      <div className="section__header">
                        <h2 className="section__title">Listen Again</h2>
                      </div>
                      <div className="carousel-wrapper">
                        <div className="carousel">
                          {homeListenAgain.map((song) => (
                            <div key={song.id} className="card animate-in" onClick={() => playTrack(song, homeListenAgain)}>
                              <div className="card__art-wrapper">
                                <img className="card__art" src={song.artworkUrl || '/icon.svg'} alt={song.title} />
                                <div className="card__play-overlay">{Icons.play}</div>
                              </div>
                              <div className="card__title truncate">{song.title}</div>
                              <div className="card__subtitle truncate">{song.artists.map(a => a.name).join(', ')}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </section>
                  )}

                  {/* Quick Picks (dynamic charts) */}
                  <section className="section">
                    <div className="section__header">
                      <h2 className="section__title">Quick Picks</h2>
                    </div>
                    {isLoadingHome ? (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px' }}>
                        {[...Array(6)].map((_, i) => (
                          <div key={i} style={{ height: '80px', background: 'var(--card-bg)', borderRadius: '8px', animation: 'pulse 1.5s infinite' }}></div>
                        ))}
                      </div>
                    ) : (
                      <div className="quick-grid">
                        {homeTrending.slice(1, 7).map((song) => (
                          <div key={song.id} className="quick-card animate-in" onClick={() => playTrack(song, homeTrending)}>
                            <img className="quick-card__art" src={song.artworkUrl || '/icon.svg'} alt={song.title} />
                            <span className="quick-card__title truncate">{song.title}</span>
                            <div className="quick-card__play">{Icons.play}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  {/* Chill & Focus (dynamic charts) */}
                  <section className="section animate-in">
                    <div className="section__header">
                      <h2 className="section__title">Lofi & Chill Beats</h2>
                    </div>
                    <div className="carousel-wrapper">
                      <div className="carousel">
                        {isLoadingHome ? (
                          [...Array(4)].map((_, i) => (
                            <div key={i} style={{ width: '180px', height: '220px', background: 'var(--card-bg)', borderRadius: '12px', flexShrink: 0 }} />
                          ))
                        ) : (
                          homeChill.map((song) => (
                            <div key={song.id} className="card animate-in" onClick={() => playTrack(song, homeChill)}>
                              <div className="card__art-wrapper">
                                <img className="card__art" src={song.artworkUrl || '/icon.svg'} alt={song.title} />
                                <div className="card__play-overlay">{Icons.play}</div>
                              </div>
                              <div className="card__title truncate">{song.title}</div>
                              <div className="card__subtitle truncate">{song.artists.map(a => a.name).join(', ')}</div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </section>

                  {/* Workout Energy (dynamic charts) */}
                  <section className="section animate-in">
                    <div className="section__header">
                      <h2 className="section__title">Workout Energy</h2>
                    </div>
                    <div className="carousel-wrapper">
                      <div className="carousel">
                        {isLoadingHome ? (
                          [...Array(4)].map((_, i) => (
                            <div key={i} style={{ width: '180px', height: '220px', background: 'var(--card-bg)', borderRadius: '12px', flexShrink: 0 }} />
                          ))
                        ) : (
                          homeEnergy.map((song) => (
                            <div key={song.id} className="card animate-in" onClick={() => playTrack(song, homeEnergy)}>
                              <div className="card__art-wrapper">
                                <img className="card__art" src={song.artworkUrl || '/icon.svg'} alt={song.title} />
                                <div className="card__play-overlay">{Icons.play}</div>
                              </div>
                              <div className="card__title truncate">{song.title}</div>
                              <div className="card__subtitle truncate">{song.artists.map(a => a.name).join(', ')}</div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </section>
                </>
              )}

              {/* ── Search Page ── */}
              {currentPage === 'search' && (
                <>
                  <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '2rem', fontWeight: 800, marginBottom: '24px' }}>Search</h1>
                  
                  <div className="search-container">
                    <div className="search-bar">
                      {Icons.search}
                      <input
                        type="text"
                        placeholder="Search tracks on YouTube Music..."
                        value={searchQuery}
                        onChange={handleSearchInput}
                        autoComplete="off"
                        autoFocus
                      />
                      {isSearching && <span className="loader-glow" style={{ fontSize: '0.85rem' }}>Searching...</span>}
                    </div>
                  </div>

                  {searchResults.length > 0 ? (
                    <section className="section animate-in">
                      <div className="section__header">
                        <h2 className="section__title">Search Results</h2>
                      </div>
                      <div className="library-list">
                        {searchResults.map((song) => {
                          const isLiked = likedTracks.has(song.id);
                          const isPlayingCurrent = currentTrack.id === song.id;
                          return (
                            <div key={song.id} className="library-item animate-in">
                              <img className="library-item__art" src={song.artworkUrl || '/icon.svg'} alt={song.title} onClick={() => playTrack(song, searchResults)} />
                              <div className="library-item__info" onClick={() => playTrack(song, searchResults)}>
                                <span className="library-item__title" style={isPlayingCurrent ? { color: 'var(--accent-pink)' } : {}}>
                                  {song.title}
                                </span>
                                <span className="library-item__subtitle">
                                  {song.artists.map(a => a.name).join(', ')} {song.durationMs ? `· ${formatTime(song.durationMs / 1000)}` : ''}
                                </span>
                              </div>
                              
                              {/* Custom Playlist Selector */}
                              {customPlaylists.length > 0 && (
                                <select 
                                  onChange={(e) => {
                                    if (e.target.value) {
                                      addTrackToPlaylist(song, e.target.value);
                                      e.target.value = '';
                                      alert(`Added track to playlist!`);
                                    }
                                  }}
                                  style={{ background: 'var(--card-bg)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '0.8rem', padding: '6px 10px', cursor: 'pointer', outline: 'none', marginRight: '8px' }}
                                >
                                  <option value="">+ Add Playlist</option>
                                  {customPlaylists.map(pl => (
                                    <option key={pl.id} value={pl.id}>{pl.title}</option>
                                  ))}
                                </select>
                              )}

                              <button
                                className="library-item__action"
                                style={{ opacity: 1, color: isLiked ? 'var(--accent-pink)' : 'var(--text-muted)' }}
                                onClick={() => toggleLike(song)}
                              >
                                {isLiked ? Icons.heartFilled : Icons.heart}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  ) : (
                    <section className="section animate-in">
                      <div className="section__header">
                        <h2 className="section__title">Browse All Categories</h2>
                      </div>
                      <div className="genre-grid">
                        {genres.map((g, i) => (
                          <div key={i} className="genre-card animate-in" style={{ background: g.gradient }} onClick={() => {
                            setSearchQuery(g.name);
                            handleSearchInput({ target: { value: g.name } } as any);
                          }}>
                            <span className="genre-card__title">{g.name}</span>
                            <span className="genre-card__emoji">{g.emoji}</span>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}
                </>
              )}

              {/* ── Library Page ── */}
              {currentPage === 'library' && (
                <>
                  <div className="library-header animate-in">
                    <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '2rem', fontWeight: 800 }}>Your Library</h1>
                    <div className="library-header__actions">
                      <button className="btn btn--primary" style={{ padding: '8px 16px', fontSize: '0.8rem' }} onClick={() => setShowCreateDialog(true)}>
                        + Create Playlist
                      </button>
                      <button className={`library-view-btn ${libraryView === 'list' ? 'active' : ''}`} onClick={() => setLibraryView('list')}>
                        {Icons.list}
                      </button>
                      <button className={`library-view-btn ${libraryView === 'grid' ? 'active' : ''}`} onClick={() => setLibraryView('grid')}>
                        {Icons.grid}
                      </button>
                    </div>
                  </div>

                  <div className="chips animate-in">
                    <button className={`chip ${libraryFilter === 'playlists' ? 'active' : ''}`} onClick={() => setLibraryFilter('playlists')}>
                      Playlists
                    </button>
                    <button className={`chip ${libraryFilter === 'liked' ? 'active' : ''}`} onClick={() => setLibraryFilter('liked')}>
                      Liked Songs
                    </button>
                    <button className={`chip ${libraryFilter === 'history' ? 'active' : ''}`} onClick={() => setLibraryFilter('history')}>
                      History
                    </button>
                  </div>

                  {/* Playlists view */}
                  {libraryFilter === 'playlists' && (
                    <div className="playlist-grid animate-in">
                      {customPlaylists.length === 0 ? (
                        <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '64px 0', color: 'var(--text-secondary)' }}>
                          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📁</div>
                          <p style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '8px', color: 'var(--text-primary)' }}>Create your first custom playlist</p>
                          <p style={{ marginBottom: '16px' }}>Build custom compilations from YouTube Music streams</p>
                          <button className="btn btn--primary" onClick={() => setShowCreateDialog(true)}>Create Playlist</button>
                        </div>
                      ) : (
                        customPlaylists.map((pl) => (
                          <div key={pl.id} className="playlist-card animate-in" onClick={() => setSelectedPlaylist(pl)}>
                            <div className="playlist-card__bg" style={{ background: pl.gradient }}></div>
                            <div className="playlist-card__overlay"></div>
                            <div className="playlist-card__info">
                              <h3 className="playlist-card__title truncate">{pl.title}</h3>
                              <p className="playlist-card__desc">{pl.tracks.length} songs</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* Liked songs view */}
                  {libraryFilter === 'liked' && (
                    <div className="library-list animate-in">
                      {getLikedTracksList().length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--text-secondary)' }}>
                          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>💜</div>
                          <p style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '8px', color: 'var(--text-primary)' }}>Songs you like will appear here</p>
                          <p>Tap the heart icon next to any search results to save tracks</p>
                        </div>
                      ) : (
                        getLikedTracksList().map((song) => {
                          const isPlayingCurrent = currentTrack.id === song.id;
                          return (
                            <div key={song.id} className="library-item animate-in" onClick={() => playTrack(song, getLikedTracksList())}>
                              <img className="library-item__art" src={song.artworkUrl || '/icon.svg'} alt={song.title} />
                              <div className="library-item__info">
                                <span className="library-item__title" style={isPlayingCurrent ? { color: 'var(--accent-pink)' } : {}}>
                                  {song.title}
                                </span>
                                <span className="library-item__subtitle">
                                  {song.artists.map(a => a.name).join(', ')}
                                </span>
                              </div>
                              <button
                                className="library-item__action"
                                style={{ opacity: 1, color: 'var(--accent-pink)' }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleLike(song);
                                }}
                              >
                                {Icons.heartFilled}
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}

                  {/* Playback History view */}
                  {libraryFilter === 'history' && (
                    <div className="library-list animate-in">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Recently Played Tracks</span>
                        {history.length > 0 && (
                          <button className="btn btn--ghost" onClick={clearHistory} style={{ fontSize: '0.8rem', padding: '6px 12px', border: '1px solid var(--border-color)' }}>
                            Clear History
                          </button>
                        )}
                      </div>

                      {history.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--text-secondary)' }}>
                          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🕒</div>
                          <p style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '8px', color: 'var(--text-primary)' }}>No playback history yet</p>
                          <p>Tracks you listen to will be preserved locally in chronological order</p>
                        </div>
                      ) : (
                        history.map((song) => {
                          const isPlayingCurrent = currentTrack.id === song.id;
                          return (
                            <div key={song.id} className="library-item animate-in" onClick={() => playTrack(song, history)}>
                              <img className="library-item__art" src={song.artworkUrl || '/icon.svg'} alt={song.title} />
                              <div className="library-item__info">
                                <span className="library-item__title" style={isPlayingCurrent ? { color: 'var(--accent-pink)' } : {}}>
                                  {song.title}
                                </span>
                                <span className="library-item__subtitle">
                                  {song.artists.map(a => a.name).join(', ')}
                                </span>
                              </div>
                              {customPlaylists.length > 0 && (
                                <select 
                                  onChange={(e) => {
                                    if (e.target.value) {
                                      addTrackToPlaylist(song, e.target.value);
                                      e.target.value = '';
                                      alert(`Added track to playlist!`);
                                    }
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  style={{ background: 'var(--card-bg)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '0.8rem', padding: '6px 10px', cursor: 'pointer', outline: 'none', marginRight: '8px' }}
                                >
                                  <option value="">+ Add Playlist</option>
                                  {customPlaylists.map(pl => (
                                    <option key={pl.id} value={pl.id}>{pl.title}</option>
                                  ))}
                                </select>
                              )}
                              <button
                                className="library-item__action"
                                style={{ opacity: 1, color: likedTracks.has(song.id) ? 'var(--accent-pink)' : 'var(--text-muted)' }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleLike(song);
                                }}
                              >
                                {likedTracks.has(song.id) ? Icons.heartFilled : Icons.heart}
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </>
              )}

              {/* ── Account/Profile & Playlist Transfer Page ── */}
              {currentPage === 'account' && (
                <div className="animate-in" style={{ maxWidth: '720px', margin: '0 auto' }}>
                  <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '2rem', fontWeight: 800, marginBottom: '24px' }}>Account Settings</h1>

                  {/* Profile view */}
                  <div className="profile-card animate-in" style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '24px', marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '24px' }}>
                    <div 
                      style={{ width: '80px', height: '80px', borderRadius: '50%', background: activeProfile.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', fontWeight: 900, color: '#fff', textShadow: '0 4px 12px rgba(0,0,0,0.3)', flexShrink: 0 }}
                    >
                      {activeProfile.displayName.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 6px 0', fontFamily: 'Outfit, sans-serif', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="truncate">{activeProfile.displayName}</span>
                        {activeProfile.passcode && <span title="Profile locked" style={{ color: 'var(--accent-pink)', display: 'inline-flex' }}>{Icons.lock}</span>}
                      </h2>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '0 0 12px 0' }}>{activeProfile.bio}</p>
                      <span style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-secondary)', padding: '4px 10px', borderRadius: '12px' }}>
                        Listener since {activeProfile.joinedAt}
                      </span>
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px' }}>
                    <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', padding: '16px', borderRadius: '12px', textAlign: 'center' }}>
                      <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--accent-pink)', marginBottom: '4px' }}>
                        {activeProfile.songsPlayed}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Songs Streamed</div>
                    </div>
                    <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', padding: '16px', borderRadius: '12px', textAlign: 'center' }}>
                      <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--accent-purple)', marginBottom: '4px' }}>
                        {likedTracks.size}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Liked Songs</div>
                    </div>
                    <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', padding: '16px', borderRadius: '12px', textAlign: 'center' }}>
                      <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f59e0b', marginBottom: '4px' }}>
                        {customPlaylists.length}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Playlists</div>
                    </div>
                  </div>

                  {/* Profiles Switching drawer */}
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '24px 0 16px 0', fontFamily: 'Outfit, sans-serif' }}>Local Profile Management</h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
                    {profiles.map(p => {
                      const isActive = p.id === activeProfileId;
                      return (
                        <div 
                          key={p.id} 
                          onClick={() => switchProfile(p.id)}
                          style={{ position: 'relative', background: 'var(--card-bg)', border: isActive ? '2px solid var(--accent-pink)' : '1px solid var(--border-color)', padding: '16px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', minWidth: '180px', transition: 'all 0.15s ease' }}
                        >
                          <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: p.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>
                            {p.displayName.charAt(0).toUpperCase()}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', gap: '4px' }} className="truncate">
                              {p.displayName}
                              {p.passcode && <span style={{ color: 'var(--accent-pink)', display: 'inline-flex' }}>{Icons.lock}</span>}
                            </div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{p.songsPlayed} streams</span>
                          </div>
                          {profiles.length > 1 && (
                            <button 
                              onClick={(e) => { e.stopPropagation(); deleteProfile(p.id); }} 
                              style={{ marginLeft: 'auto', color: '#f87171', padding: '4px', opacity: 0.6 }}
                              title="Delete Profile"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      );
                    })}
                    <button
                      onClick={() => setShowCreateProfileDialog(true)}
                      style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed var(--border-color)', borderRadius: '12px', padding: '16px', minWidth: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', color: 'var(--text-secondary)' }}
                    >
                      <span>+ Create Profile</span>
                    </button>
                  </div>

                  {/* ── Server Accounts & Cloud Sync ── */}
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '32px 0 16px 0', fontFamily: 'Outfit, sans-serif', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    🌐 Cloud Sync & Server Accounts
                    {cloudUser && <span style={{ fontSize: '0.75rem', background: 'rgba(52, 211, 153, 0.1)', color: '#34d399', padding: '2px 8px', borderRadius: '12px', border: '1px solid rgba(52, 211, 153, 0.2)' }}>Connected</span>}
                  </h3>
                  
                  <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '24px', marginBottom: '32px' }}>
                    {cloudUser ? (
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                          <div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Logged in as</div>
                            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>{cloudUser.email}</div>
                          </div>
                          <button className="btn btn--ghost" onClick={handleLogout} style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                            Sign Out
                          </button>
                        </div>

                        {isLocalDbFallback && (
                          <div style={{ background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.2)', padding: '12px', borderRadius: '8px', color: '#60a5fa', fontSize: '0.85rem', marginBottom: '16px', lineHeight: 1.4 }}>
                            💾 <strong>Local File Account:</strong> Signed in using backend local fallback storage (`local_db.json`). Syncing works locally! Setup a DATABASE_URL to connect to the cloud.
                          </div>
                        )}

                        {dbError && (
                          <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '12px', borderRadius: '8px', color: '#f87171', fontSize: '0.85rem', marginBottom: '16px' }}>
                            ⚠️ {dbError} Please make sure DATABASE_URL is configured in your `.env` file and run `pnpm db:push` to enable full cloud backup!
                          </div>
                        )}

                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                          <button 
                            className="btn btn--primary" 
                            onClick={() => syncWithCloud()} 
                            disabled={syncingStatus === 'syncing'}
                            style={{ padding: '10px 20px', fontSize: '0.85rem' }}
                          >
                            {syncingStatus === 'syncing' ? 'Syncing...' : 'Sync Data Now'}
                          </button>
                          
                          {syncingStatus === 'success' && (
                            <span style={{ color: '#34d399', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              ✓ Synchronized successfully with the database!
                            </span>
                          )}
                          {syncingStatus === 'error' && !dbError && (
                            <span style={{ color: '#f87171', fontSize: '0.85rem' }}>
                              ⚠️ Sync failed. Please check server logs.
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0 0 20px 0', lineHeight: 1.5 }}>
                          Connect your Spice account to synchronize your custom playlists, liked tracks, and listening history with a secure backend database. 
                        </p>

                        {!dbError && (
                          <div style={{ background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.2)', padding: '12px', borderRadius: '8px', color: '#60a5fa', fontSize: '0.85rem', marginBottom: '16px', lineHeight: 1.4 }}>
                            💾 <strong>Local Database Active:</strong> Signup and sign-in are enabled via local file storage (`local_db.json`). No external PostgreSQL setup required to start using accounts!
                          </div>
                        )}

                        {dbError && (
                          <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)', padding: '12px', borderRadius: '8px', color: '#fbbf24', fontSize: '0.85rem', marginBottom: '16px', lineHeight: 1.4 }}>
                            <strong>Database Configuration Pending:</strong><br />
                            Define `DATABASE_URL` in `apps/backend/.env` and run migrations to unlock cloud accounts on your machine!
                          </div>
                        )}

                        {authError && (
                          <div style={{ color: '#f87171', fontSize: '0.8rem', marginBottom: '16px' }}>⚠️ {authError}</div>
                        )}

                        <form onSubmit={handleAuthSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', maxWidth: '500px', marginBottom: '16px' }}>
                          <input 
                            type="email" 
                            placeholder="Email address"
                            value={authEmail}
                            onChange={(e) => setAuthEmail(e.target.value)}
                            style={{ gridColumn: 'span 2', padding: '10px 14px', background: '#0a0a0a', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#fff', outline: 'none', fontSize: '0.85rem' }}
                            required
                          />
                          <input 
                            type="password" 
                            placeholder="Password (min 6 chars)"
                            value={authPassword}
                            onChange={(e) => setAuthPassword(e.target.value)}
                            style={{ gridColumn: 'span 2', padding: '10px 14px', background: '#0a0a0a', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#fff', outline: 'none', fontSize: '0.85rem' }}
                            required
                          />

                          <button 
                            type="submit" 
                            className="btn btn--primary" 
                            disabled={authLoading}
                            style={{ padding: '10px', fontSize: '0.85rem' }}
                          >
                            {authLoading ? 'Please wait...' : authMode === 'login' ? 'Sign In' : 'Register Account'}
                          </button>

                          <button 
                            type="button" 
                            className="btn btn--ghost" 
                            onClick={() => {
                              setAuthMode(authMode === 'login' ? 'register' : 'login');
                              setAuthError(null);
                            }}
                            style={{ padding: '10px', fontSize: '0.85rem', background: 'rgba(255,255,255,0.02)' }}
                          >
                            Switch to {authMode === 'login' ? 'Register' : 'Login'}
                          </button>
                        </form>
                      </div>
                    )}
                  </div>

                  {/* Playlist Transfer dashboard */}
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '40px 0 16px 0', fontFamily: 'Outfit, sans-serif' }}>Playlist Transfer Dashboard</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
                    
                    {/* YouTube/YouTube Music Import */}
                    <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '20px' }}>
                      <h4 style={{ margin: '0 0 8px 0', color: '#fff' }}>YouTube / YT Music Importer</h4>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: '0 0 16px 0', lineHeight: 1.4 }}>
                        Transfer any public YouTube or YouTube Music playlist directly. Spice will query tracks and import them dynamically.
                      </p>
                      
                      <input 
                        type="text"
                        placeholder="https://music.youtube.com/playlist?list=PL..."
                        value={ytPlaylistLink}
                        onChange={(e) => setYtPlaylistLink(e.target.value)}
                        style={{ width: '100%', padding: '10px 14px', background: '#0a0a0a', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#fff', outline: 'none', fontSize: '0.85rem', marginBottom: '12px' }}
                      />

                      {playlistImportError && (
                        <div style={{ color: '#f87171', fontSize: '0.75rem', marginBottom: '12px' }}>⚠️ {playlistImportError}</div>
                      )}
                      {playlistImportSuccess && (
                        <div style={{ color: '#34d399', fontSize: '0.75rem', marginBottom: '12px' }}>✓ {playlistImportSuccess}</div>
                      )}

                      <button 
                        className="btn btn--primary" 
                        onClick={importYouTubePlaylist}
                        disabled={isImportingPlaylist}
                        style={{ width: '100%', padding: '8px 16px', fontSize: '0.85rem' }}
                      >
                        {isImportingPlaylist ? 'Importing Playlist...' : 'Fetch & Import Playlist'}
                      </button>
                    </div>

                    {/* JSON backups */}
                    <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '20px' }}>
                      <h4 style={{ margin: '0 0 8px 0', color: '#fff' }}>Universal JSON Sync</h4>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: '0 0 16px 0', lineHeight: 1.4 }}>
                        Backup all playlists, likes, and history as a secure JSON payload to manually synchronize databases across devices.
                      </p>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <button className="btn btn--ghost" onClick={downloadBackupFile} style={{ width: '100%', padding: '8px 16px', fontSize: '0.85rem' }}>
                          💾 Download Backup File (.json)
                        </button>
                        <button className="btn btn--ghost" onClick={copyBackupToClipboard} style={{ width: '100%', padding: '8px 16px', fontSize: '0.85rem' }}>
                          📋 Copy Backup to Clipboard
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Restore from JSON backup */}
                  <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '20px', marginBottom: '40px' }}>
                    <h4 style={{ margin: '0 0 8px 0', color: '#fff' }}>Restore / Merge Profile Backup</h4>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: '0 0 12px 0' }}>
                      Paste a JSON database payload below and select Merge to restore your playlists, favorite tracks, and playback history.
                    </p>
                    <textarea 
                      placeholder="Paste backup JSON code..."
                      value={jsonImportText}
                      onChange={(e) => setJsonImportText(e.target.value)}
                      style={{ width: '100%', height: '80px', padding: '10px 14px', background: '#0a0a0a', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#fff', outline: 'none', resize: 'none', fontFamily: 'monospace', fontSize: '0.75rem', marginBottom: '16px' }}
                    />
                    <button className="btn btn--primary" onClick={restoreBackupData} style={{ padding: '8px 24px', fontSize: '0.85rem' }}>
                      Restore Profile Backup
                    </button>
                  </div>

                  {/* Profile Customizations */}
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '24px 0 16px 0', fontFamily: 'Outfit, sans-serif' }}>Profile Settings & Passcode</h3>
                  {isEditingProfile ? (
                    <form onSubmit={saveProfile} style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', padding: '24px', borderRadius: '16px' }}>
                      <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '20px', color: '#fff' }}>Edit profile: {activeProfile.displayName}</h4>
                      
                      <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Display Name</label>
                        <input 
                          type="text" 
                          value={editName} 
                          onChange={(e) => setEditName(e.target.value)} 
                          placeholder="DisplayName..."
                          style={{ width: '100%', padding: '10px 14px', background: '#0a0a0a', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#fff', outline: 'none' }}
                          required
                        />
                      </div>

                      <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Passcode Protection (4 digits - optional)</label>
                        <input 
                          type="password" 
                          maxLength={4}
                          value={editPasscode} 
                          onChange={(e) => setEditPasscode(e.target.value.replace(/\D/g, ''))} 
                          placeholder="e.g. 1234"
                          style={{ width: '100%', padding: '10px 14px', background: '#0a0a0a', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#fff', outline: 'none', letterSpacing: '0.2em' }}
                        />
                        {activeProfile.passcode && (
                          <button type="button" onClick={removePasscodeFromActive} style={{ color: '#f87171', fontSize: '0.75rem', marginTop: '6px', cursor: 'pointer' }}>
                            Clear Passcode
                          </button>
                        )}
                      </div>

                      <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Short Biography</label>
                        <textarea 
                          value={editBio} 
                          onChange={(e) => setEditBio(e.target.value)} 
                          placeholder="About you..."
                          style={{ width: '100%', height: '80px', padding: '10px 14px', background: '#0a0a0a', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#fff', outline: 'none', resize: 'none' }}
                        />
                      </div>

                      <div style={{ marginBottom: '24px' }}>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>Avatar Color Accent</label>
                        <div style={{ display: 'flex', gap: '12px' }}>
                          {PRESET_GRADIENTS.map((g, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setEditGradient(g)}
                              style={{ width: '32px', height: '32px', borderRadius: '50%', background: g, border: editGradient === g ? '2px solid #fff' : 'none', cursor: 'pointer', outline: 'none', boxShadow: editGradient === g ? '0 0 10px rgba(255,255,255,0.4)' : 'none' }}
                            />
                          ))}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                        <button type="button" className="btn btn--ghost" onClick={() => setIsEditingProfile(false)}>Cancel</button>
                        <button type="submit" className="btn btn--primary">Save Changes</button>
                      </div>
                    </form>
                  ) : (
                    <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', padding: '24px', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>Configure profile credentials, avatar colors, or password locks.</p>
                      <button className="btn btn--primary" onClick={() => {
                        setEditName(activeProfile.displayName);
                        setEditBio(activeProfile.bio);
                        setEditGradient(activeProfile.gradient);
                        setEditPasscode(activeProfile.passcode || '');
                        setIsEditingProfile(true);
                      }}>
                        Edit Profile Details
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ── Settings Tab Page ── */}
              {currentPage === 'settings' && (
                <div className="animate-in" style={{ maxWidth: '720px', margin: '0 auto' }}>
                  <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '2rem', fontWeight: 800, marginBottom: '24px' }}>Application Settings</h1>

                  {/* Theme Accent Settings */}
                  <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', fontWeight: 700, color: '#fff', fontFamily: 'Outfit, sans-serif' }}>🎨 Global Accent Colors</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0 0 20px 0', lineHeight: 1.4 }}>
                      Select a dynamic accent theme color to instantly paint application highlights, glow animations, button hovers, and dividers.
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
                      {[
                        { id: 'pink', name: 'Neon Spice (Pink)', color: '#ec4899', gradient: 'linear-gradient(135deg, #a855f7, #ec4899)' },
                        { id: 'blue', name: 'Ocean Breeze (Blue)', color: '#3b82f6', gradient: 'linear-gradient(135deg, #06b6d4, #3b82f6)' },
                        { id: 'orange', name: 'Solar Fire (Orange)', color: '#f97316', gradient: 'linear-gradient(135deg, #f97316, #ef4444)' },
                        { id: 'green', name: 'Jade Emerald (Green)', color: '#10b981', gradient: 'linear-gradient(135deg, #10b981, #059669)' },
                        { id: 'gold', name: 'Imperial Gold (Gold)', color: '#f59e0b', gradient: 'linear-gradient(135deg, #f59e0b, #d97706)' }
                      ].map((t) => {
                        const isCurrent = accentTheme === t.id;
                        return (
                          <div 
                            key={t.id}
                            onClick={() => {
                              setAccentTheme(t.id as any);
                              localStorage.setItem('spice_accent_theme', t.id);
                            }}
                            style={{ background: 'var(--body-bg)', border: isCurrent ? `2px solid ${t.color}` : '1px solid var(--border-color)', padding: '16px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', minWidth: '180px', flex: '1 1 auto', transition: 'all 0.15s ease' }}
                          >
                            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: t.gradient, flexShrink: 0, boxShadow: isCurrent ? `0 0 10px ${t.color}` : 'none' }}></div>
                            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: isCurrent ? t.color : '#fff' }}>{t.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Audio Settings */}
                  <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', fontWeight: 700, color: '#fff', fontFamily: 'Outfit, sans-serif' }}>🎧 Audio & Streaming Preferences</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0 0 20px 0', lineHeight: 1.4 }}>
                      Fine-tune streaming codecs and bitrates to match your current network speed or data constraints.
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Audio Playback Quality</label>
                        <select 
                          value={audioQuality} 
                          onChange={(e) => {
                            setAudioQuality(e.target.value as any);
                            localStorage.setItem('spice_audio_quality', e.target.value);
                          }}
                          style={{ width: '100%', padding: '10px 14px', background: '#0a0a0a', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#fff', outline: 'none', cursor: 'pointer' }}
                        >
                          <option value="high">High Definition (256kbps AAC)</option>
                          <option value="standard">Standard Balanced (128kbps OPUS)</option>
                          <option value="low">Data Saver (64kbps OPUS)</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Stream Endpoint Transport</label>
                        <select 
                          value={streamProtocol} 
                          onChange={(e) => {
                            setStreamProtocol(e.target.value as any);
                            localStorage.setItem('spice_stream_protocol', e.target.value);
                          }}
                          style={{ width: '100%', padding: '10px 14px', background: '#0a0a0a', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#fff', outline: 'none', cursor: 'pointer' }}
                        >
                          <option value="proxy">Signed Direct Audio Proxy (Recommended)</option>
                          <option value="web">YouTube InnerTube Web Stream (Attestation)</option>
                          <option value="embed">YouTube Embedded Player (Fallback)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Player View & Position Settings */}
                  <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', fontWeight: 700, color: '#fff', fontFamily: 'Outfit, sans-serif' }}>🖥️ Player Layout & Viewing Options</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0 0 20px 0', lineHeight: 1.4 }}>
                      Customize the now-playing bar placement, open the immersive full-screen player, or collapse it into a floating picture-in-picture widget.
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Player Placement</label>
                        <select 
                          value={playerPlacement} 
                          onChange={(e) => {
                            setPlayerPlacement(e.target.value as any);
                            localStorage.setItem('spice_player_placement', e.target.value);
                          }}
                          style={{ width: '100%', padding: '10px 14px', background: '#0a0a0a', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#fff', outline: 'none', cursor: 'pointer' }}
                        >
                          <option value="bottom">Bottom Docked (Default)</option>
                          <option value="top">Top Header Docked</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Player View Mode</label>
                        <select 
                          value={playerViewMode} 
                          onChange={(e) => {
                            setPlayerViewMode(e.target.value as any);
                            localStorage.setItem('spice_player_view_mode', e.target.value);
                          }}
                          style={{ width: '100%', padding: '10px 14px', background: '#0a0a0a', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#fff', outline: 'none', cursor: 'pointer' }}
                        >
                          <option value="bar">Classic Now-Playing Bar</option>
                          <option value="expanded">Immersive Full-Screen Player</option>
                          <option value="mini">Floating Mini Player Widget</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Cache & Safety Controls */}
                  <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', fontWeight: 700, color: '#fff', fontFamily: 'Outfit, sans-serif' }}>🧹 Caches & System Integrity</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0 0 20px 0', lineHeight: 1.4 }}>
                      Reset local session states, clear playback history logs, or completely purge LocalStorage profile registries with a single command.
                    </p>
                    
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                      <button 
                        className="btn btn--ghost" 
                        onClick={() => {
                          if (confirm('Are you sure you want to clear your local database caches? All custom settings will revert to default.')) {
                            localStorage.clear();
                            alert('Local database caches cleared successfully! Reloading...');
                            window.location.reload();
                          }
                        }}
                        style={{ padding: '8px 16px', fontSize: '0.85rem', borderColor: '#f87171', color: '#f87171' }}
                      >
                        Reset Local Database Registry
                      </button>
                      <button 
                        className="btn btn--ghost" 
                        onClick={() => {
                          if (confirm('Clear entire active listening history logs?')) {
                            setHistory([]);
                            updateActiveProfileData({ history: [] });
                            alert('Active history logs cleared.');
                          }
                        }}
                        style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                      >
                        Purge Playback History Logs
                      </button>
                    </div>
                  </div>

                  {/* System diagnostics & Monospace Live Log Terminal */}
                  <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '24px', marginBottom: '40px', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                      <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#fff', fontFamily: 'Outfit, sans-serif', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        🛠️ System Diagnostics & Live Terminal
                      </h3>
                      <span style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary)', padding: '4px 10px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                        Spice Media Core v1.0.5 (Phase 4 Diagnostics)
                      </span>
                    </div>

                    {/* Diagnostics Status Cards Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', marginBottom: '24px' }}>
                      {/* InnerTube API Card */}
                      <div style={{ background: '#070707', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>InnerTube API</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: selfTestRunning ? '#fb923c' : (selfTestResults.api === 'passed' ? '#4ade80' : (selfTestResults.api === 'failed' ? '#f87171' : '#52525b')),
                            boxShadow: selfTestRunning ? '0 0 8px #fb923c' : (selfTestResults.api === 'passed' ? '0 0 8px #4ade80' : (selfTestResults.api === 'failed' ? '0 0 8px #f87171' : 'none')),
                            animation: selfTestRunning ? 'blink 0.8s ease infinite alternate' : 'none'
                          }}></div>
                          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: selfTestRunning ? '#fb923c' : (selfTestResults.api === 'passed' ? '#4ade80' : (selfTestResults.api === 'failed' ? '#f87171' : '#a1a1aa')) }}>
                            {selfTestRunning ? 'ATTUNING' : (selfTestResults.api === 'passed' ? 'ONLINE (200)' : (selfTestResults.api === 'failed' ? 'ERROR / BAN' : 'UNTESTED'))}
                          </span>
                        </div>
                      </div>

                      {/* Neon DB Sync Card */}
                      <div style={{ background: '#070707', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Neon Cloud Sync</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: selfTestRunning ? '#fb923c' : (selfTestResults.db === 'passed' ? '#4ade80' : (selfTestResults.db === 'disabled' ? '#fb923c' : (selfTestResults.db === 'failed' ? '#f87171' : '#52525b'))),
                            boxShadow: selfTestRunning ? '0 0 8px #fb923c' : (selfTestResults.db === 'passed' ? '0 0 8px #4ade80' : (selfTestResults.db === 'disabled' ? '0 0 8px #fb923c' : (selfTestResults.db === 'failed' ? '0 0 8px #f87171' : 'none'))),
                            animation: selfTestRunning ? 'blink 0.8s ease infinite alternate' : 'none'
                          }}></div>
                          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: selfTestRunning ? '#fb923c' : (selfTestResults.db === 'passed' ? '#4ade80' : (selfTestResults.db === 'disabled' ? '#fb923c' : (selfTestResults.db === 'failed' ? '#f87171' : '#a1a1aa'))) }}>
                            {selfTestRunning ? 'CONNECTING' : (selfTestResults.db === 'passed' ? 'CONNECTED' : (selfTestResults.db === 'disabled' ? 'LOCAL PWA' : (selfTestResults.db === 'failed' ? 'SYNC ERROR' : 'UNTESTED')))}
                          </span>
                        </div>
                      </div>

                      {/* Latency Meter Card */}
                      <div style={{ background: '#070707', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Diagnostic Ping</span>
                        <span style={{
                          fontSize: '0.9rem',
                          fontWeight: 800,
                          color: !selfTestResults.latency ? '#a1a1aa' : (selfTestResults.latency < 250 ? '#4ade80' : (selfTestResults.latency < 600 ? '#fb923c' : '#f87171'))
                        }}>
                          {selfTestResults.latency ? `${selfTestResults.latency} ms` : '-- ms'}
                        </span>
                      </div>

                      {/* Stream Protocol Context Card */}
                      <div style={{ background: '#070707', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Active Transport</span>
                        <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#22d3ee' }}>
                          {streamProtocol === 'proxy' ? 'PROXY' : (streamProtocol === 'web' ? 'ATTESTATION' : 'EMBED')}
                        </span>
                      </div>
                    </div>

                    {/* Terminal controls row */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <button
                          className="btn btn--primary"
                          onClick={runSelfTest}
                          disabled={selfTestRunning}
                          style={{
                            padding: '8px 16px',
                            fontSize: '0.85rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            borderColor: selfTestRunning ? '#52525b' : 'var(--accent-pink)',
                            background: selfTestRunning ? 'rgba(255,255,255,0.02)' : 'var(--accent-gradient)',
                            opacity: selfTestRunning ? 0.7 : 1,
                            cursor: selfTestRunning ? 'not-allowed' : 'pointer'
                          }}
                        >
                          {selfTestRunning ? (
                            <>
                              <svg className="animate-spin" style={{ width: '14px', height: '14px', marginRight: '4px', fill: 'none', stroke: '#fff', strokeWidth: 2 }} viewBox="0 0 24 24">
                                <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.2)"></circle>
                                <path d="M4 12a8 8 0 018-8v8H4z" fill="#fff"></path>
                              </svg>
                              Running Attestation...
                            </>
                          ) : 'Run Full Diagnostics'}
                        </button>

                        <button
                          className="btn btn--ghost"
                          onClick={() => {
                            navigator.clipboard.writeText(debugLogs.join('\n'));
                            setLogsCopied(true);
                            setTimeout(() => setLogsCopied(false), 2000);
                          }}
                          style={{ padding: '8px 16px', fontSize: '0.85rem', color: logsCopied ? '#4ade80' : '#fff', borderColor: logsCopied ? '#4ade80' : 'var(--border-color)' }}
                        >
                          {logsCopied ? '✓ Copied Logs' : 'Copy Logs'}
                        </button>

                        <button
                          className="btn btn--ghost"
                          onClick={() => setDebugLogs([])}
                          style={{ padding: '8px 16px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}
                        >
                          Clear
                        </button>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {/* Auto scroll toggle checkbox */}
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          <input
                            type="checkbox"
                            checked={terminalAutoScroll}
                            onChange={(e) => setTerminalAutoScroll(e.target.checked)}
                            style={{ cursor: 'pointer', accentColor: 'var(--accent-pink)' }}
                          />
                          Auto-Scroll
                        </label>

                        {/* Search / Filter input */}
                        <input
                          type="text"
                          placeholder="Filter logs..."
                          value={terminalFilter}
                          onChange={(e) => setTerminalFilter(e.target.value)}
                          style={{
                            padding: '8px 12px',
                            background: '#0a0a0a',
                            border: '1px solid var(--border-color)',
                            borderRadius: '8px',
                            fontSize: '0.8rem',
                            color: '#fff',
                            outline: 'none',
                            width: '160px',
                            transition: 'all 0.15s ease'
                          }}
                        />
                      </div>
                    </div>

                    {/* Cyber Terminal Window */}
                    <div style={{
                      background: '#030303',
                      border: '1px solid var(--border-color)',
                      borderRadius: '12px',
                      padding: '16px',
                      height: '240px',
                      overflowY: 'auto',
                      fontFamily: 'Consolas, Menlo, Monaco, "Courier New", monospace',
                      fontSize: '0.75rem',
                      lineHeight: 1.5,
                      boxShadow: 'inset 0 4px 20px rgba(0, 0, 0, 0.8)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px'
                    }}>
                      {/* Filter logic */}
                      {(() => {
                        const logs = debugLogs.filter(log =>
                          log.toLowerCase().includes(terminalFilter.toLowerCase())
                        );

                        if (logs.length === 0) {
                          return (
                            <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', padding: '8px 0' }}>
                              -- No matching trace logs. Console active and waiting. --
                            </div>
                          );
                        }

                        return logs.map((log, index) => {
                          // Extract timestamp, category, and message
                          // e.g. [12:04:12 PM] [SYSTEM] Loaded active profile
                          const timestampMatch = log.match(/^\[(.*?)\]/);
                          const categoryMatch = log.match(/\]\s*\[(SYSTEM|PLAYER|STREAM|DATABASE|AUTH|DIAGNOSTICS|ERROR)\]/i);
                          
                          let timestamp = '';
                          let category = 'SYSTEM';
                          let message = log;

                          if (timestampMatch) {
                            timestamp = timestampMatch[0];
                            message = message.substring(timestampMatch[0].length).trim();
                          }

                          if (categoryMatch) {
                            category = categoryMatch[1].toUpperCase();
                            // remove the [CATEGORY] part from message
                            message = message.replace(`[${categoryMatch[1]}]`, '').trim();
                          }

                          // Get category colors
                          let categoryColor = '#cbd5e1'; // slate/white
                          let glowStyle = {};
                          if (category === 'PLAYER') {
                            categoryColor = '#22d3ee'; // cyan
                          } else if (category === 'STREAM') {
                            categoryColor = '#e879f9'; // purple/pink
                          } else if (category === 'DATABASE') {
                            categoryColor = '#fb923c'; // orange
                          } else if (category === 'AUTH') {
                            categoryColor = '#34d399'; // emerald
                          } else if (category === 'DIAGNOSTICS') {
                            categoryColor = '#4ade80'; // lime
                            glowStyle = { textShadow: '0 0 4px rgba(74, 222, 128, 0.4)' };
                          } else if (category === 'ERROR') {
                            categoryColor = '#f87171'; // red
                            glowStyle = { textShadow: '0 0 6px rgba(248, 113, 113, 0.6)', animation: 'blink 1.5s infinite alternate' };
                          }

                          return (
                            <div key={index} style={{ display: 'flex', gap: '8px', wordBreak: 'break-all', alignItems: 'flex-start' }}>
                              <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>{timestamp}</span>
                              <span style={{ color: categoryColor, fontWeight: 700, flexShrink: 0, ...glowStyle }}>
                                [{category}]
                              </span>
                              <span style={{ color: category === 'ERROR' ? '#f87171' : 'var(--text-primary)', ...glowStyle }}>
                                {message}
                              </span>
                            </div>
                          );
                        });
                      })()}
                      
                      {/* Anchor element for scrolling + blinking cursor */}
                      <div ref={terminalEndRef} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                        <span style={{ color: '#4ade80', fontWeight: 700 }}>spice-core@diagnostics ~ %</span>
                        <div style={{
                          width: '6px',
                          height: '12px',
                          background: '#4ade80',
                          animation: 'blink 1s step-end infinite',
                          boxShadow: '0 0 6px #4ade80'
                        }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

        </div>
      </main>

      {/* ═══ Create Custom Playlist Dialog ═══ */}
      {showCreateDialog && (
        <div className="dialog-overlay" onClick={() => setShowCreateDialog(false)}>
          <div className="dialog-box" onClick={(e) => e.stopPropagation()}>
            <h2>Create Playlist</h2>
            <form onSubmit={createPlaylist}>
              <label style={{ fontSize: '0.8rem', color: '#a1a1aa' }}>Playlist Name</label>
              <input
                type="text"
                value={newPlTitle}
                onChange={(e) => setNewPlTitle(e.target.value)}
                placeholder="Spicy selection..."
                required
                autoFocus
              />
              <label style={{ fontSize: '0.8rem', color: '#a1a1aa' }}>Description (optional)</label>
              <input
                type="text"
                value={newPlDesc}
                onChange={(e) => setNewPlDesc(e.target.value)}
                placeholder="Late night vibe compiles..."
              />
              <div className="dialog-box__actions">
                <button type="button" className="btn btn--ghost" style={{ padding: '8px 16px' }} onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn--primary" style={{ padding: '8px 16px' }}>
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ Create Profile Dialog ═══ */}
      {showCreateProfileDialog && (
        <div className="dialog-overlay" onClick={() => setShowCreateProfileDialog(false)}>
          <div className="dialog-box" onClick={(e) => e.stopPropagation()}>
            <h2>Create Spice Profile</h2>
            <form onSubmit={createProfile}>
              <label style={{ fontSize: '0.8rem', color: '#a1a1aa' }}>Profile Name</label>
              <input
                type="text"
                value={newProfileName}
                onChange={(e) => setNewProfileName(e.target.value)}
                placeholder="e.g. Study, Razvan"
                required
                autoFocus
              />
              <label style={{ fontSize: '0.8rem', color: '#a1a1aa' }}>Short Bio (optional)</label>
              <input
                type="text"
                value={newProfileBio}
                onChange={(e) => setNewProfileBio(e.target.value)}
                placeholder="Study sessions..."
              />
              <label style={{ fontSize: '0.8rem', color: '#a1a1aa' }}>Optional 4-Digit Passcode Protection</label>
              <input
                type="password"
                maxLength={4}
                value={newProfilePasscode}
                onChange={(e) => setNewProfilePasscode(e.target.value.replace(/\D/g, ''))}
                placeholder="Leave blank for no password"
                style={{ letterSpacing: '0.2em' }}
              />

              <label style={{ fontSize: '0.8rem', color: '#a1a1aa', marginTop: '12px', display: 'block' }}>Select Accent Color</label>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                {PRESET_GRADIENTS.map((g, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setNewProfileGradient(g)}
                    style={{ width: '28px', height: '28px', borderRadius: '50%', background: g, border: newProfileGradient === g ? '2px solid #fff' : 'none', cursor: 'pointer', outline: 'none' }}
                  />
                ))}
              </div>

              <div className="dialog-box__actions">
                <button type="button" className="btn btn--ghost" style={{ padding: '8px 16px' }} onClick={() => setShowCreateProfileDialog(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn--primary" style={{ padding: '8px 16px' }}>
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* ═══ Queue Drawer ═══ */}
      {showQueueDrawer && (
        <div className="queue-drawer animate-in" style={{ position: 'fixed', right: '24px', bottom: '96px', width: '320px', maxHeight: '420px', background: 'rgba(10, 10, 10, 0.95)', border: '1px solid var(--border-color)', borderRadius: '16px', backdropFilter: 'blur(20px)', zIndex: 99, padding: '20px', display: 'flex', flexDirection: 'column', boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
            <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, fontFamily: 'Outfit, sans-serif' }}>Play Queue</h4>
            <button onClick={() => setShowQueueDrawer(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1rem' }}>✕</button>
          </div>
          <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '280px', paddingRight: '4px' }} className="custom-scrollbar">
            {queue.map((song, idx) => {
              const isActive = idx === queueIndex;
              return (
                <div 
                  key={`${song.id}-${idx}`}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px', borderRadius: '8px', background: isActive ? 'rgba(255,255,255,0.06)' : 'transparent', border: isActive ? '1px solid var(--accent-pink)' : '1px solid transparent', cursor: 'pointer', transition: 'all 0.15s ease' }}
                  onClick={() => playTrack(song)}
                >
                  <img src={song.artworkUrl || '/icon.svg'} alt="" style={{ width: '36px', height: '36px', borderRadius: '4px', objectFit: 'cover' }} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: isActive ? 'var(--accent-pink)' : '#fff' }} className="truncate">{song.title}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }} className="truncate">{song.artists.map(a => a.name).join(', ')}</div>
                  </div>
                  {queue.length > 1 && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        const newQ = [...queue];
                        newQ.splice(idx, 1);
                        setQueue(newQ);
                        if (queueIndex >= newQ.length) {
                          setQueueIndex(Math.max(0, newQ.length - 1));
                        }
                      }}
                      style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', opacity: 0.6, fontSize: '0.8rem' }}
                      title="Remove from queue"
                    >
                      ✕
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: '12px', display: 'flex', gap: '8px', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
            <button className="btn btn--ghost" style={{ padding: '4px 8px', fontSize: '0.75rem' }} onClick={() => {
              setQueue([currentTrack]);
              setQueueIndex(0);
            }}>
              Clear Queue
            </button>
          </div>
        </div>
      )}

      {/* ═══ Now Playing Bar Panel ═══ */}
      <footer className="now-playing">
        {/* Left: playback controls */}
        <div className="now-playing__left-controls" style={{ gap: '12px' }}>
          <button 
            className="now-playing__btn" 
            onClick={() => {
              setIsShuffle(!isShuffle);
              localStorage.setItem('spice_is_shuffle', (!isShuffle).toString());
            }}
            style={{ color: isShuffle ? 'var(--accent-pink)' : 'var(--text-secondary)', fontSize: '1rem', outline: 'none', transition: 'all 0.15s ease' }}
            title="Shuffle"
          >
            🔀
          </button>
          
          <button className="now-playing__btn" onClick={handlePrev} aria-label="Previous">
            {Icons.prev}
          </button>
          
          <button className="now-playing__btn now-playing__btn--play" onClick={togglePlayPause} aria-label={isPlaying ? 'Pause' : 'Play'}>
            {isPlaying ? Icons.pause : Icons.play}
          </button>
          
          <button className="now-playing__btn" onClick={handleNext} aria-label="Next">
            {Icons.next}
          </button>

          <button 
            className="now-playing__btn" 
            onClick={() => {
              const nextMode = repeatMode === 'none' ? 'all' : repeatMode === 'all' ? 'one' : 'none';
              setRepeatMode(nextMode);
              localStorage.setItem('spice_repeat_mode', nextMode);
            }}
            style={{ color: repeatMode !== 'none' ? 'var(--accent-pink)' : 'var(--text-secondary)', fontSize: '1rem', outline: 'none', transition: 'all 0.15s ease' }}
            title={`Repeat Mode: ${repeatMode === 'none' ? 'Off' : repeatMode === 'all' ? 'Repeat All' : 'Repeat One'}`}
          >
            {repeatMode === 'one' ? '🔂' : '🔁'}
          </button>
          
          <button
            className={`now-playing__like ${likedTracks.has(currentTrack.id) ? 'liked' : ''}`}
            onClick={() => toggleLike(currentTrack)}
            aria-label="Like"
          >
            {likedTracks.has(currentTrack.id) ? Icons.heartFilled : Icons.heart}
          </button>
        </div>

        {/* Center: song info & seek slider */}
        <div style={{ display: 'flex', alignItems: 'center', minWidth: 0, width: '100%' }}>
          <div className="now-playing__song" onClick={() => { setPlayerViewMode('expanded'); localStorage.setItem('spice_player_view_mode', 'expanded'); }} style={{ cursor: 'pointer' }} title="Expand Player View">
            <img className="now-playing__art" src={currentTrack.artworkUrl || '/icon.svg'} alt={currentTrack.title} />
            <div className="now-playing__info">
              <span className="now-playing__title truncate">{currentTrack.title}</span>
              <span className="now-playing__artist truncate">{currentTrack.artists.map(a => a.name).join(', ')}</span>
            </div>
            
            {/* Animative waveform */}
            <div className={`now-playing__waveform ${!isPlaying ? 'paused' : ''}`}>
              <div className="now-playing__waveform-bar"></div>
              <div className="now-playing__waveform-bar"></div>
              <div className="now-playing__waveform-bar"></div>
              <div className="now-playing__waveform-bar"></div>
              <div className="now-playing__waveform-bar"></div>
            </div>
          </div>

          <div className="now-playing__seek">
            <span>{formatTime(progress)}</span>
            <div className="now-playing__seek-track" onClick={handleSeek}>
              <div
                className="now-playing__progress-fill"
                style={{ width: `${duration > 0 ? (progress / duration) * 100 : 0}%` }}
              ></div>
            </div>
            <span>{formatTime(duration)}</span>
            {isLoadingStream && <span className="loader-glow">Resolving stream...</span>}
          </div>
        </div>

        {/* Right: volume & queue controls */}
        <div className="now-playing__right-controls" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button 
            className="now-playing__btn" 
            onClick={() => setShowQueueDrawer(!showQueueDrawer)} 
            style={{ color: showQueueDrawer ? 'var(--accent-pink)' : '#fff', padding: '4px', cursor: 'pointer', outline: 'none' }}
            title="Up Next Queue"
          >
            {Icons.list}
          </button>
          
          <button 
            className="now-playing__btn" 
            onClick={() => {
              setPlayerViewMode('mini');
              localStorage.setItem('spice_player_view_mode', 'mini');
            }} 
            style={{ color: '#fff', padding: '4px', cursor: 'pointer', outline: 'none', transition: 'all 0.15s ease' }}
            title="Switch to Floating Mini Player"
          >
            🗗
          </button>
          
          <div className="now-playing__volume">
            <button className="now-playing__volume-btn" onClick={() => setVolume(volume === 0 ? 70 : 0)}>
              {Icons.volume}
            </button>
            <input
              type="range"
              className="now-playing__volume-slider"
              min="0"
              max="100"
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
            />
          </div>
        </div>

        {/* Mobile-only Play/Pause button */}
        <button 
          className="now-playing__mobile-play"
          onClick={(e) => { e.stopPropagation(); togglePlayPause(); }}
          style={{ display: 'none' }}
        >
          {isPlaying ? '❚❚' : '▶'}
        </button>
      </footer>

      {/* ═══ Expanded Player Immersive Full-Screen Overlay ═══ */}
      {playerViewMode === 'expanded' && (
        <div className="expanded-player animate-in" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(6, 6, 6, 0.9)',
          backgroundImage: `radial-gradient(circle at 50% 30%, rgba(var(--accent-pink-rgb, 236, 72, 153), 0.18), transparent 60%)`,
          backdropFilter: 'blur(50px)',
          WebkitBackdropFilter: 'blur(50px)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '40px 24px',
          color: '#fff',
          fontFamily: 'Outfit, sans-serif'
        }}>
          {/* Header */}
          <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '1000px' }}>
            <button 
              onClick={() => {
                setPlayerViewMode('mini');
                localStorage.setItem('spice_player_view_mode', 'mini');
              }}
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '8px 16px', borderRadius: '20px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}
              title="Mini Player"
            >
              🗗 Floating Mini Player
            </button>
            <div style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.2em', opacity: 0.5, fontWeight: 700 }}>Now Playing</div>
            <button 
              onClick={() => {
                setPlayerViewMode('bar');
                localStorage.setItem('spice_player_view_mode', 'bar');
              }}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: '1.75rem', padding: '4px 10px', outline: 'none' }}
              title="Close"
            >
              ✕
            </button>
          </div>

          {/* Central content layout: Grid with artwork + controls, and Optional Playlist Queue/Lyrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 450px) 1fr', gap: '64px', width: '100%', maxWidth: '1000px', flex: 1, alignItems: 'center', margin: '40px 0' }}>
            
            {/* Column 1: Massive Spinning Artwork & Titles */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <div 
                style={{ 
                  width: '360px', 
                  height: '360px', 
                  borderRadius: '24px', 
                  overflow: 'hidden', 
                  position: 'relative', 
                  boxShadow: `0 24px 64px rgba(0,0,0,0.8), 0 0 40px rgba(var(--accent-pink-rgb, 236, 72, 153), 0.25)`, 
                  marginBottom: '32px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  transition: 'transform 0.5s ease'
                }}
                className={isPlaying ? 'vinyl-spin' : ''}
              >
                <img 
                  src={currentTrack.artworkUrl || '/icon.svg'} 
                  alt="" 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                />
              </div>

              <h2 style={{ fontSize: '2rem', fontWeight: 800, margin: '0 0 8px 0', width: '100%', fontFamily: 'Outfit, sans-serif' }} className="truncate">
                {currentTrack.title}
              </h2>
              <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', margin: 0, width: '100%' }} className="truncate">
                {currentTrack.artists.map(a => a.name).join(', ')}
              </p>
            </div>

            {/* Column 2: Immersive Tabbed Controller (Controls / Up Next / Lyrics) */}
            <div style={{ display: 'flex', flexDirection: 'column', height: '420px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '24px', padding: '24px', backdropFilter: 'blur(30px)', width: '100%', minWidth: 0 }}>
              
              {/* Tab headers */}
              <div style={{ display: 'flex', gap: '20px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px', marginBottom: '20px' }}>
                {[
                  { id: 'controls', label: '🎧 Player Controls' },
                  { id: 'queue', label: '🔀 Up Next Queue' },
                  { id: 'lyrics', label: '🎤 Active Lyrics' }
                ].map(t => {
                  const isActive = expandedTab === t.id;
                  return (
                    <button 
                      key={t.id}
                      onClick={() => setExpandedTab(t.id as any)}
                      style={{ 
                        background: 'none', 
                        border: 'none', 
                        color: isActive ? 'var(--accent-pink)' : 'var(--text-secondary)', 
                        fontSize: '0.85rem', 
                        fontWeight: 700, 
                        textTransform: 'uppercase', 
                        letterSpacing: '0.1em', 
                        cursor: 'pointer', 
                        paddingBottom: '8px', 
                        borderBottom: isActive ? '2px solid var(--accent-pink)' : '2px solid transparent', 
                        transition: 'all 0.15s ease',
                        outline: 'none'
                      }}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>

              {/* Tab Content Panels */}
              <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                {expandedTab === 'controls' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {/* Audio visualization mock */}
                    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '60px', width: '100%', padding: '12px 24px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.04)' }}>
                      {[...Array(24)].map((_, i) => {
                        const baseVal = 20 + Math.abs(Math.sin((i + progress) * 0.5)) * 60;
                        const randHeight = isPlaying ? baseVal + Math.abs(Math.sin(i * 12.9898 + progress)) * 20 : 15;
                        return (
                          <div 
                            key={i} 
                            style={{ 
                              width: '3%', 
                              height: `${Math.min(100, Math.max(5, randHeight))}%`, 
                              background: 'var(--accent-pink)', 
                              borderRadius: '4px',
                              transition: 'height 0.1s ease',
                              boxShadow: '0 0 8px var(--accent-pink)'
                            }} 
                          />
                        );
                      })}
                    </div>

                    {/* Progress seeker */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ position: 'relative', height: '8px', width: '100%', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', cursor: 'pointer' }} onClick={handleSeek}>
                        <div 
                          style={{ 
                            position: 'absolute', 
                            left: 0, 
                            top: 0, 
                            bottom: 0, 
                            width: `${duration > 0 ? (progress / duration) * 100 : 0}%`, 
                            background: 'var(--accent-pink)', 
                            borderRadius: '4px',
                            boxShadow: '0 0 10px var(--accent-pink)'
                          }} 
                        />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        <span>{formatTime(progress)}</span>
                        <span>{formatTime(duration)}</span>
                      </div>
                    </div>

                    {/* Huge transport buttons */}
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '32px' }}>
                      <button 
                        onClick={() => {
                          setIsShuffle(!isShuffle);
                          localStorage.setItem('spice_is_shuffle', (!isShuffle).toString());
                        }}
                        style={{ background: 'none', border: 'none', color: isShuffle ? 'var(--accent-pink)' : '#fff', opacity: isShuffle ? 1 : 0.4, cursor: 'pointer', outline: 'none', fontSize: '1.5rem', transition: 'all 0.15s ease' }} 
                        className="expanded-player__btn"
                        title="Shuffle"
                      >
                        🔀
                      </button>

                      <button 
                        onClick={handlePrev} 
                        style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', outline: 'none', transition: 'all 0.15s ease' }} 
                        className="expanded-player__btn"
                      >
                        <span style={{ transform: 'scale(1.5)', display: 'inline-block' }}>{Icons.prev}</span>
                      </button>

                      <button 
                        onClick={togglePlayPause} 
                        style={{ 
                          width: '80px', 
                          height: '80px', 
                          borderRadius: '50%', 
                          background: 'var(--accent-pink)', 
                          border: 'none', 
                          color: '#fff', 
                          cursor: 'pointer', 
                          outline: 'none', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          boxShadow: '0 8px 24px rgba(var(--accent-pink-rgb, 236, 72, 153), 0.4)',
                          transition: 'all 0.15s ease'
                        }}
                        className="expanded-player__btn-play"
                      >
                        <span style={{ transform: 'scale(2.0)', display: 'inline-block' }}>
                          {isPlaying ? Icons.pause : Icons.play}
                        </span>
                      </button>

                      <button 
                        onClick={handleNext} 
                        style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', outline: 'none', transition: 'all 0.15s ease' }} 
                        className="expanded-player__btn"
                      >
                        <span style={{ transform: 'scale(1.5)', display: 'inline-block' }}>{Icons.next}</span>
                      </button>

                      <button 
                        onClick={() => {
                          const nextMode = repeatMode === 'none' ? 'all' : repeatMode === 'all' ? 'one' : 'none';
                          setRepeatMode(nextMode);
                          localStorage.setItem('spice_repeat_mode', nextMode);
                        }}
                        style={{ background: 'none', border: 'none', color: repeatMode !== 'none' ? 'var(--accent-pink)' : '#fff', opacity: repeatMode !== 'none' ? 1 : 0.4, cursor: 'pointer', outline: 'none', fontSize: '1.5rem', transition: 'all 0.15s ease' }} 
                        className="expanded-player__btn"
                        title={`Repeat Mode: ${repeatMode === 'none' ? 'Off' : repeatMode === 'all' ? 'Repeat All' : 'Repeat One'}`}
                      >
                        {repeatMode === 'one' ? '🔂' : '🔁'}
                      </button>
                    </div>

                    {/* Volume and info footer */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                      <button
                        className={`now-playing__like ${likedTracks.has(currentTrack.id) ? 'liked' : ''}`}
                        onClick={() => toggleLike(currentTrack)}
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '10px', borderRadius: '50%', cursor: 'pointer' }}
                      >
                        <span style={{ display: 'inline-flex', transform: 'scale(1.2)' }}>
                          {likedTracks.has(currentTrack.id) ? Icons.heartFilled : Icons.heart}
                        </span>
                      </button>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '180px' }}>
                        <span style={{ opacity: 0.6 }}>{Icons.volume}</span>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={volume}
                          onChange={(e) => setVolume(Number(e.target.value))}
                          style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--accent-pink)' }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {expandedTab === 'queue' && (
                  <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '310px', paddingRight: '4px' }} className="custom-scrollbar">
                      {queue.map((song, idx) => {
                        const isActive = idx === queueIndex;
                        return (
                          <div 
                            key={`${song.id}-${idx}`}
                            onClick={() => playTrack(song)}
                            style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', borderRadius: '12px', background: isActive ? 'rgba(255,255,255,0.06)' : 'transparent', border: isActive ? '1px solid var(--accent-pink)' : '1px solid transparent', cursor: 'pointer', transition: 'all 0.15s ease' }}
                          >
                            <img src={song.artworkUrl || '/icon.svg'} alt="" style={{ width: '40px', height: '40px', borderRadius: '6px', objectFit: 'cover' }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: isActive ? 'var(--accent-pink)' : '#fff' }} className="truncate">{song.title}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }} className="truncate">{song.artists.map(a => a.name).join(', ')}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {expandedTab === 'lyrics' && (
                  <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <div style={{ overflowY: 'auto', flex: 1, maxHeight: '310px', paddingRight: '4px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '16px', padding: '10px 0' }} className="custom-scrollbar">
                      {[
                        `♫ [Instrumental Intro - Spice Audio Engine]`,
                        `♫ Walking through the neon rain...`,
                        `♫ Stream "${currentTrack.title}" in our brains...`,
                        `♫ We feel the beat, we feel the glow,`,
                        `♫ With closed-source player leading the show.`,
                        ``,
                        `♫ [Chorus]`,
                        `♫ Spice is running through our veins,`,
                        `♫ Unlimited tracks, no more chains!`,
                        `♫ Synchronized lyrics on the screen,`,
                        `♫ The premium player you've ever seen!`,
                        ``,
                        `♫ [Verse 2]`,
                        `♫ Slide it up or keep it small,`,
                        `♫ Mini-player handles it all.`,
                        `♫ Spotify, YouTube, Tidal combined,`,
                        `♫ Ultimate hybrid player refined!`,
                        ``,
                        `♫ [Outro]`,
                        `♫ Spice tonight, everything is bright...`,
                        `♫ Sustained playback shining light!`,
                        `♫ [Fading Out]`
                      ].map((line, idx) => {
                        const isEmpty = line.trim() === '';
                        const isChorus = line.includes('[Chorus]');
                        const isInstrumental = line.includes('[Instrumental');
                        
                        return (
                          <div 
                            key={idx} 
                            style={{ 
                              fontSize: isChorus ? '1.15rem' : '1rem', 
                              fontWeight: (isChorus || isInstrumental) ? 800 : 500, 
                              color: isInstrumental ? 'var(--accent-pink)' : isChorus ? '#fff' : 'rgba(255,255,255,0.7)',
                              fontFamily: 'Outfit, sans-serif',
                              lineHeight: 1.4,
                              opacity: isEmpty ? 0 : 1,
                              textShadow: isChorus ? '0 0 10px rgba(255,255,255,0.2)' : 'none',
                              margin: isEmpty ? '8px 0' : '0'
                            }}
                          >
                            {line}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

            </div>

          </div>

          {/* Footer branding */}
          <div style={{ opacity: 0.3, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>Spice Premium Audio Resolution Engine</span>
            <span>•</span>
            <span>PWA v1.0.4</span>
          </div>

        </div>
      )}

      {/* ═══ Floating Mini Player Widget ═══ */}
      {playerViewMode === 'mini' && (
        <div 
          className="mini-player animate-in" 
          onPointerDown={handleMiniPointerDown}
          onPointerMove={handleMiniPointerMove}
          onPointerUp={handleMiniPointerUp}
          style={{
            position: 'fixed',
            left: miniPlayerPos ? `${miniPlayerPos.x}px` : 'auto',
            top: miniPlayerPos ? `${miniPlayerPos.y}px` : 'auto',
            right: miniPlayerPos ? 'auto' : '24px',
            bottom: miniPlayerPos ? 'auto' : '24px',
            width: '340px',
            height: '108px',
            background: 'rgba(10, 10, 10, 0.88)',
            backgroundImage: `radial-gradient(circle at 10% 10%, rgba(var(--accent-pink-rgb, 236, 72, 153), 0.12), transparent 70%)`,
            border: '1px solid var(--border-color)',
            borderRadius: '24px',
            backdropFilter: 'blur(30px)',
            WebkitBackdropFilter: 'blur(30px)',
            boxShadow: '0 16px 48px rgba(0, 0, 0, 0.7), 0 0 20px rgba(var(--accent-pink-rgb, 236, 72, 153), 0.2)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            padding: '14px',
            gap: '12px',
            fontFamily: 'Outfit, sans-serif',
            color: '#fff',
            cursor: isDraggingMini ? 'grabbing' : 'grab',
            userSelect: 'none',
            touchAction: 'none'
          }}
        >
          {/* Artwork */}
          <div 
            style={{ 
              position: 'relative', 
              width: '68px', 
              height: '68px', 
              borderRadius: '16px', 
              overflow: 'hidden', 
              flexShrink: 0, 
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              cursor: 'pointer' 
            }}
            onClick={togglePlayPause}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            <img 
              src={currentTrack.artworkUrl || '/icon.svg'} 
              alt="" 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
            />
            {/* Dynamic Hover Play/Pause overlay */}
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: 0,
              transition: 'opacity 0.2s ease',
            }}
            className="mini-player__art-hover"
            >
              <span style={{ fontSize: '1.25rem' }}>
                {isPlaying ? '❚❚' : '▶'}
              </span>
            </div>
          </div>

          {/* Details & Controls Column */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* Top Row: Song Details & Compact Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#fff', lineHeight: 1.2 }} className="truncate">
                  {currentTrack.title}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }} className="truncate">
                  {currentTrack.artists.map(a => a.name).join(', ')}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => toggleLike(currentTrack)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: likedTracks.has(currentTrack.id) ? 'var(--accent-pink)' : 'rgba(255,255,255,0.4)',
                    cursor: 'pointer',
                    outline: 'none',
                    padding: '4px',
                    fontSize: '0.95rem',
                    transition: 'all 0.15s ease'
                  }}
                  title={likedTracks.has(currentTrack.id) ? 'Unlike' : 'Like'}
                >
                  {likedTracks.has(currentTrack.id) ? '❤️' : '🤍'}
                </button>

                <button
                  onClick={() => setVolume(volume === 0 ? 70 : 0)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'rgba(255,255,255,0.4)',
                    cursor: 'pointer',
                    outline: 'none',
                    padding: '4px',
                    fontSize: '0.95rem',
                    transition: 'all 0.15s ease'
                  }}
                  title={volume === 0 ? 'Unmute' : 'Mute'}
                >
                  {volume === 0 ? '🔇' : '🔊'}
                </button>
              </div>
            </div>

            {/* Bottom Row: Transport controls & view switches */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  onClick={handlePrev}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'rgba(255,255,255,0.6)',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    padding: '4px',
                    outline: 'none',
                    transition: 'color 0.15s'
                  }}
                  title="Previous"
                >
                  ⏮
                </button>

                <button 
                  onClick={togglePlayPause} 
                  style={{ 
                    width: '30px', 
                    height: '30px', 
                    borderRadius: '50%', 
                    background: 'var(--accent-pink)', 
                    border: 'none', 
                    color: '#fff', 
                    cursor: 'pointer', 
                    outline: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(var(--accent-pink-rgb, 236, 72, 153), 0.3)',
                    transition: 'transform 0.15s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <span style={{ fontSize: '0.75rem', display: 'inline-flex' }}>
                    {isPlaying ? '❚❚' : '▶'}
                  </span>
                </button>

                <button
                  onClick={handleNext}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'rgba(255,255,255,0.6)',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    padding: '4px',
                    outline: 'none',
                    transition: 'color 0.15s'
                  }}
                  title="Next"
                >
                  ⏭
                </button>
              </div>

              {/* View Switches */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button 
                  onClick={() => {
                    setPlayerViewMode('expanded');
                    localStorage.setItem('spice_player_view_mode', 'expanded');
                  }}
                  style={{ 
                    background: 'rgba(255,255,255,0.05)', 
                    border: '1px solid rgba(255,255,255,0.1)', 
                    color: 'rgba(255,255,255,0.7)', 
                    width: '28px',
                    height: '28px',
                    borderRadius: '8px', 
                    cursor: 'pointer', 
                    outline: 'none', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    fontSize: '0.8rem',
                    transition: 'all 0.15s ease' 
                  }}
                  title="Expand Player"
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#fff'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
                >
                  ⤢
                </button>

                <button 
                  onClick={() => {
                    setPlayerViewMode('bar');
                    localStorage.setItem('spice_player_view_mode', 'bar');
                  }}
                  style={{ 
                    background: 'none', 
                    border: 'none', 
                    color: 'rgba(255,255,255,0.4)', 
                    cursor: 'pointer', 
                    fontSize: '0.95rem',
                    padding: '4px',
                    outline: 'none',
                    transition: 'color 0.15s' 
                  }}
                  title="Minimize to Bar"
                  onMouseEnter={(e) => e.currentTarget.style.color = '#f87171'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}
                >
                  ✕
                </button>
              </div>
            </div>
          </div>

          {/* Interactive Seek Progress strip at the very bottom */}
          <div 
            onClick={handleMiniPlayerSeek}
            style={{ 
              position: 'absolute', 
              bottom: 0, 
              left: 0, 
              right: 0, 
              height: '4px', 
              background: 'rgba(255,255,255,0.1)', 
              borderBottomLeftRadius: '24px',
              borderBottomRightRadius: '24px',
              overflow: 'hidden',
              cursor: 'pointer',
              transition: 'height 0.15s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.height = '6px'}
            onMouseLeave={(e) => e.currentTarget.style.height = '4px'}
            title="Seek track"
          >
            <div 
              style={{ 
                height: '100%', 
                width: `${duration > 0 ? (progress / duration) * 100 : 0}%`, 
                background: 'var(--accent-pink)',
                transition: 'width 0.1s linear'
              }} 
            />
          </div>

        </div>
      )}
    {/* Mobile Bottom Navigation Bar (Visible only on screens <= 600px via media query) */}
    <div 
      className="mobile-nav-bar"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '64px',
        background: 'rgba(5, 5, 5, 0.92)',
        borderTop: '1px solid var(--border-color)',
        backdropFilter: 'blur(30px)',
        WebkitBackdropFilter: 'blur(30px)',
        zIndex: 9999,
        display: 'none', // Managed by mobile media queries in globals.css
        justifyContent: 'space-around',
        alignItems: 'center',
        padding: '0 8px',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.6)'
      }}
    >
      {[
        { id: 'home', label: 'Home', icon: '🏠' },
        { id: 'search', label: 'Search', icon: '🔍' },
        { id: 'likes', label: 'Library', icon: '❤️' },
        { id: 'settings', label: 'Settings', icon: '⚙️' }
      ].map((tab) => {
        const isActive = currentPage === tab.id && !selectedPlaylist;
        return (
          <button
            key={tab.id}
            onClick={() => {
              setCurrentPage(tab.id as any);
              setSelectedPlaylist(null);
            }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              color: isActive ? 'var(--accent-pink)' : 'var(--text-secondary)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              flex: 1,
              height: '100%',
              transition: 'all 0.15s ease'
            }}
          >
            <span style={{ fontSize: '1.25rem', transition: 'transform 0.15s ease', transform: isActive ? 'scale(1.1)' : 'scale(1)', filter: isActive ? 'drop-shadow(0 0 6px var(--accent-pink))' : 'none' }}>
              {tab.icon}
            </span>
            <span style={{ fontSize: '0.65rem', fontWeight: isActive ? 800 : 500, letterSpacing: '0.02em' }}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
    </div>
  );
}
