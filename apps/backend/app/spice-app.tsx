'use client';

/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/exhaustive-deps */

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  enrichTrackSnapshot,
  getCachedSearch,
  getLatestCachedSearch,
  getPlaybackState,
  getRecentCachedSearches,
  mergeTrackSnapshots,
  rememberSearchResults,
  rememberTrackSnapshots,
  savePlaybackState,
} from './spice-storage';
import {
  buildPrivateTasteProfile,
  buildRecommendationSeeds,
  rankRecommendedTracks,
// type RecommendationSeed,
  type SeededRecommendationResult,
  type RecommendationSeed,
} from './recommendations';
import { isSpiceConnectCommandFresh, SPICE_CONNECT_COMMAND_TTL_MS } from '@/lib/spice-connect';

const SPICE_CONNECT_COMMAND_POLL_INTERVAL_MS = 400;
const SPICE_CONNECT_DEVICE_SYNC_INTERVAL_MS = 1500;
const SPICE_CONNECT_POST_COMMAND_SYNC_DELAY_MS = 450;
const SPICE_CONNECT_STALE_DEVICE_SECONDS = 20;

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
  volumeMuted: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <line x1="23" y1="9" x2="17" y2="15" />
      <line x1="17" y1="9" x2="23" y2="15" />
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
  shuffle: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
      <polyline points="16 3 21 3 21 8" />
      <line x1="4" y1="20" x2="21" y2="3" />
      <polyline points="21 16 21 21 16 21" />
      <line x1="15" y1="15" x2="21" y2="21" />
      <line x1="4" y1="4" x2="9" y2="9" />
    </svg>
  ),
  repeat: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
      <polyline points="17 1 21 5 17 9" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <polyline points="7 23 3 19 7 15" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  ),
  repeatOne: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
      <polyline points="17 1 21 5 17 9" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <polyline points="7 23 3 19 7 15" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
      <text x="12" y="14.5" textAnchor="middle" fill="currentColor" stroke="none" fontSize="8" fontWeight="bold">1</text>
    </svg>
  ),
  musicFolder: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="14" r="3" />
      <path d="M15 14V10" />
    </svg>
  ),
  alertTriangle: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
      <path d="M10.3 2.9 1.8 17a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 2.9a2 2 0 0 0-3.4 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  checkCircle: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
      <path d="M22 11.1V12a10 10 0 1 1-5.9-9.1" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
  close: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  plus: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  musicNote: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="24" height="24">
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  ),
  folder: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="24" height="24">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  ),
  globe: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  ),
  database: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5v14c0 1.7 4 3 9 3s9-1.3 9-3V5" />
      <path d="M3 12c0 1.7 4 3 9 3s9-1.3 9-3" />
    </svg>
  ),
  download: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),
  clipboard: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" />
    </svg>
  ),
  share: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="M8.59 13.51 15.42 17.49" />
      <path d="M15.41 6.51 8.59 10.49" />
    </svg>
  ),
  camera: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  ),
  palette: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
      <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
      <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
      <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
      <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
      <path d="M12 22a10 10 0 1 1 10-10c0 1.1-.9 2-2 2h-3.1a2 2 0 0 0-1.6 3.2l.4.6A2.6 2.6 0 0 1 13.6 22z" />
    </svg>
  ),
  headphones: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
      <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
      <path d="M21 19a2 2 0 0 1-2 2h-1v-6h3zM3 19a2 2 0 0 0 2 2h1v-6H3z" />
    </svg>
  ),
  monitor: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  ),
  video: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M10 9.5v5l5-2.5z" fill="currentColor" stroke="none" />
    </svg>
  ),
  miniPlayer: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <rect x="13" y="11" width="6" height="5" rx="1" />
    </svg>
  ),
  shield: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  ),
  tool: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
      <path d="M14.7 6.3a4 4 0 0 0-5-5L7 4l3 3 2.7-2.7a4 4 0 0 0 2 5L21 16l-5 5-6.3-6.3a4 4 0 0 0-5-2L2 15.4 5.6 19l2.7-2.7a4 4 0 0 0 5-5z" />
    </svg>
  ),
  microphone: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0M12 17v5M8 22h8" />
    </svg>
  ),
  expand: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
      <polyline points="15 3 21 3 21 9" />
      <polyline points="9 21 3 21 3 15" />
      <line x1="21" y1="3" x2="14" y2="10" />
      <line x1="3" y1="21" x2="10" y2="14" />
    </svg>
  ),
  guitar: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="24" height="24">
      <path d="m14 6 4-4 4 4-4 4" />
      <path d="m16 8-5 5" />
      <path d="M12 12c2 2 2 5 0 7s-5 2-7 0-2-5 0-7 5-2 7 0z" />
      <circle cx="8.5" cy="15.5" r="1.5" />
    </svg>
  ),
  coffee: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="24" height="24">
      <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
      <path d="M2 8h16v5a6 6 0 0 1-6 6H8a6 6 0 0 1-6-6zM6 2v2M10 2v2M14 2v2M2 22h18" />
    </svg>
  ),
  piano: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="24" height="24">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M6 4v10M10 4v10M14 4v10M18 4v10M2 14h20" />
      <path d="M8 14v6M16 14v6" />
    </svg>
  ),
  trumpet: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="24" height="24">
      <path d="M3 10h11l7-4v12l-7-4H3z" />
      <path d="M7 10V7M10 10V7M13 10V7M4 14v3M8 14v3" />
    </svg>
  ),
  edit: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
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
  sourceId?: string;
  permalinkUrl?: string;
  previewOnly?: boolean;
  addedBy?: { userId: string; username: string | null; displayName: string };
}

type AppPage = 'home' | 'search' | 'library' | 'account' | 'settings';
type SearchProvider = 'hybrid' | 'youtube_music' | 'youtube_videos' | 'soundcloud';
type StreamProtocol = 'proxy' | 'web' | 'embed';
type ProfileListenType = 'playing_now' | 'scrobble';
type ProfileSyncStatus = 'idle' | 'playing' | 'scrobbled' | 'error';
type AccentTheme = 'pink' | 'blue' | 'orange' | 'green' | 'gold' | 'crimson' | 'deeppurple';
type VisualSurface = 'midnight' | 'glass' | 'solid' | 'aurora';
type ArtworkShape = 'rounded' | 'soft' | 'circle';
type MotionLevel = 'full' | 'calm' | 'off';
type InterfaceScale = 'compact' | 'comfortable' | 'spacious';
type PlayerBarDensity = 'standard' | 'slim';
type ReceiverSelectVariant = 'bar' | 'expanded' | 'mini';
type AccountRole = 'user' | 'admin' | string;
type SpiceNoticeKind = 'success' | 'info' | 'warning' | 'danger';

interface SpiceNotice {
  id: number;
  message: string;
  kind: SpiceNoticeKind;
}

interface SpiceConfirmDialog {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  kind?: SpiceNoticeKind;
  onConfirm: () => void;
}

interface SongShareDialog {
  track: Track;
  shareUrl: string;
}

const SEARCH_PROVIDER_LABELS: Record<SearchProvider, string> = {
  hybrid: 'Hybrid',
  youtube_music: 'YouTube Music',
  youtube_videos: 'YouTube Videos',
  soundcloud: 'SoundCloud',
};

const VISUAL_SURFACE_LABELS: Record<VisualSurface, string> = {
  midnight: 'Midnight Black',
  glass: 'Soft Glass',
  solid: 'Flat Graphite',
  aurora: 'Aurora Glow',
};

const ARTWORK_SHAPE_LABELS: Record<ArtworkShape, string> = {
  rounded: 'Rounded Covers',
  soft: 'Soft Squares',
  circle: 'Circular Artwork',
};

const MOTION_LEVEL_LABELS: Record<MotionLevel, string> = {
  full: 'Full Motion',
  calm: 'Calm Motion',
  off: 'Motion Off',
};

const INTERFACE_SCALE_LABELS: Record<InterfaceScale, string> = {
  compact: 'Compact',
  comfortable: 'Comfortable',
  spacious: 'Spacious',
};

const PLAYER_BAR_DENSITY_LABELS: Record<PlayerBarDensity, string> = {
  standard: 'Standard Bar',
  slim: 'Slim Bar',
};

const PROFILE_SYNC_STATUS_LABELS: Record<ProfileSyncStatus, string> = {
  idle: 'Waiting for playback',
  playing: 'Now playing updated',
  scrobbled: 'Listen saved',
  error: 'Needs attention',
};

interface PendingInvite {
  playlistId: string;
  playlistTitle: string;
  ownerId: string;
  ownerUsername: string;
  ownerDisplayName: string;
}

interface PlaylistMember {
  userId: string;
  username: string | null;
  displayName: string;
  avatarUrl: string | null;
  role: string;
}

interface Playlist {
  id: string;
  title: string;
  description?: string;
  tracks: Track[];
  gradient: string;
  coverUrl?: string;
  createdAt: string;
  shared?: boolean;
  ownerId?: string;
  ownerUsername?: string | null;
  ownerDisplayName?: string;
  shareRole?: 'listener' | 'editor' | string;
  members?: PlaylistMember[];
}

interface PlaylistInvitePreview {
  token: string;
  playlist: Playlist;
  expiresAt?: string | null;
}

interface CloudAccount {
  id: string;
  email: string;
  accountRole?: AccountRole;
  isAdmin?: boolean;
  subscription?: {
    tier: string;
    status: string;
    provider?: string | null;
    currentPeriodEnd?: string | null;
    cancelAtPeriodEnd?: boolean;
    isActive?: boolean;
  };
}

type RemoteCommandType = 'play' | 'pause' | 'toggle' | 'next' | 'previous' | 'seek' | 'volume' | 'play_track';

interface RemoteDevice {
  deviceId: string;
  displayName: string;
  currentTrack?: Track | null;
  queue?: Track[];
  queueIndex: number;
  isPlaying: boolean;
  progress: number;
  duration: number;
  volume: number;
  updatedAt: string;
  lastSeenSeconds?: number;
}

interface RemoteCommand {
  id: string;
  sourceDeviceId: string;
  targetDeviceId: string;
  command: RemoteCommandType;
  payload?: {
    progress?: number;
    volume?: number;
    track?: Track;
    queue?: Track[];
    queueIndex?: number;
  };
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
  avatarUrl?: string; // profile picture URL or preset avatar
  cloudToken?: string | null;
  cloudUser?: CloudAccount | null;
  cloudUsername?: string | null;
}

interface ProfileSyncProviderResult {
  ok: boolean;
  skipped?: boolean;
  error?: string;
}

interface ProfileSyncResponse {
  results?: {
    lastfm?: ProfileSyncProviderResult;
    listenbrainz?: ProfileSyncProviderResult;
  };
}

interface ScrobbleState {
  trackKey: string;
  startedAt: number;
  nowPlayingSent: boolean;
  scrobbled: boolean;
}

const PRESET_GRADIENTS = [
  'linear-gradient(135deg, #a855f7, #ec4899)',
  'linear-gradient(135deg, #f97316, #ef4444)',
  'linear-gradient(135deg, #06b6d4, #3b82f6)',
  'linear-gradient(135deg, #10b981, #059669)',
  'linear-gradient(135deg, #f59e0b, #d97706)',
  'linear-gradient(135deg, #6366f1, #4f46e5)',
  'linear-gradient(135deg, #ff003c, #990011)',
  'linear-gradient(135deg, #4c1d95, #120024)',
];

const PRESET_AVATARS = [
  { name: 'Neon DJ', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&q=80' },
  { name: 'Synthwave Sunset', url: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=150&q=80' },
  { name: 'Galactic Beats', url: 'https://images.unsplash.com/photo-1614149162883-504ce4d13909?w=150&q=80' },
  { name: 'Retro Tape', url: 'https://images.unsplash.com/photo-1539625319135-8d4f9c7847a9?w=150&q=80' },
  { name: 'Cyber Headset', url: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=150&q=80' },
  { name: 'Music Console', url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=150&q=80' }
];

const genres = [
  { name: 'Pop Hits', gradient: 'linear-gradient(135deg, #ec4899, #f43f5e)', icon: Icons.microphone },
  { name: 'Hip-Hop', gradient: 'linear-gradient(135deg, #f97316, #ef4444)', icon: Icons.headphones },
  { name: 'Rock Charts', gradient: 'linear-gradient(135deg, #64748b, #334155)', icon: Icons.guitar },
  { name: 'Lofi Chill', gradient: 'linear-gradient(135deg, #8b5cf6, #06b6d4)', icon: Icons.coffee },
  { name: 'Electronic', gradient: 'linear-gradient(135deg, #d97706, #b45309)', icon: Icons.piano },
  { name: 'Jazz Beats', gradient: 'linear-gradient(135deg, #059669, #0d9488)', icon: Icons.trumpet },
];

const formatTime = (seconds: number) => {
  if (isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const isSoundCloudTrack = (track: Track) =>
  track.sourceId === 'soundcloud' || track.id.startsWith('soundcloud:');

const isYouTubeTrack = (track: Track) =>
  track.sourceId === 'youtube_music'
  || track.sourceId === 'youtube_video'
  || (!track.sourceId && !isSoundCloudTrack(track));

const soundCloudTrackId = (track: Track) =>
  track.id.startsWith('soundcloud:') ? track.id.slice('soundcloud:'.length) : track.id;

const trackSourceLabel = (track: Track) =>
  isSoundCloudTrack(track)
    ? 'SoundCloud'
    : track.sourceId === 'youtube_video'
      ? 'YouTube Video'
      : 'YouTube Music';

const isSearchProvider = (value: string | null): value is SearchProvider =>
  value === 'hybrid'
  || value === 'youtube_music'
  || value === 'youtube_videos'
  || value === 'soundcloud';

const isStreamProtocol = (value: string | null): value is StreamProtocol =>
  value === 'proxy' || value === 'web' || value === 'embed';

const isAccentTheme = (value: string | null): value is AccentTheme =>
  value === 'pink' || value === 'blue' || value === 'orange' || value === 'green' || value === 'gold' || value === 'crimson' || value === 'deeppurple';

const isVisualSurface = (value: string | null): value is VisualSurface =>
  value === 'midnight' || value === 'glass' || value === 'solid' || value === 'aurora';

const isArtworkShape = (value: string | null): value is ArtworkShape =>
  value === 'rounded' || value === 'soft' || value === 'circle';

const isMotionLevel = (value: string | null): value is MotionLevel =>
  value === 'full' || value === 'calm' || value === 'off';

const isInterfaceScale = (value: string | null): value is InterfaceScale =>
  value === 'compact' || value === 'comfortable' || value === 'spacious';

const isPlayerBarDensity = (value: string | null): value is PlayerBarDensity =>
  value === 'standard' || value === 'slim';

const playableSearchTracks = (tracks: Track[]) =>
  tracks.filter((track) => !track.previewOnly);

const lyricsMetadataQuery = (track: Track) => {
  const params = new URLSearchParams();
  if (track.title) params.set('title', track.title);

  const artist = track.artists?.map((entry) => entry.name).filter(Boolean).join(', ');
  if (artist) params.set('artist', artist);

  if (track.durationMs && Number.isFinite(track.durationMs)) {
    params.set('durationMs', String(Math.round(track.durationMs)));
  }

  const query = params.toString();
  return query ? `?${query}` : '';
};

const dedupeTracks = (tracks: Track[]) => {
  const seen = new Set<string>();
  const deduped: Track[] = [];

  for (const track of tracks) {
    const key = `${track.sourceId ?? 'youtube_music'}:${track.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(track);
  }

  return deduped;
};

const playbackTrackKey = (track: Track) =>
  `${track.sourceId ?? 'youtube_music'}:${track.id}`;

const profileArtistName = (track: Track) =>
  track.artists.map((entry) => entry.name).filter(Boolean).join(', ') || 'Unknown Artist';

const profileOriginUrl = (track: Track) => {
  if (track.permalinkUrl) return track.permalinkUrl;
  if (track.sourceId === 'youtube_video') return `https://www.youtube.com/watch?v=${track.id}`;
  if (track.sourceId === 'youtube_music' || !track.sourceId) return `https://music.youtube.com/watch?v=${track.id}`;
  return undefined;
};

const safeSharedString = (value: unknown, fallback = '') =>
  typeof value === 'string' && value.trim() ? value.trim() : fallback;

const compactTrackForSongShare = (track: Track): Track => ({
  id: track.id,
  title: track.title,
  artists: (track.artists || []).map((artist) => ({
    id: safeSharedString(artist.id, artist.name || 'artist'),
    name: safeSharedString(artist.name, 'Unknown Artist'),
    ...(artist.artworkUrl ? { artworkUrl: artist.artworkUrl } : {}),
  })),
  ...(track.album ? {
    album: {
      id: track.album.id,
      title: track.album.title,
      artists: (track.album.artists || []).map((artist) => ({
        id: safeSharedString(artist.id, artist.name || 'artist'),
        name: safeSharedString(artist.name, 'Unknown Artist'),
        ...(artist.artworkUrl ? { artworkUrl: artist.artworkUrl } : {}),
      })),
      ...(track.album.artworkUrl ? { artworkUrl: track.album.artworkUrl } : {}),
      ...(track.album.year ? { year: track.album.year } : {}),
    },
  } : {}),
  ...(track.durationMs ? { durationMs: track.durationMs } : {}),
  ...(track.artworkUrl ? { artworkUrl: track.artworkUrl } : {}),
  ...(track.sourceId ? { sourceId: track.sourceId } : {}),
  ...(track.permalinkUrl ? { permalinkUrl: track.permalinkUrl } : {}),
});

const encodeBase64Url = (value: string) => {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/u, '');
};

const decodeBase64Url = (value: string) => {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
};

const encodeSongShareToken = (track: Track) => {
  // Use a compact array tuple to minimize Base64Url size.
  // Format: [id, title, artistName, sourceId, artworkUrl]
  // We omit artworkUrl for YouTube tracks to keep the URL as short as possible.
  const sId = track.sourceId || 'youtube_music';
  const isYouTube = sId === 'youtube_music' || sId === 'youtube_video';
  const artwork = isYouTube ? '' : (track.artworkUrl || '');
  
  const tuple = [
    track.id,
    track.title,
    track.artists.length > 0 ? track.artists[0].name : '',
    track.sourceId || '',
    artwork
  ];
  while (tuple.length > 0 && tuple[tuple.length - 1] === '') {
    tuple.pop();
  }
  return encodeBase64Url(JSON.stringify(tuple));
};

const decodeSongShareToken = (token: string): Track | null => {
  try {
    const payload = JSON.parse(decodeBase64Url(token));
    
    // Support the new compact tuple format
    if (Array.isArray(payload)) {
      const [id, title, artistName, sourceId, artworkUrl] = payload;
      if (!id) return null;
      
      const sId = safeSharedString(sourceId, 'youtube_music');
      const isYouTube = sId === 'youtube_music' || sId === 'youtube_video';
      
      const resolvedArtwork = artworkUrl 
        ? safeSharedString(artworkUrl)
        : (isYouTube ? `https://i.ytimg.com/vi/${id}/mqdefault.jpg` : undefined);

      return {
        id: safeSharedString(id),
        title: safeSharedString(title, 'Shared song'),
        artists: [{ id: 'shared-artist', name: safeSharedString(artistName, 'Unknown Artist') }],
        sourceId: sId,
        ...(resolvedArtwork ? { artworkUrl: resolvedArtwork } : {})
      };
    }

    // Fallback to legacy object format
    const id = safeSharedString(payload?.id);
    if (!id) return null;

    const artists = Array.isArray(payload?.artists)
      ? payload.artists.map((artist: any) => ({
        id: safeSharedString(artist?.id, artist?.name || 'artist'),
        name: safeSharedString(artist?.name, 'Unknown Artist'),
        ...(safeSharedString(artist?.artworkUrl) ? { artworkUrl: safeSharedString(artist.artworkUrl) } : {}),
      }))
      : [];

    const albumArtists = Array.isArray(payload?.album?.artists)
      ? payload.album.artists.map((artist: any) => ({
        id: safeSharedString(artist?.id, artist?.name || 'artist'),
        name: safeSharedString(artist?.name, 'Unknown Artist'),
        ...(safeSharedString(artist?.artworkUrl) ? { artworkUrl: safeSharedString(artist.artworkUrl) } : {}),
      }))
      : [];

    const durationMs = Number(payload?.durationMs);
    const year = Number(payload?.album?.year);

    return {
      id,
      title: safeSharedString(payload?.title, 'Shared song'),
      artists: artists.length > 0 ? artists : [{ id: 'shared-artist', name: 'Unknown Artist' }],
      ...(payload?.album ? {
        album: {
          id: safeSharedString(payload.album.id, 'shared-album'),
          title: safeSharedString(payload.album.title, 'Shared album'),
          artists: albumArtists.length > 0 ? albumArtists : artists,
          ...(safeSharedString(payload.album.artworkUrl) ? { artworkUrl: safeSharedString(payload.album.artworkUrl) } : {}),
          ...(Number.isFinite(year) ? { year } : {}),
        },
      } : {}),
      ...(Number.isFinite(durationMs) && durationMs > 0 ? { durationMs } : {}),
      ...(safeSharedString(payload?.artworkUrl) ? { artworkUrl: safeSharedString(payload.artworkUrl) } : {}),
      ...(safeSharedString(payload?.sourceId) ? { sourceId: safeSharedString(payload.sourceId) } : {}),
      ...(safeSharedString(payload?.permalinkUrl) ? { permalinkUrl: safeSharedString(payload.permalinkUrl) } : {}),
    };
  } catch {
    return null;
  }
};

const buildSongShareUrl = (track: Track) => {
  const url = new URL(window.location.href);
  const isLocalHost = ['localhost', '127.0.0.1', '::1'].includes(url.hostname);
  if (!isLocalHost) {
    url.protocol = 'https:';
    url.host = 'music.spice-app.xyz';
  }
  url.pathname = '/';
  url.hash = '';
  url.search = '';
  url.searchParams.set('song', encodeSongShareToken(track));
  return url.toString();
};

const directAudioExtensionPattern = /\.(mp3|m4a|aac|wav|flac|ogg|opus)(?:$|[?#])/iu;

const directAudioDownloadUrl = (track: Track) => {
  const candidates = [track.permalinkUrl].filter(Boolean) as string[];

  for (const candidate of candidates) {
    try {
      const url = new URL(candidate, typeof window !== 'undefined' ? window.location.origin : 'https://music.spice-app.xyz');
      if (directAudioExtensionPattern.test(url.pathname)) return url.toString();
    } catch {
      // Skip malformed URLs.
    }
  }

  return null;
};

const sanitizeDownloadName = (track: Track) => {
  const base = `${profileArtistName(track)} - ${track.title}`
    .replace(/[<>:"/\\|?*\x00-\x1F]/gu, '')
    .replace(/\s+/gu, ' ')
    .trim();
  return (base || 'spice-song').slice(0, 90);
};

const extensionFromAudioUrl = (url: string) => {
  try {
    const match = new URL(url).pathname.match(/\.([a-z0-9]+)$/iu);
    return match?.[1]?.toLowerCase() || 'mp3';
  } catch {
    return 'mp3';
  }
};

const scrobbleThresholdSeconds = (durationSeconds: number) => {
  if (!durationSeconds || !Number.isFinite(durationSeconds)) return 60;
  if (durationSeconds < 30) return Math.max(5, durationSeconds * 0.5);
  return Math.min(Math.max(durationSeconds * 0.5, 30), 240);
};


/**
 * Generates a random number between 0 (inclusive) and 1 (exclusive) using crypto.getRandomValues
 * Fallback to Math.random() if crypto is not available.
 */
const getSecureRandom = () => {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    return array[0] / (0xffffffff + 1);
  }
  return Math.random();
};

const randomIndex = (length: number) => Math.floor(getSecureRandom() * length);
const randomSuffix = () => getSecureRandom().toString(36).substring(2, 5);
const playlistUuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isPlaylistUuid = (id: string) => playlistUuidPattern.test(id);

const createPlaylistId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  // Fallback RFC4122 version 4 UUID generator
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (getSecureRandom() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const ownedPlaylistsOnly = (playlists: Playlist[]) =>
  playlists.filter((playlist) => !playlist.shared);

const normalizePlaylistSnapshot = (playlist: any): Playlist => ({
  id: typeof playlist?.id === 'string' && playlist.id ? playlist.id : createPlaylistId(),
  title: typeof playlist?.title === 'string' && playlist.title ? playlist.title : 'Shared Playlist',
  description: typeof playlist?.description === 'string' ? playlist.description : '',
  tracks: Array.isArray(playlist?.tracks) ? playlist.tracks.map(enrichTrackSnapshot) : [],
  gradient: typeof playlist?.gradient === 'string' && playlist.gradient ? playlist.gradient : PRESET_GRADIENTS[0],
  coverUrl: typeof playlist?.coverUrl === 'string' ? playlist.coverUrl : undefined,
  createdAt: typeof playlist?.createdAt === 'string' && playlist.createdAt
    ? playlist.createdAt
    : new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }),
  ...(playlist?.shared ? { shared: true } : {}),
  ...(typeof playlist?.ownerId === 'string' ? { ownerId: playlist.ownerId } : {}),
  ...(typeof playlist?.ownerUsername === 'string' ? { ownerUsername: playlist.ownerUsername } : {}),
  ...(typeof playlist?.ownerDisplayName === 'string' ? { ownerDisplayName: playlist.ownerDisplayName } : {}),
  ...(typeof playlist?.shareRole === 'string' ? { shareRole: playlist.shareRole } : {}),
  ...(Array.isArray(playlist?.members) ? { members: playlist.members } : {}),
});

const createRemoteDeviceId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `device-${Date.now()}-${randomSuffix()}`;
};

const defaultRemoteDeviceName = () => {
  if (typeof navigator === 'undefined') return 'Spice Connect Device';
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|android|mobile/.test(ua)) return 'Spice Connect Phone';
  if (/ipad|tablet/.test(ua)) return 'Spice Connect Tablet';
  return 'Spice Connect Desktop';
};

const sanitizePfpUrl = (url: string): string => {
  const cleaned = url.trim();
  if (!cleaned) return '';

  // Imgur gallery/album URLs: https://imgur.com/a/abc123x or https://imgur.com/gallery/abc123x
  const albumMatch = cleaned.match(/imgur\.com\/(?:a|gallery|r)\/([a-zA-Z0-9]+)/);
  if (albumMatch && albumMatch[1]) {
    return `https://i.imgur.com/${albumMatch[1]}.png`;
  }

  // Imgur direct image redirection helper: https://imgur.com/abc123x
  if (cleaned.includes('imgur.com') && !cleaned.includes('i.imgur.com') && !/\.(png|jpg|jpeg|gif|webp)$/i.test(cleaned)) {
    const idMatch = cleaned.match(/imgur\.com\/([a-zA-Z0-9]+)/);
    if (idMatch && idMatch[1]) {
      return `https://i.imgur.com/${idMatch[1]}.png`;
    }
  }

  return cleaned;
};

interface WordTiming {
  word: string;
  start: number;
  duration: number;
}

interface LyricLine {
  time: number;
  text: string;
  words: WordTiming[];
}

function parseLRC(lrcText: string, totalDurationSec: number): LyricLine[] {
  if (!lrcText) return [];

  const lines = lrcText.split(/\r?\n/);
  const parsedLines: LyricLine[] = [];

  // Parse time tags like [01:23.45] or [01:23] or [01:23:450]
  const timeRegex = /\[(\d+):(\d+)(?:\.(\d+))?\]/g;

  for (const line of lines) {
    timeRegex.lastIndex = 0;
    const match = timeRegex.exec(line);
    if (!match) continue;

    const min = parseInt(match[1], 10);
    const sec = parseInt(match[2], 10);
    const msStr = match[3] || '0';
    let ms = 0;
    if (msStr.length === 1) ms = parseInt(msStr, 10) * 100;
    else if (msStr.length === 2) ms = parseInt(msStr, 10) * 10;
    else ms = parseInt(msStr, 10);

    const timeInSeconds = min * 60 + sec + ms / 1000;
    const text = line.replace(/\[\d+:\d+(?:\.\d+)?\]/g, '').trim();

    parsedLines.push({
      time: timeInSeconds,
      text,
      words: [],
    });
  }

  // Sort lines by time
  parsedLines.sort((a, b) => a.time - b.time);

  // Now, calculate the duration of each line and split into words
  for (let i = 0; i < parsedLines.length; i++) {
    const currentLine = parsedLines[i];
    const nextLineTime = i < parsedLines.length - 1 ? parsedLines[i + 1].time : totalDurationSec;
    const lineDuration = Math.max(0.5, nextLineTime - currentLine.time);

    // Split text into words (including whitespace/punctuation)
    const rawWords = currentLine.text.split(/(\s+)/).filter(w => w.length > 0);

    if (rawWords.length === 0) {
      currentLine.words = [];
      continue;
    }

    const totalChars = rawWords.reduce((sum, w) => sum + w.length, 0);

    let elapsed = 0;
    const wordsWithTiming: WordTiming[] = [];

    for (const rw of rawWords) {
      const wordDuration = (rw.length / totalChars) * lineDuration;
      wordsWithTiming.push({
        word: rw,
        start: currentLine.time + elapsed,
        duration: wordDuration,
      });
      elapsed += wordDuration;
    }

    currentLine.words = wordsWithTiming;
  }

  return parsedLines;
}

function parsePlainLyrics(lyricsText: string): LyricLine[] {
  if (!lyricsText) return [];

  return lyricsText
    .split(/\r?\n/)
    .map((text) => text.trim())
    .filter(Boolean)
    .map((text) => ({ time: 0, text, words: [] }));
}

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

const createUserProfileId = () => 'profile_' + Date.now();

export default function SpiceApp() {
  const [currentPage, setCurrentPage] = useState<AppPage>('home');
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);

  const [debugLogs, setDebugLogs] = useState<string[]>([]);

  const logDebug = useCallback((category: string, message: string) => {
    const time = new Date().toLocaleTimeString();
    setDebugLogs(prev => [...prev.slice(-99), `[${time}] [${category.toUpperCase()}] ${message}`]);
  }, []);

  // Settings Configuration states
  const [accentTheme, setAccentTheme] = useState<AccentTheme>('pink');
  const [visualSurface, setVisualSurface] = useState<VisualSurface>('midnight');
  const [artworkShape, setArtworkShape] = useState<ArtworkShape>('rounded');
  const [motionLevel, setMotionLevel] = useState<MotionLevel>('full');
  const [interfaceScale, setInterfaceScale] = useState<InterfaceScale>('comfortable');
  const [audioQuality, setAudioQuality] = useState<'standard' | 'high' | 'low'>('standard');
  const [streamProtocol, setStreamProtocol] = useState<StreamProtocol>('proxy');
  const [sidebarHidden, setSidebarHidden] = useState(false);
  const [sidebarSearchEnabled, setSidebarSearchEnabled] = useState(true);
  const [sidebarProfileEnabled, setSidebarProfileEnabled] = useState(true);
  const [profileSyncEnabled, setProfileSyncEnabled] = useState(false);
  const [lastFmSessionKey, setLastFmSessionKey] = useState('');
  const [lastFmAccountLinked, setLastFmAccountLinked] = useState(false);
  const [lastFmLinkedUser, setLastFmLinkedUser] = useState('');
  const [lastFmLinkStatus, setLastFmLinkStatus] = useState<string | null>(null);
  const [isLinkingLastFm, setIsLinkingLastFm] = useState(false);
  const [listenBrainzToken, setListenBrainzToken] = useState('');
  const [profileSyncStatus, setProfileSyncStatus] = useState<ProfileSyncStatus>('idle');
  const [showQueueDrawer, setShowQueueDrawer] = useState(false);
  const [spiceNotices, setSpiceNotices] = useState<SpiceNotice[]>([]);
  const [spiceConfirm, setSpiceConfirm] = useState<SpiceConfirmDialog | null>(null);
  const [songShareDialog, setSongShareDialog] = useState<SongShareDialog | null>(null);
  const activeNoticeTimersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const dismissSpiceNotice = useCallback((id: number) => {
    const timer = activeNoticeTimersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      activeNoticeTimersRef.current.delete(id);
    }
    setSpiceNotices((prev) => prev.filter((notice) => notice.id !== id));
  }, []);

  const showSpiceNotice = useCallback((message: string, kind: SpiceNoticeKind = 'info') => {
    const id = Date.now() + getSecureRandom();
    setSpiceNotices((prev) => {
      const next = prev.length >= 2 ? prev.slice(1) : prev;
      return [...next, { id, message, kind }];
    });

    const timer = setTimeout(() => {
      setSpiceNotices((prev) => prev.filter((notice) => notice.id !== id));
      activeNoticeTimersRef.current.delete(id);
    }, 4200);
    activeNoticeTimersRef.current.set(id, timer);
  }, []);

  const copyTextToClipboard = useCallback(async (text: string) => {
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch {
        // Fall back to a temporary selection for browsers without clipboard permission.
      }
    }

    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.setAttribute('readonly', 'true');
      textArea.style.position = 'fixed';
      textArea.style.top = '-1000px';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      const copied = document.execCommand('copy');
      document.body.removeChild(textArea);
      return copied;
    } catch {
      return false;
    }
  }, []);

  const shareSongLink = useCallback((track: Track, event?: React.MouseEvent<HTMLElement>) => {
    event?.stopPropagation();

    if (!track || track.id === 'placeholder' || track.id === 'spice-connect-placeholder') {
      showSpiceNotice('Choose a song before sharing.', 'warning');
      return;
    }

    setSongShareDialog({ track, shareUrl: buildSongShareUrl(track) });
  }, [showSpiceNotice]);

  const copySongShareLink = useCallback(async () => {
    if (!songShareDialog) return;
    const copied = await copyTextToClipboard(songShareDialog.shareUrl);
    if (copied) {
      showSpiceNotice(`Song link copied for "${songShareDialog.track.title}".`, 'success');
      setSongShareDialog(null);
      return;
    }

    if (navigator.share) {
      try {
        await navigator.share({
          title: songShareDialog.track.title,
          text: `${songShareDialog.track.title} - ${profileArtistName(songShareDialog.track)}`,
          url: songShareDialog.shareUrl,
        });
        showSpiceNotice('Song link opened in your share sheet.', 'success');
        setSongShareDialog(null);
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
      }
    }

    showSpiceNotice('Could not copy the song link from this browser.', 'warning');
  }, [copyTextToClipboard, showSpiceNotice, songShareDialog]);

  const downloadSharedSong = useCallback(async () => {
    if (!songShareDialog) return;
    const track = songShareDialog.track;
    const downloadUrl = directAudioDownloadUrl(track);

    if (downloadUrl) {
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${sanitizeDownloadName(track)}.${extensionFromAudioUrl(downloadUrl)}`;
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showSpiceNotice(`Downloading "${track.title}".`, 'success');
      setSongShareDialog(null);
      return;
    }

    showSpiceNotice(`Preparing download for "${track.title}"...`, 'info');

    const isSoundCloud = isSoundCloudTrack(track);
    let fallbackWindow: Window | null = null;
    if (!isSoundCloud) {
      fallbackWindow = window.open('about:blank', '_blank');
    }

    try {
      const trackEndpoint = isSoundCloud
        ? `/api/sc/track/${encodeURIComponent(soundCloudTrackId(track))}?quality=${audioQuality}`
        : `/api/yt/track/${encodeURIComponent(track.id)}`;

      const res = await fetch(trackEndpoint);
      if (!res.ok) {
        let errMsg = 'Failed to fetch track info';
        try {
          const errData = await res.json();
          if (errData?.message) errMsg = errData.message;
        } catch { /* ignore JSON parse error */ }
        throw new Error(errMsg);
      }
      const data = await res.json();

      const streams = data.streams ?? [];
      const streamObj = streams.find((s: any) => s.url);
      const streamUrl = data.streamUrl || (streamObj ? streamObj.url : null);

      if (streamUrl) {
        if (fallbackWindow) {
          fallbackWindow.close();
        }

        const downloadTitle = sanitizeDownloadName(track);
        
        // Convert relative URL to absolute URL to parse/append params
        const finalUrl = new URL(streamUrl, typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
        finalUrl.searchParams.set('download', 'true');
        finalUrl.searchParams.set('title', downloadTitle);
        
        // This will trigger the browser's download manager without unloading the page
        // because the backend endpoint now returns Content-Disposition: attachment
        window.location.href = finalUrl.toString();

        showSpiceNotice(`Started downloading "${track.title}".`, 'success');
        setSongShareDialog(null);
      } else {
        throw new Error('Stream not available for download.');
      }
    } catch (err: any) {
      logDebug('error', `Download stream failed: ${err}`);
      if (fallbackWindow) {
        fallbackWindow.location.href = `https://loader.to/api/card/?url=https://www.youtube.com/watch?v=${encodeURIComponent(track.id)}&f=mp3`;
        showSpiceNotice(`Direct download failed. Opened external converter for "${track.title}".`, 'warning');
        setSongShareDialog(null);
      } else {
        showSpiceNotice(`Failed to download stream: ${err?.message || 'Unknown error'}`, 'danger');
      }
    }
  }, [showSpiceNotice, songShareDialog, audioQuality]);

  const openSongSource = useCallback(() => {
    if (!songShareDialog) return;
    const sourceUrl = profileOriginUrl(songShareDialog.track);
    if (!sourceUrl) {
      showSpiceNotice('No source link is available for this song.', 'warning');
      return;
    }
    window.open(sourceUrl, '_blank', 'noopener,noreferrer');
  }, [showSpiceNotice, songShareDialog]);

  const renderSongShareButton = (
    track: Track,
    className = 'library-item__action library-item__action--share',
  ) => (
    <button
      type="button"
      className={className}
      onClick={(event) => shareSongLink(track, event)}
      disabled={!track || track.id === 'placeholder' || track.id === 'spice-connect-placeholder'}
      title={`Share "${track.title}"`}
      aria-label={`Share ${track.title}`}
    >
      {Icons.share}
    </button>
  );

  const requestSpiceConfirm = useCallback((dialog: SpiceConfirmDialog) => {
    setSpiceConfirm(dialog);
  }, []);

  const cancelSpiceConfirm = useCallback(() => {
    setSpiceConfirm(null);
  }, []);

  useEffect(() => () => {
    activeNoticeTimersRef.current.forEach((timer) => clearTimeout(timer));
    activeNoticeTimersRef.current.clear();
  }, []);

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
  const [newProfileAvatarUrl, setNewProfileAvatarUrl] = useState('');

  // ── Music Core State (Decoupled & Bound to Active Profile) ────────
  const [currentTrack, setCurrentTrack] = useState<Track>({
    id: 'placeholder',
    title: 'Select a track to play',
    artists: [{ id: 'Spice', name: 'Spice Player' }],
    artworkUrl: '/icon.svg'
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
  const [libraryFilter, setLibraryFilter] = useState<'playlists' | 'shared' | 'liked' | 'history'>('playlists');

  // Sync profile details when changing profile
  const [editName, setEditName] = useState(activeProfile.displayName);
  const [editBio, setEditBio] = useState(activeProfile.bio);
  const [editGradient, setEditGradient] = useState(activeProfile.gradient);
  const [editPasscode, setEditPasscode] = useState(activeProfile.passcode || '');
  const [editAvatarUrl, setEditAvatarUrl] = useState(activeProfile.avatarUrl || '');
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
  const [showEditPlaylistDialog, setShowEditPlaylistDialog] = useState(false);
  const [editPlTitle, setEditPlTitle] = useState('');
  const [editPlDesc, setEditPlDesc] = useState('');
  const [editPlGradient, setEditPlGradient] = useState('');
  const [editPlCoverUrl, setEditPlCoverUrl] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [sharingPlaylistId, setSharingPlaylistId] = useState<string | null>(null);
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const [invitePreview, setInvitePreview] = useState<PlaylistInvitePreview | null>(null);
  const [inviteStatus, setInviteStatus] = useState<string | null>(null);
  const [acceptingInvite, setAcceptingInvite] = useState(false);

  // Username & Shared Playlist Collaboration state
  const [cloudUsername, setCloudUsername] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const activeId = localStorage.getItem('spice_active_profile_id') || 'default';
      const saved = localStorage.getItem('spice_profiles_list');
      if (saved) {
        try {
          const list: UserProfile[] = JSON.parse(saved);
          const found = list.find(p => p.id === activeId);
          if (found && found.cloudUsername) return found.cloudUsername;
        } catch { }
      }
    }
    return null;
  });
  const [usernameInput, setUsernameInput] = useState(() => {
    if (typeof window !== 'undefined') {
      const activeId = localStorage.getItem('spice_active_profile_id') || 'default';
      const saved = localStorage.getItem('spice_profiles_list');
      if (saved) {
        try {
          const list: UserProfile[] = JSON.parse(saved);
          const found = list.find(p => p.id === activeId);
          if (found && found.cloudUsername) return found.cloudUsername;
        } catch { }
      }
    }
    return '';
  });
  const [usernameSaving, setUsernameSaving] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [usernameSuccess, setUsernameSuccess] = useState(false);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [pendingInvitesLoading, setPendingInvitesLoading] = useState(false);
  const [showMembersPanel, setShowMembersPanel] = useState(false);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersList, setMembersList] = useState<{ owner: PlaylistMember; members: PlaylistMember[]; maxMembers: number } | null>(null);
  const [inviteUsername, setInviteUsername] = useState('');
  const [invitingMember, setInvitingMember] = useState(false);
  const [memberActionStatus, setMemberActionStatus] = useState<string | null>(null);
  const [showCreateSharedDialog, setShowCreateSharedDialog] = useState(false);
  const [newSharedPlTitle, setNewSharedPlTitle] = useState('');
  const [newSharedPlDesc, setNewSharedPlDesc] = useState('');

  // Cloud Sync & Accounts state
  const [cloudToken, setCloudToken] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const activeId = localStorage.getItem('spice_active_profile_id') || 'default';
      const saved = localStorage.getItem('spice_profiles_list');
      if (saved) {
        try {
          const list: UserProfile[] = JSON.parse(saved);
          const found = list.find(p => p.id === activeId);
          if (found) return found.cloudToken || null;
        } catch { }
      }
      return localStorage.getItem('spice_cloud_token');
    }
    return null;
  });
  const [cloudUser, setCloudUser] = useState<CloudAccount | null>(() => {
    if (typeof window !== 'undefined') {
      const activeId = localStorage.getItem('spice_active_profile_id') || 'default';
      const saved = localStorage.getItem('spice_profiles_list');
      if (saved) {
        try {
          const list: UserProfile[] = JSON.parse(saved);
          const found = list.find(p => p.id === activeId);
          if (found) return found.cloudUser || null;
        } catch { }
      }
      const savedUser = localStorage.getItem('spice_cloud_user');
      if (savedUser) {
        try { return JSON.parse(savedUser); } catch { return null; }
      }
    }
    return null;
  });
  const [syncingStatus, setSyncingStatus] = useState<'idle' | 'syncing' | 'success' | 'error' | null>(null);
  const [dbError, setDbError] = useState<string | null>(null);
  const [isLocalDbFallback, setIsLocalDbFallback] = useState<boolean>(false);
  const [remoteControlEnabled, setRemoteControlEnabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('spice_remote_control_enabled') !== 'false';
    }
    return true;
  });
  const [remoteDeviceId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('spice_remote_device_id');
      if (saved) return saved;
      const created = createRemoteDeviceId();
      localStorage.setItem('spice_remote_device_id', created);
      return created;
    }
    return 'server-device';
  });
  const [remoteDeviceName, setRemoteDeviceName] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('spice_remote_device_name') || defaultRemoteDeviceName();
    }
    return 'Spice Connect Device';
  });
  const [remoteDevices, setRemoteDevices] = useState<RemoteDevice[]>([]);
  const [selectedRemoteDeviceId, setSelectedRemoteDeviceId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('spice_connect_receiver_id') || '';
    }
    return '';
  });
  const [remoteStatus, setRemoteStatus] = useState<string | null>(null);
  const [receiverMenuOpen, setReceiverMenuOpen] = useState<ReceiverSelectVariant | null>(null);
  const [playerPlacement, setPlayerPlacement] = useState<'bottom' | 'top'>('bottom');
  const [playerViewMode, setPlayerViewMode] = useState<'bar' | 'expanded' | 'mini'>('bar');
  const [playerBarDensity, setPlayerBarDensity] = useState<PlayerBarDensity>('standard');
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);
  const [miniPlayerPos, setMiniPlayerPos] = useState<{ x: number; y: number } | null>(null);
  const [isDraggingMini, setIsDraggingMini] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isShuffle, setIsShuffle] = useState<boolean>(false);
  const [repeatMode, setRepeatMode] = useState<'none' | 'all' | 'one'>('all');
  const [expandedTab, setExpandedTab] = useState<'controls' | 'queue' | 'lyrics'>('controls');

  // Dynamic Lyrics & Karaoke states
  const [lyricsData, setLyricsData] = useState<{
    lines: LyricLine[];
    plainLyrics: string;
    syncedLyrics: string;
    isSynced: boolean;
  } | null>(null);
  const [lyricsLoading, setLyricsLoading] = useState(false);
  const [isKaraokeMode, setIsKaraokeMode] = useState(false);
  const lyricsContainerRef = useRef<HTMLDivElement | null>(null);
  const [showBarLyrics, setShowBarLyrics] = useState(false);
  const [showMiniLyrics, setShowMiniLyrics] = useState(false);

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
  const [homeRecommended, setHomeRecommended] = useState<Track[]>([]);
  const [homeRecommendationSeed, setHomeRecommendationSeed] = useState<import('./recommendations').RecommendationSeed | null>(null);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);
  const [isLoadingHome, setIsLoadingHome] = useState(true);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [topbarSearchQuery, setTopbarSearchQuery] = useState('');
  const [searchProvider, setSearchProvider] = useState<SearchProvider>('hybrid');
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [searchResultsSource, setSearchResultsSource] = useState<'network' | 'cache' | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [topbarSearchTrayOpen, setTopbarSearchTrayOpen] = useState(false);
  const [recentSearchEntries, setRecentSearchEntries] = useState<ReturnType<typeof getRecentCachedSearches>>([]);
  const [error, setError] = useState<string>();

  const [selfTestRunning, setSelfTestRunning] = useState(false);
  const [selfTestResults, setSelfTestResults] = useState<{
    api: 'passed' | 'failed' | null;
    db: 'passed' | 'failed' | 'disabled' | null;
    embed: 'passed' | 'failed' | null;
    latency: number | null;
  }>({ api: null, db: null, embed: null, latency: null });
  const [terminalFilter, setTerminalFilter] = useState('');
  const [terminalAutoScroll, setTerminalAutoScroll] = useState(true);
  const [logsCopied, setLogsCopied] = useState(false);
  const terminalEndRef = useRef<HTMLDivElement | null>(null);
  const launchIntentHandledRef = useRef(false);

  const applyLastFmSession = useCallback((sessionKey: string, linkedUser?: string, accountLinked?: boolean) => {
    const trimmedSessionKey = sessionKey.trim();
    if (!trimmedSessionKey) return;

    const resolvedUser = linkedUser?.trim() || 'Last.fm account';
    setLastFmSessionKey(trimmedSessionKey);
    setLastFmLinkedUser(resolvedUser);
    if (typeof accountLinked === 'boolean') {
      setLastFmAccountLinked(accountLinked);
      localStorage.setItem('spice_lastfm_account_linked', String(accountLinked));
    }
    setProfileSyncEnabled(true);
    setLastFmLinkStatus(`Linked ${resolvedUser}${accountLinked ? ' to your SPICE account' : ''}. Profile sync is enabled.`);
    localStorage.setItem('spice_lastfm_session_key', trimmedSessionKey);
    localStorage.setItem('spice_lastfm_linked_user', resolvedUser);
    localStorage.setItem('spice_profile_sync_enabled', 'true');
    localStorage.removeItem('spice_lastfm_link_token');
    logDebug('profile', `Last.fm linked as ${resolvedUser}.`);
  }, [logDebug]);

  useEffect(() => {
    if (terminalAutoScroll && terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [debugLogs, terminalAutoScroll]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;

      const data = event.data as {
        type?: unknown;
        sessionKey?: unknown;
        name?: unknown;
        accountLinked?: unknown;
      } | null;
      if (data?.type !== 'spice:lastfm-linked' || typeof data.sessionKey !== 'string') return;

      applyLastFmSession(
        data.sessionKey,
        typeof data.name === 'string' ? data.name : undefined,
        typeof data.accountLinked === 'boolean' ? data.accountLinked : undefined,
      );
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== 'spice_lastfm_session_key' || !event.newValue) return;
      applyLastFmSession(
        event.newValue,
        localStorage.getItem('spice_lastfm_linked_user') || undefined,
        localStorage.getItem('spice_lastfm_account_linked') === 'true',
      );
    };

    window.addEventListener('message', handleMessage);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('storage', handleStorage);
    };
  }, [applyLastFmSession]);

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
    } catch {
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
    } catch {
      logDebug('diagnostics', 'Cloud Database connection failed.');
    }

    let embedStatus: 'passed' | 'failed' = 'failed';
    try {
      logDebug('diagnostics', 'Verifying YouTube Iframe API player library status...');
      const hasYT = (window as any).YT && (window as any).YT.Player;
      const hasPlayerInstance = ytPlayerRef.current !== null;
      if (hasYT && hasPlayerInstance) {
        embedStatus = 'passed';
        logDebug('diagnostics', 'YouTube Iframe Player API fully cued and initialized!');
      } else if (hasYT) {
        embedStatus = 'passed';
        logDebug('diagnostics', 'YouTube Iframe API loaded successfully.');
      } else {
        embedStatus = 'failed';
        logDebug('diagnostics', 'YouTube Iframe API not detected in window scope. Check script blocks or content-blockers.');
      }
    } catch {
      embedStatus = 'failed';
    }

    const latency = Date.now() - startTime;
    setSelfTestResults({ api: apiStatus, db: dbStatus, embed: embedStatus, latency });
    setSelfTestRunning(false);
    logDebug('diagnostics', `Self-test completed in ${latency}ms. Status: API=${apiStatus}, DB=${dbStatus}, EMBED=${embedStatus}`);
  };

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ytPlayerRef = useRef<any>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const searchRequestRef = useRef(0);
  const recommendationRequestRef = useRef(0);

  // References to preserve state variables and bypass stale React closures inside player events
  const queueIndexRef = useRef(queueIndex);
  const queueRef = useRef(queue);
  const repeatModeRef = useRef(repeatMode);
  const streamProtocolRef = useRef(streamProtocol);
  const isShuffleRef = useRef(isShuffle);
  const activeProfileRef = useRef(activeProfile);
  const activeProfileIdRef = useRef(activeProfileId);
  const cloudTokenRef = useRef(cloudToken);
  const cloudUserRef = useRef(cloudUser);
  const cloudUsernameRef = useRef(cloudUsername);
  const progressRef = useRef(progress);
  const currentTrackRef = useRef(currentTrack);
  const isPlayingRef = useRef(isPlaying);
  const streamUrlRef = useRef(streamUrl);
  const isLoadingStreamRef = useRef(isLoadingStream);
  const durationRef = useRef(duration);
  const volumeRef = useRef(volume);
  const errorSkipTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const playbackRequestRef = useRef(0);
  const shouldAutoPlayRef = useRef(false);
  const directEmbedRetryRef = useRef<Set<string>>(new Set());
  const embedProxyRetryRef = useRef<Set<string>>(new Set());
  const syncLockRef = useRef<boolean>(false);
  const scrobbleStateRef = useRef<ScrobbleState | null>(null);
  const remoteDeviceReportInFlightRef = useRef(false);
  const remoteDeviceLoadInFlightRef = useRef(false);
  const remoteCommandPollInFlightRef = useRef(false);
  const appliedRemoteCommandIdsRef = useRef<Set<string>>(new Set());
  const remoteStateSyncTimeoutRef = useRef<number | null>(null);

  const handleAudioEndedRef = useRef<() => void>(() => { });
  const handleAudioErrorRef = useRef<() => void>(() => { });
  const playTrackRef = useRef<(track: Track, newQueue?: Track[], startSearchIndex?: number) => Promise<void>>(async () => { });
  const handleNextRef = useRef<(overrideIndex?: any, startSearchIndex?: number) => void>(() => { });

  useEffect(() => {
    activeProfileIdRef.current = activeProfileId;
    cloudTokenRef.current = cloudToken;
    cloudUserRef.current = cloudUser;
    cloudUsernameRef.current = cloudUsername;
  }, [activeProfileId, cloudToken, cloudUser, cloudUsername]);

  const autoSyncProfiles = (updatedProfiles: UserProfile[]) => {
    if (!cloudToken) return;
    fetch('/api/sync/profiles', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cloudToken}`
      },
      body: JSON.stringify({ profiles: updatedProfiles })
    }).then(res => {
      if (res.ok) logDebug('database', 'Profiles configuration auto-saved to cloud database.');
    }).catch(err => {
      logDebug('error', `Auto-sync profiles failed: ${err}`);
    });
  };

  // ── Sync Active Profile back to Profiles DB Helper ──────────────
  const updateProfileData = (profileId: string, updates: Partial<UserProfile>) => {
    setProfiles(prev => {
      let baseProfiles = prev;
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('spice_profiles_list');
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) {
              baseProfiles = parsed;
            }
          } catch { }
        }
      }

      const updated = baseProfiles.map(p => {
        if (p.id === profileId) {
          return { ...p, ...updates };
        }
        return p;
      });
      localStorage.setItem('spice_profiles_list', JSON.stringify(updated));
      autoSyncProfiles(updated);
      return updated;
    });
  };

  const updateActiveProfileData = (updates: Partial<UserProfile>) => {
    updateProfileData(activeProfileId, updates);
  };

  const autoSyncHistory = (updatedHistory: Track[]) => {
    if (!cloudToken) return;
    fetch('/api/sync/history', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cloudToken}`
      },
      body: JSON.stringify({ history: updatedHistory, profileId: activeProfileId })
    }).then(res => {
      if (res.ok) logDebug('database', 'Listening history auto-saved to cloud database.');
    }).catch(err => {
      logDebug('error', `Auto-sync history failed: ${err}`);
    });
  };

  const autoSyncPlaylists = (updatedPlaylists: Playlist[]) => {
    if (!cloudToken) return;
    fetch('/api/sync/playlists', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cloudToken}`
      },
      body: JSON.stringify({ playlists: ownedPlaylistsOnly(updatedPlaylists), profileId: activeProfileId })
    }).then(res => {
      if (res.ok) logDebug('database', 'Playlists configuration auto-saved to cloud database.');
    }).catch(err => {
      logDebug('error', `Auto-sync playlists failed: ${err}`);
    });
  };

  const autoSyncLikes = (updatedLikes: string[], updatedDetails: Record<string, Track>) => {
    if (!cloudToken) return;
    fetch('/api/sync/likes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cloudToken}`
      },
      body: JSON.stringify({
        likedTracks: updatedLikes,
        likedTrackDetails: updatedDetails,
        profileId: activeProfileId,
      })
    }).then(res => {
      if (res.ok) logDebug('database', 'Liked tracks auto-saved to cloud database.');
    }).catch(err => {
      logDebug('error', `Auto-sync likes failed: ${err}`);
    });
  };

  const restoreLastFmAccountLink = useCallback(async (token: string | null = cloudToken) => {
    if (!token) {
      setLastFmAccountLinked(false);
      localStorage.setItem('spice_lastfm_account_linked', 'false');
      return;
    }

    try {
      const response = await fetch('/api/profile/connections', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json().catch(() => ({})) as {
        lastfm?: {
          linked?: boolean;
          name?: string;
          linkedAt?: string;
        };
        message?: string;
      };

      if (!response.ok) {
        throw new Error(data.message || 'Failed to restore Last.fm account link.');
      }

      if (data.lastfm?.linked) {
        const linkedUser = data.lastfm.name || 'Last.fm account';
        setLastFmAccountLinked(true);
        setLastFmLinkedUser(linkedUser);
        setProfileSyncEnabled(true);
        localStorage.setItem('spice_lastfm_account_linked', 'true');
        localStorage.setItem('spice_lastfm_linked_user', linkedUser);
        localStorage.setItem('spice_profile_sync_enabled', 'true');
        setLastFmLinkStatus(`Restored ${linkedUser} from your SPICE account. Profile sync is enabled.`);
        logDebug('profile', `Last.fm account link restored for ${linkedUser}.`);
      } else {
        setLastFmAccountLinked(false);
        localStorage.setItem('spice_lastfm_account_linked', 'false');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to restore Last.fm account link.';
      logDebug('error', `Last.fm account restore failed: ${message}`);
    }
  }, [cloudToken, logDebug]);

  const [isMounted, setIsMounted] = useState(false);

  // Load localStorage states safely on client mount to prevent SSR hydration mismatch
  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('spice_accent_theme');
      if (isAccentTheme(savedTheme)) setAccentTheme(savedTheme);

      const savedSurface = localStorage.getItem('spice_visual_surface');
      if (isVisualSurface(savedSurface)) setVisualSurface(savedSurface);

      const savedArtworkShape = localStorage.getItem('spice_artwork_shape');
      if (isArtworkShape(savedArtworkShape)) setArtworkShape(savedArtworkShape);

      const savedMotionLevel = localStorage.getItem('spice_motion_level');
      if (isMotionLevel(savedMotionLevel)) setMotionLevel(savedMotionLevel);

      const savedInterfaceScale = localStorage.getItem('spice_interface_scale');
      if (isInterfaceScale(savedInterfaceScale)) setInterfaceScale(savedInterfaceScale);

      const savedQuality = localStorage.getItem('spice_audio_quality');
      if (savedQuality) setAudioQuality(savedQuality as any);

      const savedProtocol = localStorage.getItem('spice_stream_protocol');
      const embedTransportMigrationComplete = localStorage.getItem('spice_stream_embed_migration_v1034') === 'true';
      if (savedProtocol === 'embed' && !embedTransportMigrationComplete) {
        localStorage.setItem('spice_stream_protocol', 'proxy');
        localStorage.setItem('spice_stream_embed_migration_v1034', 'true');
        setStreamProtocol('proxy');
        streamProtocolRef.current = 'proxy';
      } else if (isStreamProtocol(savedProtocol)) {
        setStreamProtocol(savedProtocol);
        streamProtocolRef.current = savedProtocol;
      }

      setProfileSyncEnabled(localStorage.getItem('spice_profile_sync_enabled') === 'true');
      setLastFmSessionKey(localStorage.getItem('spice_lastfm_session_key') || '');
      setLastFmAccountLinked(
        localStorage.getItem('spice_lastfm_account_linked') === 'true'
        && Boolean(localStorage.getItem('spice_cloud_token')),
      );
      setLastFmLinkedUser(localStorage.getItem('spice_lastfm_linked_user') || '');
      localStorage.removeItem('spice_lastfm_api_key');
      localStorage.removeItem('spice_lastfm_shared_secret');
      localStorage.removeItem('spice_lastfm_link_token');
      setListenBrainzToken(localStorage.getItem('spice_listenbrainz_token') || '');

      const savedSearchProvider = localStorage.getItem('spice_search_provider');
      if (isSearchProvider(savedSearchProvider)) {
        setSearchProvider(savedSearchProvider);
      }
      setRecentSearchEntries(getRecentCachedSearches());

      setSidebarHidden(localStorage.getItem('spice_sidebar_hidden') === 'true');

      const savedSidebarSearch = localStorage.getItem('spice_sidebar_search_enabled');
      if (savedSidebarSearch !== null) {
        setSidebarSearchEnabled(savedSidebarSearch !== 'false');
      }

      const savedSidebarProfile = localStorage.getItem('spice_sidebar_profile_enabled');
      if (savedSidebarProfile !== null) {
        setSidebarProfileEnabled(savedSidebarProfile !== 'false');
      }

      const savedLocalDb = localStorage.getItem('spice_local_db_fallback');
      if (savedLocalDb) setIsLocalDbFallback(savedLocalDb === 'true');

      const savedPlacement = localStorage.getItem('spice_player_placement');
      if (savedPlacement) setPlayerPlacement(savedPlacement as any);

      const savedViewMode = localStorage.getItem('spice_player_view_mode');
      if (savedViewMode) setPlayerViewMode(savedViewMode as any);

      const savedPlayerBarDensity = localStorage.getItem('spice_player_bar_density');
      if (isPlayerBarDensity(savedPlayerBarDensity)) setPlayerBarDensity(savedPlayerBarDensity);

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
        const hydratedHistory = (activeProf.history || []).map(enrichTrackSnapshot);
        const hydratedLikedDetails = Object.fromEntries(
          Object.entries(activeProf.likedTrackDetails || {}).map(([id, track]) => [id, enrichTrackSnapshot(track)]),
        );
        const hydratedPlaylists = (activeProf.customPlaylists || []).map((playlist) => ({
          ...playlist,
          tracks: (playlist.tracks || []).map(enrichTrackSnapshot),
        }));
        rememberTrackSnapshots([
          ...hydratedHistory,
          ...Object.values(hydratedLikedDetails),
          ...hydratedPlaylists.flatMap((playlist) => playlist.tracks),
        ]);

        setActiveProfileId(activeProf.id);
        setLikedTracks(new Set(activeProf.likedTracks));
        setLikedTrackDetails(hydratedLikedDetails);
        setCustomPlaylists(hydratedPlaylists);
        setHistory(hydratedHistory);
        setEditName(activeProf.displayName);
        setEditBio(activeProf.bio);
        setEditGradient(activeProf.gradient);
        setEditPasscode(activeProf.passcode || '');
        setEditAvatarUrl(activeProf.avatarUrl || '');

        // Restore cloud token, user, and username from active profile on mount
        const nextToken = activeProf.cloudToken || null;
        const nextUser = activeProf.cloudUser || null;
        const nextUsername = activeProf.cloudUsername || null;
        setCloudToken(nextToken);
        setCloudUser(nextUser);
        setCloudUsername(nextUsername);
        setUsernameInput(nextUsername || '');

        const savedPlayback = getPlaybackState(activeProf.id);
        if (savedPlayback) {
          setCurrentTrack(savedPlayback.currentTrack);
          setQueue(savedPlayback.queue.length > 0 ? savedPlayback.queue : [savedPlayback.currentTrack]);
          setQueueIndex(Math.min(savedPlayback.queueIndex, Math.max(savedPlayback.queue.length - 1, 0)));
          setProgress(savedPlayback.progress);
        } else if (hydratedHistory.length > 0) {
          setCurrentTrack(hydratedHistory[0]);
          setQueue([hydratedHistory[0]]);
        }

        const cachedSearch = getLatestCachedSearch();
        if (cachedSearch) {
          setSearchQuery(cachedSearch.query);
          setSearchResults(playableSearchTracks(cachedSearch.tracks as Track[]));
          setSearchResultsSource('cache');
          const cachedProvider = cachedSearch.sourceId ?? 'youtube_music';
          if (isSearchProvider(cachedProvider)) {
            setSearchProvider(cachedProvider);
          }
        }
        logDebug('system', `Loaded active profile "${activeProf.displayName}" successfully. Hydration secured.`);
      }
    }
  }, []);

  useEffect(() => {
    if (!cloudToken) return;
    void restoreLastFmAccountLink(cloudToken);
  }, [cloudToken, restoreLastFmAccountLink]);

  const loadPlaylistInvite = useCallback(async (token: string) => {
    setInviteStatus('Loading shared playlist invite...');
    try {
      const response = await fetch(`/api/playlists/invites/${encodeURIComponent(token)}`);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || 'This shared playlist invite is not available.');
      }

      setInvitePreview({
        token,
        playlist: normalizePlaylistSnapshot(data.playlist),
        expiresAt: data.invite?.expiresAt || null,
      });
      setInviteStatus(cloudToken ? null : 'Sign in to your SPICE account to accept this shared playlist.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load shared playlist invite.';
      setInviteStatus(message);
      setInvitePreview(null);
      logDebug('error', `Shared playlist invite preview failed: ${message}`);
    }
  }, [cloudToken, logDebug]);

  useEffect(() => {
    if (!isMounted || typeof window === 'undefined') return;

    const inviteToken = new URLSearchParams(window.location.search).get('playlistInvite');
    if (inviteToken) {
      void loadPlaylistInvite(inviteToken);
    }
  }, [isMounted, loadPlaylistInvite]);

  // ── YouTube Embedded Player Fallback API Integration ──────────────
  useEffect(() => {
    if (!isMounted || currentTrack.id === 'placeholder') return;

    const persistPlayback = () => {
      savePlaybackState(activeProfileId, {
        currentTrack,
        queue,
        queueIndex,
        progress: progressRef.current,
        savedAt: Date.now(),
      });
    };
    persistPlayback();

    const interval = setInterval(persistPlayback, 5000);
    return () => clearInterval(interval);
  }, [activeProfileId, currentTrack, isMounted, queue, queueIndex]);

  const initializeYtPlayer = useCallback(() => {
    if (typeof window === 'undefined' || ytPlayerRef.current) return;
    try {
      logDebug('system', 'Initializing YouTube Embed Player Instance...');
      ytPlayerRef.current = new (window as any).YT.Player('spice-yt-iframe-container', {
        height: '100%',
        width: '100%',
        videoId: 'J7p4bzqLvCw',
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
            logDebug('system', 'YouTube Iframe Embed Player instance successfully cued!');
            event.target.setVolume(volume);
          },
          onStateChange: (event: any) => {
            const state = event.data;
            if (state === -1) {
              logDebug('stream', 'YouTube Embed State: UNSTARTED (-1)');
            } else if (state === 1) { // Playing
              logDebug('stream', 'YouTube Embed State: ACTIVE AUDIO PLAYBACK (1)');
              if (!shouldAutoPlayRef.current) {
                if (typeof event.target?.pauseVideo === 'function') {
                  event.target.pauseVideo();
                }
                isPlayingRef.current = false;
                setIsPlaying(false);
                isLoadingStreamRef.current = false;
                setIsLoadingStream(false);
                return;
              }
              isPlayingRef.current = true;
              setIsPlaying(true);
              isLoadingStreamRef.current = false;
              setIsLoadingStream(false);
            } else if (state === 2) { // Paused
              logDebug('stream', 'YouTube Embed State: AUDIO PAUSED (2)');
              isPlayingRef.current = false;
              setIsPlaying(false);
            } else if (state === 3) { // Buffering
              logDebug('stream', 'YouTube Embed State: BUFFERING AUDIO (3)');
            } else if (state === 5) { // Cued
              logDebug('stream', 'YouTube Embed State: AUDIO TRACK CUED (5)');
            } else if (state === 0) { // Ended
              logDebug('stream', 'YouTube Embed State: PLAYBACK COMPLETED (0)');
              handleAudioEndedRef.current?.();
            }
          },
          onError: (event: any) => {
            const code = event.data;
            const activeTrack = currentTrackRef.current;
            const activeTrackKey = playbackTrackKey(activeTrack);
            if (code === 2) {
              logDebug('error', 'YouTube Embed Error (2): The request contains an invalid parameter value.');
            } else if (code === 5) {
              logDebug('error', 'YouTube Embed Error (5): The requested content cannot be played in an HTML5 player.');
            } else if (code === 100) {
              logDebug('error', 'YouTube Embed Error (100): The requested video was not found (removed or marked as private).');
            } else if (code === 101 || code === 150) {
              logDebug('error', 'YouTube Embed Error (101/150): The video owner has disallowed embedded playbacks for this track. Switch stream endpoint to direct proxy.');
            } else {
              logDebug('error', `YouTube Embed Player error: code ${code}`);
            }
            if (
              activeTrack.id !== 'placeholder'
              && isYouTubeTrack(activeTrack)
              && streamProtocolRef.current === 'embed'
              && !embedProxyRetryRef.current.has(activeTrackKey)
            ) {
              embedProxyRetryRef.current.add(activeTrackKey);
              logDebug('diagnostics', 'YouTube embed was blocked. Retrying this track with the direct proxy transport before skipping.');
              setShowVideoPlayer(false);
              setStreamProtocol('proxy');
              streamProtocolRef.current = 'proxy';
              localStorage.setItem('spice_stream_protocol', 'proxy');
              void playTrackRef.current(activeTrack, queueRef.current, queueIndexRef.current);
              return;
            }
            // Trigger self-healing error skip logic upon iframe playback error
            handleAudioErrorRef.current?.();
          }
        }
      });
    } catch (e) {
      console.error('Error initializing YouTube player:', e);
      logDebug('error', `YouTube Embed player initialization failed: ${e}`);
    }
  }, [volume, logDebug]);

  // Load YouTube Iframe API on client mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    logDebug('system', 'Client environment secure. Initializing YouTube Embed script loader...');
    if (!document.getElementById('youtube-iframe-api-script')) {
      logDebug('system', 'Injecting script tag: https://www.youtube.com/iframe_api');
      const tag = document.createElement('script');
      tag.id = 'youtube-iframe-api-script';
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }

    (window as any).onYouTubeIframeAPIReady = () => {
      logDebug('system', 'Global onYouTubeIframeAPIReady hook triggered. Cueing video player instances.');
      initializeYtPlayer();
    };

    // Prevent race conditions where window.YT is defined but window.YT.Player is not yet populated
    const checkInterval = setInterval(() => {
      if ((window as any).YT && (window as any).YT.Player) {
        logDebug('system', 'YouTube Iframe API libraries detected. Initializing instances.');
        initializeYtPlayer();
        clearInterval(checkInterval);
      }
    }, 100);

    return () => clearInterval(checkInterval);
  }, [initializeYtPlayer]);

  // Track progress updates for Embed mode via standard interval
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && streamProtocol === 'embed' && isYouTubeTrack(currentTrack) && ytPlayerRef.current && typeof ytPlayerRef.current.getCurrentTime === 'function') {
      interval = setInterval(() => {
        try {
          const currentTime = ytPlayerRef.current.getCurrentTime();
          const durationTime = ytPlayerRef.current.getDuration();
          setProgress(currentTime);
          if (durationTime > 0) {
            setDuration(durationTime);
          }
        } catch { }
      }, 500);
    }
    return () => clearInterval(interval);
  }, [currentTrack.id, isPlaying, streamProtocol]);

  // Sync volume with Embed Player
  useEffect(() => {
    if (streamProtocol === 'embed' && isYouTubeTrack(currentTrack) && ytPlayerRef.current && typeof ytPlayerRef.current.setVolume === 'function') {
      ytPlayerRef.current.setVolume(volume);
    }
  }, [currentTrack.id, volume, streamProtocol]);

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
        rememberTrackSnapshots([
          ...(trendData.tracks || []),
          ...(chillData.tracks || []),
          ...(energyData.tracks || []),
        ]);

        if (trendData.tracks?.length > 0) {
          setHomeTrending(trendData.tracks);
          // Set trending pick as default if queue only contains placeholder
          const firstTrack = trendData.tracks[0];
          setQueue(prevQueue => {
            if (prevQueue.length === 1 && prevQueue[0].id === 'placeholder') {
              return [firstTrack];
            }
            return prevQueue;
          });
          setCurrentTrack(prevTrack => {
            if (prevTrack.id === 'placeholder') {
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

  const handleAudioCanPlay = () => {
    if (!audioRef.current || !isPlaying) return;
    audioRef.current.play().catch(() => {
      setIsPlaying(false);
      logDebug('stream', 'Direct audio is ready. Browser autoplay was blocked; use the play button to continue.');
    });
  };

  // ── Cloud Accounts Synchronization & Authentication ──────────────
  const syncWithCloud = async (
    token: string | null = cloudToken,
    profileId: string = activeProfileId,
    sessionOverride: Partial<Pick<UserProfile, 'cloudUser' | 'cloudUsername'>> = {},
  ) => {
    if (!token) return;
    if (syncLockRef.current) {
      logDebug('database', 'Sync already in progress. Skipping duplicate sync request.');
      return;
    }
    const syncProfileId = profileId;
    syncLockRef.current = true;
    setSyncingStatus('syncing');
    setDbError(null);
    logDebug('database', 'Initiating full sync merge with Cloud Neon Database...');

    // Retry helper with exponential backoff
    const fetchWithRetry = async (url: string, options: RequestInit = {}, label: string, maxRetries = 3): Promise<Response> => {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const res = await fetch(url, options);
          if (res.ok) return res;
          if (attempt < maxRetries && res.status >= 500) {
            const delay = 500 * Math.pow(2, attempt - 1);
            logDebug('database', `[SYNC] [WARN] ${label} returned ${res.status}, retrying in ${delay}ms (attempt ${attempt}/${maxRetries})`);
            await new Promise(r => setTimeout(r, delay));
            continue;
          }
          return res; // Return non-retriable errors as-is
        } catch (err) {
          if (attempt < maxRetries) {
            const delay = 500 * Math.pow(2, attempt - 1);
            logDebug('database', `[SYNC] [WARN] ${label} network error, retrying in ${delay}ms (attempt ${attempt}/${maxRetries})`);
            await new Promise(r => setTimeout(r, delay));
          } else {
            throw err;
          }
        }
      }
      throw new Error(`${label} failed after ${maxRetries} retries`);
    };

    try {
      // 0. Read current local states directly from localStorage to completely bypass React state hydration race conditions
      const savedProfilesStr = localStorage.getItem('spice_profiles_list');
      let localProfiles: UserProfile[] = profiles;
      try {
        if (savedProfilesStr) {
          const parsed = JSON.parse(savedProfilesStr);
          if (parsed && parsed.length > 0) localProfiles = parsed;
        }
      } catch { }

      const activeProf = localProfiles.find(p => p.id === syncProfileId) || localProfiles[0] || initialDefaultProfile;
      const syncStillMatchesActiveProfile = () => (
        activeProfileIdRef.current === activeProf.id && cloudTokenRef.current === token
      );
      const canUseCurrentSession = syncStillMatchesActiveProfile();
      const activeSessionUser = sessionOverride.cloudUser !== undefined
        ? sessionOverride.cloudUser
        : (activeProf.cloudUser ?? (canUseCurrentSession ? cloudUserRef.current : null));
      const activeSessionUsername = sessionOverride.cloudUsername !== undefined
        ? sessionOverride.cloudUsername
        : (activeProf.cloudUsername ?? (canUseCurrentSession ? cloudUsernameRef.current : null));

      const localLikes = new Set<string>(activeProf.likedTracks || []);
      const localLikedDetails = activeProf.likedTrackDetails || {};
      const localHistory = activeProf.history || [];
      const localPlaylists = activeProf.customPlaylists || [];

      // 1. Pull profiles list
      const profRes = await fetchWithRetry('/api/sync/profiles', {
        headers: { 'Authorization': `Bearer ${token}` }
      }, 'Profiles pull');
      if (!profRes.ok) {
        const errJson = await profRes.json().catch(() => ({}));
        throw new Error(errJson.message || `Failed to retrieve profiles (Status ${profRes.status})`);
      }
      const profData = await profRes.json();
      const serverProfiles = profData.profiles ?? [];
      logDebug('database', `[SYNC] [OK] Profiles pulled (${serverProfiles.length} from cloud)`);

      if (profData.localFallback) {
        setIsLocalDbFallback(true);
        localStorage.setItem('spice_local_db_fallback', 'true');
      } else {
        setIsLocalDbFallback(false);
        localStorage.setItem('spice_local_db_fallback', 'false');
      }

      // 2. Pull active profile likes
      let serverLikes: string[] = [];
      let serverLikedDetails: Record<string, Track> = {};
      try {
        const likesRes = await fetchWithRetry(`/api/sync/likes?profileId=${encodeURIComponent(activeProf.id)}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }, 'Likes pull');
        if (likesRes.ok) {
          const likesData = await likesRes.json();
          serverLikes = likesData.likedTracks ?? [];
          serverLikedDetails = likesData.likedTrackDetails ?? {};
          logDebug('database', `[SYNC] [OK] Likes pulled (${serverLikes.length} from cloud)`);
        } else {
          logDebug('database', `[SYNC] [ERROR] Likes pull failed (Status ${likesRes.status}), using local only`);
        }
      } catch (err: any) {
        logDebug('database', `[SYNC] [ERROR] Likes pull error: ${err.message}, using local only`);
      }

      // 3. Pull active profile history
      let serverHistory: Track[] = [];
      try {
        const histRes = await fetchWithRetry(`/api/sync/history?profileId=${encodeURIComponent(activeProf.id)}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }, 'History pull');
        if (histRes.ok) {
          const histData = await histRes.json();
          serverHistory = histData.history ?? [];
          logDebug('database', `[SYNC] [OK] History pulled (${serverHistory.length} from cloud)`);
        } else {
          logDebug('database', `[SYNC] [ERROR] History pull failed (Status ${histRes.status}), using local only`);
        }
      } catch (err: any) {
        logDebug('database', `[SYNC] [ERROR] History pull error: ${err.message}, using local only`);
      }

      // 4. Pull active profile playlists
      let serverPlaylists: any[] = [];
      let playlistsPullSucceeded = false;
      try {
        const plRes = await fetchWithRetry(`/api/sync/playlists?profileId=${encodeURIComponent(activeProf.id)}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }, 'Playlists pull');
        if (plRes.ok) {
          const plData = await plRes.json();
          serverPlaylists = plData.playlists ?? [];
          playlistsPullSucceeded = true;
          logDebug('database', `[SYNC] [OK] Playlists pulled (${serverPlaylists.length} from cloud)`);
        } else {
          logDebug('database', `[SYNC] [ERROR] Playlists pull failed (Status ${plRes.status}), using local only`);
        }
      } catch (err: any) {
        logDebug('database', `[SYNC] [ERROR] Playlists pull error: ${err.message}, using local only`);
      }

      // 5. Merge Active Profile Data
      const mergedLikes = new Set([...localLikes, ...serverLikes]);
      const mergedLikesArray = Array.from(mergedLikes);
      const mergedLikedDetails = Object.fromEntries(
        mergedLikesArray
          .map((id) => {
            const localTrack = localLikedDetails[id];
            const serverTrack = serverLikedDetails[id];
            if (!localTrack && !serverTrack) return null;
            return [id, enrichTrackSnapshot(
              localTrack && serverTrack ? mergeTrackSnapshots(serverTrack, localTrack) : (localTrack || serverTrack),
            )];
          })
          .filter((entry): entry is [string, Track] => entry !== null),
      );

      const mergedHistoryMap = new Map<string, Track>();
      [...serverHistory, ...localHistory].forEach(track => {
        mergedHistoryMap.set(track.id, enrichTrackSnapshot(mergeTrackSnapshots(mergedHistoryMap.get(track.id), track)));
      });
      const mergedHistory = Array.from(mergedHistoryMap.values()).slice(0, 50);

      const localOwnedPlaylists = localPlaylists.filter((playlist) => !playlist.shared);
      const mergedPlaylists = playlistsPullSucceeded ? [...localOwnedPlaylists] : [...localPlaylists];
      serverPlaylists.forEach((serverPl: any) => {
        const incoming = normalizePlaylistSnapshot(serverPl);
        const existingIndex = mergedPlaylists.findIndex((playlist) => (
          playlist.id === incoming.id || (!playlist.shared && !incoming.shared && playlist.title === incoming.title)
        ));

        if (existingIndex === -1) {
          mergedPlaylists.push(incoming);
        } else {
          const existing = mergedPlaylists[existingIndex];
          const mergedTracks = [...existing.tracks];
          incoming.tracks.forEach((track) => {
            const trackIndex = mergedTracks.findIndex((existingTrack) => (
              `${existingTrack.sourceId ?? 'youtube_music'}:${existingTrack.id}` === `${track.sourceId ?? 'youtube_music'}:${track.id}`
            ));
            if (trackIndex === -1) {
              mergedTracks.push(track);
            } else {
              mergedTracks[trackIndex] = enrichTrackSnapshot(mergeTrackSnapshots(mergedTracks[trackIndex], track));
            }
          });
          mergedPlaylists[existingIndex] = {
            ...existing,
            ...incoming,
            tracks: mergedTracks,
          };
        }
      });

      // 6. Merge Profiles Configuration List
      const mergedProfiles = [...localProfiles];
      serverProfiles.forEach((serverProf: any) => {
        const existingIdx = mergedProfiles.findIndex(p => p.id === serverProf.id);
        if (existingIdx !== -1) {
          mergedProfiles[existingIdx] = {
            ...mergedProfiles[existingIdx],
            displayName: serverProf.displayName,
            bio: serverProf.bio || '',
            gradient: serverProf.gradient,
            songsPlayed: serverProf.songsPlayed ?? 0,
            joinedAt: serverProf.joinedAt,
            passcode: serverProf.passcode || undefined,
            avatarUrl: serverProf.avatarUrl || undefined,
            // Explicitly preserve credentials in case they are missing from serverProf
            cloudToken: mergedProfiles[existingIdx].cloudToken ?? null,
            cloudUser: mergedProfiles[existingIdx].cloudUser ?? null,
            cloudUsername: mergedProfiles[existingIdx].cloudUsername ?? null,
          };
        } else {
          mergedProfiles.push({
            id: serverProf.id,
            displayName: serverProf.displayName,
            bio: serverProf.bio || '',
            gradient: serverProf.gradient,
            songsPlayed: serverProf.songsPlayed ?? 0,
            joinedAt: serverProf.joinedAt,
            passcode: serverProf.passcode || undefined,
            avatarUrl: serverProf.avatarUrl || undefined,
            likedTracks: [],
            likedTrackDetails: {},
            customPlaylists: [],
            history: [],
          });
        }
      });

      // 7. Inject active profile merges
      const finalProfiles = mergedProfiles.map(p => {
        if (p.id === activeProf.id) {
          return {
            ...p,
            likedTracks: mergedLikesArray,
            likedTrackDetails: mergedLikedDetails,
            customPlaylists: mergedPlaylists,
            history: mergedHistory,
            // Keep the authenticated account bound to this exact profile.
            cloudToken: token,
            cloudUser: activeSessionUser,
            cloudUsername: activeSessionUsername,
          };
        }
        return p;
      });
      let latestSavedProfiles: UserProfile[] = [];
      const latestSavedProfilesStr = localStorage.getItem('spice_profiles_list');
      if (latestSavedProfilesStr) {
        try {
          const parsed = JSON.parse(latestSavedProfilesStr);
          if (Array.isArray(parsed)) {
            latestSavedProfiles = parsed;
          }
        } catch { }
      }
      const profilesToPersist = finalProfiles.map((profile) => {
        const latest = latestSavedProfiles.find(savedProfile => savedProfile.id === profile.id);
        if (!latest) return profile;

        if (profile.id === activeProf.id) {
          if (latest.cloudToken === token) {
            return {
              ...profile,
              cloudToken: token,
              cloudUser: latest.cloudUser !== undefined ? latest.cloudUser : profile.cloudUser,
              cloudUsername: latest.cloudUsername !== undefined ? latest.cloudUsername : profile.cloudUsername,
            };
          }
          return profile;
        }

        return {
          ...profile,
          cloudToken: latest.cloudToken !== undefined ? latest.cloudToken : (profile.cloudToken ?? null),
          cloudUser: latest.cloudUser !== undefined ? latest.cloudUser : (profile.cloudUser ?? null),
          cloudUsername: latest.cloudUsername !== undefined ? latest.cloudUsername : (profile.cloudUsername ?? null),
        };
      });

      rememberTrackSnapshots([
        ...Object.values(mergedLikedDetails),
        ...mergedHistory,
        ...mergedPlaylists.flatMap((playlist) => playlist.tracks),
      ]);
      setProfiles(profilesToPersist);
      localStorage.setItem('spice_profiles_list', JSON.stringify(profilesToPersist));

      // 8. Update visible client state only if this sync still belongs to the selected profile.
      if (activeProf && syncStillMatchesActiveProfile()) {
        const persistedActiveProfile = profilesToPersist.find(profile => profile.id === activeProf.id);
        const visibleSessionUser = persistedActiveProfile?.cloudUser ?? activeSessionUser ?? null;
        const visibleSessionUsername = persistedActiveProfile?.cloudUsername ?? activeSessionUsername ?? null;
        setLikedTracks(mergedLikes);
        setLikedTrackDetails(mergedLikedDetails);
        setHistory(mergedHistory);
        setCustomPlaylists(mergedPlaylists);
        setActiveProfileId(activeProf.id);
        localStorage.setItem('spice_active_profile_id', activeProf.id);
        setEditName(activeProf.displayName);
        setEditBio(activeProf.bio);
        setEditGradient(activeProf.gradient);
        setEditPasscode(activeProf.passcode || '');
        setEditAvatarUrl(activeProf.avatarUrl || '');
        setCloudToken(token);
        setCloudUser(visibleSessionUser);
        setCloudUsername(visibleSessionUsername);
        setUsernameInput(visibleSessionUsername || '');
        cloudTokenRef.current = token;
        cloudUserRef.current = visibleSessionUser;
        cloudUsernameRef.current = visibleSessionUsername;
      }

      // 9. Push Merged States to Cloud Database (each independently)
      let pushFailures = 0;
      const pushEndpoints = [
        { label: 'Likes', url: '/api/sync/likes', body: { likedTracks: mergedLikesArray, likedTrackDetails: mergedLikedDetails, profileId: activeProf.id } },
        { label: 'History', url: '/api/sync/history', body: { history: mergedHistory, profileId: activeProf.id } },
        { label: 'Playlists', url: '/api/sync/playlists', body: { playlists: ownedPlaylistsOnly(mergedPlaylists), profileId: activeProf.id } },
        { label: 'Profiles', url: '/api/sync/profiles', body: { profiles: profilesToPersist } },
      ];

      for (const ep of pushEndpoints) {
        try {
          const res = await fetchWithRetry(ep.url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(ep.body)
          }, `${ep.label} push`);
          if (res.ok) {
            logDebug('database', `[SYNC] [OK] ${ep.label} pushed successfully`);
          } else {
            pushFailures++;
            logDebug('database', `[SYNC] [ERROR] ${ep.label} push failed (Status ${res.status})`);
          }
        } catch (err: any) {
          pushFailures++;
          logDebug('database', `[SYNC] [ERROR] ${ep.label} push error: ${err.message}`);
        }
      }

      if (pushFailures === 0) {
        logDebug('database', `[SYNC] Merged state with cloud database successfully. Merged: ${mergedLikesArray.length} likes, ${mergedHistory.length} history items, ${mergedPlaylists.length} playlists, ${profilesToPersist.length} profiles.`);
        setSyncingStatus('success');
      } else {
        logDebug('database', `[SYNC] Partial sync completed with ${pushFailures} push failure(s). Local state is up-to-date.`);
        setSyncingStatus('success');
      }
      setTimeout(() => setSyncingStatus(null), 3000);
    } catch (err: any) {
      console.error('Cloud synchronization error:', err);
      logDebug('error', `Cloud synchronization failed: ${err.message || err}`);
      if (err.message === 'db_not_configured') {
        setDbError('DATABASE_URL is not set in backend environment.');
      }
      setSyncingStatus('error');
    } finally {
      syncLockRef.current = false;
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const authProfileId = activeProfileIdRef.current;
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
      setCloudUsername(null);
      setUsernameInput('');
      cloudTokenRef.current = data.token;
      cloudUserRef.current = data.user;
      cloudUsernameRef.current = null;
      updateProfileData(authProfileId, {
        cloudToken: data.token,
        cloudUser: data.user,
        cloudUsername: null,
      });
      setAuthEmail('');
      setAuthPassword('');
      logDebug('auth', `User "${data.user.email}" authenticated successfully via ${authMode}. Token generated.`);

      // Auto sync after login
      await syncWithCloud(data.token, authProfileId, { cloudUser: data.user, cloudUsername: null });
      await restoreLastFmAccountLink(data.token);
      void fetchUsername(data.token, authProfileId);
    } catch (err: any) {
      console.error(err);
      logDebug('error', `Authentication attempt failed: ${err.message || err}`);
      setAuthError(err.message || 'Server authentication failed.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    const logoutProfileId = activeProfileIdRef.current;
    localStorage.removeItem('spice_cloud_token');
    localStorage.removeItem('spice_cloud_user');
    setCloudToken(null);
    setCloudUser(null);
    setCloudUsername(null);
    setUsernameInput('');
    cloudTokenRef.current = null;
    cloudUserRef.current = null;
    cloudUsernameRef.current = null;
    updateProfileData(logoutProfileId, {
      cloudToken: null,
      cloudUser: null,
      cloudUsername: null,
    });
    setLastFmAccountLinked(false);
    localStorage.setItem('spice_lastfm_account_linked', 'false');
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
      syncWithCloud(cloudToken, activeProfileId);
    }
  }, [cloudToken, activeProfileId]);

  const currentTrackKey = playbackTrackKey(currentTrack);
  const setPlaybackPlaying = (nextPlaying: boolean) => {
    isPlayingRef.current = nextPlaying;
    setIsPlaying(nextPlaying);
  };

  const handleAudioEnded = () => {
    // Increment songs played on completion
    const currentSongsPlayed = activeProfileRef.current?.songsPlayed ?? 0;
    const updatedSongsCount = currentSongsPlayed + 1;
    updateActiveProfileData({ songsPlayed: updatedSongsCount });

    const currentRepeatMode = repeatModeRef.current;
    const currentStreamProtocol = streamProtocolRef.current;
    const currentQueue = queueRef.current;
    const currentQueueIndex = queueIndexRef.current;

    logDebug('player', `Audio track ended. repeatMode: ${currentRepeatMode}, protocol: ${currentStreamProtocol}`);

    const scrobbleState = scrobbleStateRef.current;
    if (
      profileSyncEnabled
      && currentTrack.id !== 'placeholder'
      && (lastFmSessionKey.trim() || listenBrainzToken.trim())
      && scrobbleState
      && scrobbleState.trackKey === currentTrackKey
      && !scrobbleState.scrobbled
    ) {
      scrobbleState.scrobbled = true;
      void submitProfileListen('scrobble', scrobbleState.startedAt);
    }

    if (currentRepeatMode === 'one') {
      if (currentStreamProtocol === 'embed' && isYouTubeTrack(currentTrack) && ytPlayerRef.current && typeof ytPlayerRef.current.seekTo === 'function') {
        logDebug('player', 'Repeat mode is ONE. Seeking to 0 in YouTube embed...');
        ytPlayerRef.current.seekTo(0, true);
        ytPlayerRef.current.playVideo();
        setProgress(0);
        setIsPlaying(true);
      } else if (audioRef.current) {
        logDebug('player', 'Repeat mode is ONE. Replaying HTML5 audio...');
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(handleAudioError);
        setProgress(0);
        setIsPlaying(true);
      }
    } else if (currentRepeatMode === 'none' && currentQueueIndex === currentQueue.length - 1) {
      logDebug('player', 'Queue ended and repeatMode is NONE. Stopping playback.');
      setIsPlaying(false);
      setProgress(0);
      if (currentStreamProtocol === 'embed' && isYouTubeTrack(currentTrack) && ytPlayerRef.current && typeof ytPlayerRef.current.seekTo === 'function') {
        ytPlayerRef.current.seekTo(0, true);
        ytPlayerRef.current.pauseVideo();
      } else if (audioRef.current) {
        audioRef.current.currentTime = 0;
      }
    } else {
      logDebug('player', 'Advancing to next track in queue...');
      handleNextRef.current();
    }
  };

  const handleAudioError = () => {
    const activeTrack = currentTrackRef.current;
    const activeTrackKey = playbackTrackKey(activeTrack);

    if (
      activeTrack.id !== 'placeholder'
      && isYouTubeTrack(activeTrack)
      && streamProtocolRef.current !== 'embed'
      && !directEmbedRetryRef.current.has(activeTrackKey)
    ) {
      directEmbedRetryRef.current.add(activeTrackKey);
      setError('Direct audio failed. Falling back to the YouTube embedded player...');
      logDebug('diagnostics', 'Direct audio playback failed after stream resolution. Retrying this track in the YouTube embed transport before skipping.');
      setStreamProtocol('embed');
      streamProtocolRef.current = 'embed';
      setStreamUrl('youtube-embed-active');
      streamUrlRef.current = 'youtube-embed-active';
      void playTrackRef.current(activeTrack, queueRef.current, queueIndexRef.current);
      return;
    }

    setIsPlaying(false);
    setIsLoadingStream(false);
    setError('Playback failed. Attempting self-healing skip to next queue item...');

    const currentQueue = queueRef.current;
    if (currentQueue.length > 1) {
      logDebug('player', 'Playback error encountered. Scheduling self-healing skip in 1.5s...');
      if (errorSkipTimeoutRef.current) {
        clearTimeout(errorSkipTimeoutRef.current);
      }
      errorSkipTimeoutRef.current = setTimeout(() => {
        handleNextRef.current();
        errorSkipTimeoutRef.current = null;
      }, 1500);
    } else {
      setError('Failed to play stream. Upstream YouTube Music connection reset.');
    }
  };

  // Keep state refs updated on every state change/render to completely prevent stale closures in callbacks
  useEffect(() => { queueIndexRef.current = queueIndex; }, [queueIndex]);
  useEffect(() => { queueRef.current = queue; }, [queue]);
  useEffect(() => { repeatModeRef.current = repeatMode; }, [repeatMode]);
  useEffect(() => { streamProtocolRef.current = streamProtocol; }, [streamProtocol]);
  useEffect(() => { isShuffleRef.current = isShuffle; }, [isShuffle]);
  useEffect(() => { activeProfileRef.current = activeProfile; }, [activeProfile]);
  useEffect(() => { progressRef.current = progress; }, [progress]);
  useEffect(() => { currentTrackRef.current = currentTrack; }, [currentTrack]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { streamUrlRef.current = streamUrl; }, [streamUrl]);
  useEffect(() => { isLoadingStreamRef.current = isLoadingStream; }, [isLoadingStream]);
  useEffect(() => { durationRef.current = duration; }, [duration]);
  useEffect(() => { volumeRef.current = volume; }, [volume]);
  useEffect(() => () => {
    if (remoteStateSyncTimeoutRef.current) {
      clearTimeout(remoteStateSyncTimeoutRef.current);
      remoteStateSyncTimeoutRef.current = null;
    }
  }, []);

  async function submitProfileListen(type: ProfileListenType, listenedAt: number) {
    if (!profileSyncEnabled || currentTrack.id === 'placeholder') return;

    const lastfmSession = lastFmSessionKey.trim();
    const shouldSyncLastFm = Boolean(lastfmSession || lastFmAccountLinked);
    const listenbrainzToken = listenBrainzToken.trim();
    if (!shouldSyncLastFm && !listenbrainzToken) {
      setProfileSyncStatus('idle');
      return;
    }

    const durationMs = currentTrack.durationMs || (duration > 0 ? Math.round(duration * 1000) : undefined);
    try {
      const response = await fetch('/api/profile/listens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(cloudToken ? { Authorization: `Bearer ${cloudToken}` } : {}),
        },
        body: JSON.stringify({
          type,
          listenedAt,
          providers: {
            lastfm: shouldSyncLastFm
              ? {
                sessionKey: lastfmSession || undefined,
              }
              : undefined,
            listenbrainz: listenbrainzToken ? { token: listenbrainzToken } : undefined,
          },
          track: {
            id: currentTrack.id,
            title: currentTrack.title,
            artist: profileArtistName(currentTrack),
            album: currentTrack.album?.title,
            durationMs,
            sourceId: currentTrack.sourceId,
            permalinkUrl: profileOriginUrl(currentTrack),
          },
        }),
      });
      const data = await response.json().catch(() => ({})) as ProfileSyncResponse;
      if (!response.ok) {
        throw new Error((data as any).error || `Profile sync failed with status ${response.status}.`);
      }

      const syncedProviders = [
        data.results?.lastfm?.ok ? 'Last.fm' : null,
        data.results?.listenbrainz?.ok ? 'ListenBrainz' : null,
      ].filter(Boolean);
      const failedProviders = [
        data.results?.lastfm && !data.results.lastfm.skipped && !data.results.lastfm.ok
          ? `Last.fm: ${data.results.lastfm.error || 'failed'}`
          : null,
        data.results?.listenbrainz && !data.results.listenbrainz.skipped && !data.results.listenbrainz.ok
          ? `ListenBrainz: ${data.results.listenbrainz.error || 'failed'}`
          : null,
      ].filter(Boolean);

      if (syncedProviders.length > 0) {
        setProfileSyncStatus(type === 'playing_now' ? 'playing' : 'scrobbled');
        logDebug('profile', `${type === 'playing_now' ? 'Now playing' : 'Scrobble'} sent to ${syncedProviders.join(', ')} for "${currentTrack.title}".`);
      }

      if (failedProviders.length > 0) {
        setProfileSyncStatus('error');
        logDebug('error', `Profile sync issue: ${failedProviders.join(' | ')}`);
      }
    } catch (error) {
      setProfileSyncStatus('error');
      logDebug('error', `Profile sync request failed: ${error instanceof Error ? error.message : error}`);
    }
  }

  async function handleLinkLastFm() {
    setIsLinkingLastFm(true);
    setLastFmLinkStatus('Opening Last.fm sign-in...');

    try {
      const response = await fetch('/api/lastfm/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(cloudToken ? { Authorization: `Bearer ${cloudToken}` } : {}),
        },
        body: JSON.stringify({
          action: 'web_auth',
        }),
      });
      const data = await response.json().catch(() => ({})) as { authUrl?: string; message?: string };
      if (!response.ok || !data.authUrl) {
        throw new Error(data.message || 'Last.fm sign-in setup failed.');
      }

      const popup = window.open(
        data.authUrl,
        'spice-lastfm-auth',
        'width=560,height=720,menubar=no,toolbar=no,location=yes,status=no,scrollbars=yes,resizable=yes',
      );
      if (popup) {
        popup.focus();
        setLastFmLinkStatus(cloudToken
          ? 'Finish signing in inside the Last.fm popup. SPICE will save Last.fm to this account automatically.'
          : 'Finish signing in inside the Last.fm popup. Sign in to a SPICE account first if you want this saved in the backend.');
      } else {
        setLastFmLinkStatus('Popup blocked. Allow popups for SPICE and try Set up Last.fm again.');
      }
      logDebug('profile', 'Last.fm authorization page opened for account linking.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Last.fm link failed.';
      setLastFmLinkStatus(message);
      logDebug('error', `Last.fm link failed: ${message}`);
    } finally {
      setIsLinkingLastFm(false);
    }
  }

  useEffect(() => {
    if (currentTrack.id === 'placeholder') {
      scrobbleStateRef.current = null;
      setProfileSyncStatus('idle');
      return;
    }

    scrobbleStateRef.current = {
      trackKey: currentTrackKey,
      startedAt: Math.floor(Date.now() / 1000),
      nowPlayingSent: false,
      scrobbled: false,
    };
    setProfileSyncStatus('idle');
  }, [currentTrackKey]);

  useEffect(() => {
    if (!profileSyncEnabled || currentTrack.id === 'placeholder' || !isPlaying) return;
    if (!lastFmSessionKey.trim() && !lastFmAccountLinked && !listenBrainzToken.trim()) return;

    const scrobbleState = scrobbleStateRef.current;
    if (!scrobbleState || scrobbleState.trackKey !== currentTrackKey) return;

    const progressSeconds = Math.max(0, progress);
    if (!scrobbleState.nowPlayingSent && progressSeconds >= 2) {
      scrobbleState.nowPlayingSent = true;
      void submitProfileListen('playing_now', scrobbleState.startedAt);
    }

    const durationSeconds = duration > 0
      ? duration
      : currentTrack.durationMs
        ? currentTrack.durationMs / 1000
        : 0;
    const threshold = scrobbleThresholdSeconds(durationSeconds);
    const wallClockElapsed = Math.floor(Date.now() / 1000) - scrobbleState.startedAt;
    if (!scrobbleState.scrobbled && progressSeconds >= threshold && wallClockElapsed >= threshold) {
      scrobbleState.scrobbled = true;
      void submitProfileListen('scrobble', scrobbleState.startedAt);
    }
  }, [profileSyncEnabled, cloudToken, lastFmSessionKey, lastFmAccountLinked, listenBrainzToken, isPlaying, progress, duration, currentTrackKey]);

  // ── Discord Rich Presence Integration ──────────────────────────────
  const lastDiscordUpdateRef = useRef<{
    trackId: string;
    isPlaying: boolean;
    progress: number;
    updatedAt: number;
  } | null>(null);

  useEffect(() => {
    const now = Date.now();
    const last = lastDiscordUpdateRef.current;
    
    let shouldUpdate = false;
    if (!last) {
      shouldUpdate = true;
    } else if (last.trackId !== currentTrack.id) {
      shouldUpdate = true;
    } else if (last.isPlaying !== isPlaying) {
      shouldUpdate = true;
    } else {
      if (isPlaying) {
        const expectedProgress = last.progress + (now - last.updatedAt) / 1000;
        if (Math.abs(progress - expectedProgress) > 1.5) {
          shouldUpdate = true;
        }
      } else {
        if (Math.abs(progress - last.progress) > 1.0) {
          shouldUpdate = true;
        }
      }
      
      if (now - last.updatedAt >= 4500) {
        shouldUpdate = true;
      }
    }

    if (shouldUpdate) {
      lastDiscordUpdateRef.current = {
        trackId: currentTrack.id,
        isPlaying,
        progress,
        updatedAt: now,
      };

      const durationMs = currentTrack.durationMs || (duration > 0 ? Math.round(duration * 1000) : undefined);
      const progressMs = Math.round(progress * 1000);

      fetch('/api/discord/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          track: currentTrack.id === 'placeholder' ? null : {
            id: currentTrack.id,
            title: currentTrack.title,
            artist: profileArtistName(currentTrack),
            durationMs,
            artworkUrl: currentTrack.artworkUrl,
            permalinkUrl: (() => {
              const u = new URL('https://music.spice-app.xyz/');
              u.searchParams.set('song', encodeSongShareToken(currentTrack));
              return u.toString();
            })(),
          },
          isPlaying,
          progressMs,
        }),
      }).catch((err) => {
        console.error('[Discord RPC Client] Failed to update presence:', err);
      });
    }
  }, [currentTrack, isPlaying, progress, duration]);

  useEffect(() => {
    return () => {
      fetch('/api/discord/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          track: null,
          isPlaying: false,
          progressMs: 0,
        }),
      }).catch(() => {});
    };
  }, []);

  useEffect(() => {
    handleAudioEndedRef.current = handleAudioEnded;
    handleAudioErrorRef.current = handleAudioError;
  });

  useEffect(() => {
    return () => {
      if (errorSkipTimeoutRef.current) {
        clearTimeout(errorSkipTimeoutRef.current);
      }
    };
  }, []);

  // Dynamic Lyrics Fetcher & Karaoke Auto-scroller Effects
  const activeLineIdx = lyricsData?.isSynced
    ? lyricsData.lines.findIndex((line, idx) => {
      const nextLine = lyricsData.lines[idx + 1];
      return progress >= line.time && (!nextLine || progress < nextLine.time);
    })
    : -1;

  useEffect(() => {
    if (!lyricsContainerRef.current) return;
    const activeEl = lyricsContainerRef.current.querySelector('[data-active="true"]');
    if (activeEl) {
      activeEl.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeLineIdx]);

  useEffect(() => {
    if (!currentTrack || !currentTrack.id || currentTrack.id === 'placeholder') {
      setLyricsData(null);
      return;
    }

    let active = true;
    setLyricsLoading(true);
    logDebug('lyrics', `Initiated lyrics resolution flow for "${currentTrack.title}" (ID: ${currentTrack.id})`);

    const fetchLyrics = async () => {
      try {
        const metadataQuery = lyricsMetadataQuery(currentTrack);
        const fetchUrl = isSoundCloudTrack(currentTrack)
          ? `/api/sc/lyrics/${encodeURIComponent(soundCloudTrackId(currentTrack))}${metadataQuery}`
          : `/api/yt/lyrics/${encodeURIComponent(currentTrack.id)}${metadataQuery}`;
        logDebug('lyrics', `Fetching lyrics from API endpoint: ${fetchUrl}`);
        const res = await fetch(fetchUrl);
        if (!res.ok) {
          throw new Error(`HTTP error ${res.status}: ${res.statusText}`);
        }
        const data = await res.json();
        if (!active) {
          logDebug('lyrics', `Skipping state commit for track "${currentTrack.title}" due to fast skip`);
          return;
        }

        logDebug('lyrics', `API Response successfully parsed for "${data.title || currentTrack.title}". Timed lyrics: ${data.isSynced ? 'YES' : 'NO'}`);
        // Duration fallback chain: track metadata → API response → YouTube embed player → default
        const ytEmbedDuration = ytPlayerRef.current?.getDuration?.() || 0;
        const totalSec = currentTrack.durationMs
          ? currentTrack.durationMs / 1000
          : (data.durationMs ? data.durationMs / 1000 : (ytEmbedDuration > 0 ? ytEmbedDuration : 180));

        const parsedLines = data.isSynced
          ? parseLRC(data.syncedLyrics, totalSec)
          : parsePlainLyrics(data.plainLyrics);
        logDebug('lyrics', `Loaded ${parsedLines.length} ${data.isSynced ? 'synchronized' : 'plain'} lyric lines`);
        if (!data.isSynced) setIsKaraokeMode(false);

        if (parsedLines.length > 0) {
          logDebug('lyrics', `Sync sample: [Line 1 Time: ${formatTime(parsedLines[0].time)}] "${parsedLines[0].text}"`);
        }

        setLyricsData({
          lines: parsedLines,
          plainLyrics: data.plainLyrics,
          syncedLyrics: data.syncedLyrics,
          isSynced: !!data.isSynced,
        });
      } catch (err) {
        logDebug('lyrics', `Error during lyrics resolution: ${err instanceof Error ? err.message : String(err)}`);
        if (!active) return;

        setLyricsData(null);
      } finally {
        if (active) {
          setLyricsLoading(false);
        }
      }
    };

    fetchLyrics();

    return () => {
      active = false;
    };
  }, [currentTrack.id, currentTrack.title, currentTrack.artists, currentTrack.durationMs]);

  // Play a track
  const playTrack = async (track: Track, newQueue?: Track[], startSearchIndex?: number) => {
    if (errorSkipTimeoutRef.current) {
      clearTimeout(errorSkipTimeoutRef.current);
      errorSkipTimeoutRef.current = null;
    }

    if (!track || track.id === 'placeholder') {
      shouldAutoPlayRef.current = false;
      setIsLoadingStream(false);
      logDebug('player', 'Ready to stream. Select any track from the lists to begin playback.');
      return;
    }

    const requestId = ++playbackRequestRef.current;
    shouldAutoPlayRef.current = true;
    setError(undefined);
    setPlaybackPlaying(false);
    setStreamUrl(null);
    streamUrlRef.current = null;
    rememberTrackSnapshots([track, ...(newQueue || [])]);
    setCurrentTrack(track);
    if (isSoundCloudTrack(track)) {
      setShowVideoPlayer(false);
    }
    setIsLoadingStream(true);
    isLoadingStreamRef.current = true;

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
      const isSoundCloud = isSoundCloudTrack(track);
      const isYouTube = isYouTubeTrack(track);
      const activeStreamProtocol = streamProtocolRef.current;
      logDebug('player', `Initiating ${trackSourceLabel(track)} format resolution for track "${track.title}" (ID: ${track.id})`);

      if ((activeStreamProtocol === 'embed' || showVideoPlayer) && isYouTube) {
        logDebug('stream', `YouTube Embedded Player active. Loading iframe player for track ID: ${track.id}`);
        const shouldStartNow = requestId === playbackRequestRef.current && shouldAutoPlayRef.current;
        setStreamProtocol('embed');
        streamProtocolRef.current = 'embed';
        setStreamUrl('youtube-embed-active');
        streamUrlRef.current = 'youtube-embed-active';
        setIsLoadingStream(false);
        isLoadingStreamRef.current = false;
        setPlaybackPlaying(shouldStartNow);

        const filteredHist = history.filter(t => t.id !== track.id);
        const newHist = [track, ...filteredHist].slice(0, 50);
        setHistory(newHist);
        updateActiveProfileData({
          history: newHist,
          songsPlayed: activeProfile.songsPlayed + 1
        });
        autoSyncHistory(newHist);

        if (ytPlayerRef.current && typeof ytPlayerRef.current.loadVideoById === 'function') {
          if (typeof ytPlayerRef.current.stopVideo === 'function') {
            ytPlayerRef.current.stopVideo();
          }
          ytPlayerRef.current.loadVideoById(track.id);
          if (shouldStartNow) {
            ytPlayerRef.current.playVideo();
          } else if (typeof ytPlayerRef.current.pauseVideo === 'function') {
            ytPlayerRef.current.pauseVideo();
          }
        }
        return;
      }

      if (isSoundCloud && ytPlayerRef.current && typeof ytPlayerRef.current.stopVideo === 'function') {
        ytPlayerRef.current.stopVideo();
      }

      const trackEndpoint = isSoundCloud
        ? `/api/sc/track/${encodeURIComponent(soundCloudTrackId(track))}?quality=${audioQuality}`
        : `/api/yt/track/${encodeURIComponent(track.id)}`;
      const resTrack = await fetch(trackEndpoint);
      if (requestId !== playbackRequestRef.current) return;
      if (!resTrack.ok) throw new Error('Could not resolve audio streams for this track.');

      const payload = await resTrack.json();
      if (requestId !== playbackRequestRef.current) return;
      const streams = payload.streams ?? [];
      if (streams.length === 0) throw new Error('No compatible stream format discovered.');

      const bestStream = streams[0];
      const streamLabel = bestStream.preset ? `preset ${bestStream.preset}` : `itag ${bestStream.itag}`;
      const shouldStartNow = shouldAutoPlayRef.current;
      logDebug('stream', `Resolved ${streams.length} ${trackSourceLabel(track)} formats. Selected ${streamLabel} (${bestStream.container}, bitrate: ${Math.round(bestStream.bitrate / 1000)}kbps)`);
      setStreamUrl(bestStream.url);
      streamUrlRef.current = bestStream.url;
      setPlaybackPlaying(shouldStartNow);

      // Track playback in history
      const filteredHist = history.filter(t => t.id !== track.id);
      const newHist = [track, ...filteredHist].slice(0, 50);
      setHistory(newHist);

      // Sync history & stats increments to active profile
      updateActiveProfileData({
        history: newHist,
        songsPlayed: activeProfile.songsPlayed + 1
      });
      autoSyncHistory(newHist);

    } catch (err: any) {
      if (requestId !== playbackRequestRef.current) return;
      console.error(err);
      logDebug('error', `Track streaming failed: ${err.message || err}`);

      if (isYouTubeTrack(track) && streamProtocolRef.current !== 'embed') {
        logDebug('diagnostics', `Direct stream resolution failed. Initiating self-healing fallback to YouTube Embedded Player...`);
        const shouldStartNow = shouldAutoPlayRef.current;
        setStreamProtocol('embed');
        streamProtocolRef.current = 'embed';

        logDebug('stream', `YouTube Embedded Player active. Loading iframe player for track ID: ${track.id}`);
        setStreamUrl('youtube-embed-active');
        streamUrlRef.current = 'youtube-embed-active';
        setIsLoadingStream(false);
        isLoadingStreamRef.current = false;
        setPlaybackPlaying(shouldStartNow);

        const filteredHist = history.filter(t => t.id !== track.id);
        const newHist = [track, ...filteredHist].slice(0, 50);
        setHistory(newHist);
        updateActiveProfileData({
          history: newHist,
          songsPlayed: activeProfile.songsPlayed + 1
        });
        autoSyncHistory(newHist);

        if (ytPlayerRef.current && typeof ytPlayerRef.current.loadVideoById === 'function') {
          if (typeof ytPlayerRef.current.stopVideo === 'function') {
            ytPlayerRef.current.stopVideo();
          }
          ytPlayerRef.current.loadVideoById(track.id);
          if (shouldStartNow) {
            ytPlayerRef.current.playVideo();
          } else if (typeof ytPlayerRef.current.pauseVideo === 'function') {
            ytPlayerRef.current.pauseVideo();
          }
        }
        return;
      }

      // Auto-advance skip to next song if it's already in embed mode and still failing
      const currentQueue = queueRef.current;
      if (currentQueue.length > 1) {
        logDebug('player', 'Failed to resolve track stream. Triggering self-healing next-track skip...');
        handleNextRef.current(updatedIndex, startSearchIndex !== undefined ? startSearchIndex : updatedIndex);
      } else {
        setError('Playback connection failed. Please select a different track.');
      }
    } finally {
      if (requestId === playbackRequestRef.current) {
        setIsLoadingStream(false);
        isLoadingStreamRef.current = false;
      }
    }
  };

  useEffect(() => {
    playTrackRef.current = playTrack;
  });

  const pauseCurrentPlayback = () => {
    shouldAutoPlayRef.current = false;

    if (errorSkipTimeoutRef.current) {
      clearTimeout(errorSkipTimeoutRef.current);
      errorSkipTimeoutRef.current = null;
    }

    const targetTrack = currentTrackRef.current;
    if (streamProtocolRef.current === 'embed' && isYouTubeTrack(targetTrack) && ytPlayerRef.current) {
      if (typeof ytPlayerRef.current.pauseVideo === 'function') {
        ytPlayerRef.current.pauseVideo();
      }
      if (typeof ytPlayerRef.current.getCurrentTime === 'function') {
        setProgress(Math.max(0, ytPlayerRef.current.getCurrentTime() || 0));
      }
    }

    if (audioRef.current) {
      audioRef.current.pause();
      if (Number.isFinite(audioRef.current.currentTime)) {
        setProgress(Math.max(0, audioRef.current.currentTime));
      }
    }

    setPlaybackPlaying(false);
  };

  const resumeCurrentPlayback = () => {
    const targetTrack = currentTrackRef.current;
    if (!targetTrack || targetTrack.id === 'placeholder') return;

    shouldAutoPlayRef.current = true;
    setError(undefined);

    if (streamProtocolRef.current === 'embed' && isYouTubeTrack(targetTrack) && ytPlayerRef.current) {
      if (!streamUrlRef.current) {
        setStreamUrl('youtube-embed-active');
        streamUrlRef.current = 'youtube-embed-active';
        if (typeof ytPlayerRef.current.loadVideoById === 'function') {
          ytPlayerRef.current.loadVideoById(targetTrack.id);
          if (typeof ytPlayerRef.current.playVideo === 'function') {
            ytPlayerRef.current.playVideo();
          }
          setPlaybackPlaying(true);
          return;
        }
      }
      if (typeof ytPlayerRef.current.playVideo === 'function') {
        ytPlayerRef.current.playVideo();
        setPlaybackPlaying(true);
        return;
      }
    }

    if (audioRef.current && streamUrlRef.current) {
      audioRef.current.play().then(() => {
        setPlaybackPlaying(true);
      }).catch(handleAudioError);
      return;
    }

    if (!isLoadingStreamRef.current) {
      playTrack(targetTrack);
    }
  };

  const togglePlayPause = () => {
    if (isPlayingRef.current) {
      pauseCurrentPlayback();
    } else {
      resumeCurrentPlayback();
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

  const handlePrev = (overrideIndex?: any) => {
    const progressTime = streamProtocolRef.current === 'embed' && isYouTubeTrack(currentTrack) && ytPlayerRef.current && typeof ytPlayerRef.current.getCurrentTime === 'function'
      ? ytPlayerRef.current.getCurrentTime()
      : progress;

    if (progressTime > 3) {
      if (streamProtocolRef.current === 'embed' && isYouTubeTrack(currentTrack) && ytPlayerRef.current && typeof ytPlayerRef.current.seekTo === 'function') {
        ytPlayerRef.current.seekTo(0, true);
        setProgress(0);
        setIsPlaying(true);
        return;
      }
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        setProgress(0);
        setIsPlaying(true);
      }
      return;
    }

    const currentQueue = queueRef.current;
    if (currentQueue.length === 0) return;

    const currentIndex = (overrideIndex !== undefined && typeof overrideIndex === 'number')
      ? overrideIndex
      : queueIndexRef.current;
    let prevIdx = currentIndex;
    if (isShuffleRef.current) {
      if (currentQueue.length > 1) {
        do {
          prevIdx = randomIndex(currentQueue.length);
        } while (prevIdx === currentIndex);
      } else {
        prevIdx = 0;
      }
    } else {
      prevIdx = (currentIndex - 1 + currentQueue.length) % currentQueue.length;
    }
    playTrack(currentQueue[prevIdx]);
  };

  const handleNext = (overrideIndex?: any, startSearchIndex?: number) => {
    const currentQueue = queueRef.current;
    if (currentQueue.length === 0) return;

    const currentIndex = (overrideIndex !== undefined && typeof overrideIndex === 'number')
      ? overrideIndex
      : queueIndexRef.current;
    const searchStart = startSearchIndex !== undefined ? startSearchIndex : currentIndex;

    let nextIdx = currentIndex;
    if (isShuffleRef.current) {
      if (currentQueue.length > 1) {
        do {
          nextIdx = randomIndex(currentQueue.length);
        } while (nextIdx === currentIndex);
      } else {
        nextIdx = 0;
      }
    } else {
      nextIdx = (currentIndex + 1) % currentQueue.length;
    }

    // Safety limit: if it loops back to the beginning of the skip-failure cycle, stop it!
    if (nextIdx === searchStart) {
      setIsPlaying(false);
      setIsLoadingStream(false);
      setError('All tracks in the queue failed to stream. Please select a different source or check your database pings.');
      logDebug('error', 'All queue tracks failed to resolve. Aborted self-healing loop.');
      return;
    }

    playTrack(currentQueue[nextIdx], undefined, searchStart);
  };

  useEffect(() => {
    handleNextRef.current = handleNext;
  });

  const toggleLike = (track: Track) => {
    rememberTrackSnapshots([track]);
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
    autoSyncLikes(Array.from(updated), savedLikedDetails);
  };

  const seekToPosition = (seekTime: number) => {
    const safeDuration = durationRef.current || duration || 0;
    const safeSeek = Math.max(0, Math.min(seekTime, safeDuration || seekTime));

    setProgress(safeSeek);
    const targetTrack = currentTrackRef.current;
    if (streamProtocolRef.current === 'embed' && isYouTubeTrack(targetTrack) && ytPlayerRef.current && typeof ytPlayerRef.current.seekTo === 'function') {
      ytPlayerRef.current.seekTo(safeSeek, true);
    }
    if (audioRef.current) {
      audioRef.current.currentTime = safeSeek;
    }
  };

  const reportRemoteDeviceState = async () => {
    if (!cloudToken || !remoteControlEnabled || remoteDeviceReportInFlightRef.current) return;

    const targetTrack = currentTrackRef.current;
    const currentQueue = queueRef.current || [];
    remoteDeviceReportInFlightRef.current = true;
    try {
      const response = await fetch('/api/remote/devices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${cloudToken}`,
        },
        body: JSON.stringify({
          deviceId: remoteDeviceId,
          displayName: remoteDeviceName,
          currentTrack: targetTrack.id === 'placeholder' ? null : targetTrack,
          queue: currentQueue.slice(0, 80),
          queueIndex: queueIndexRef.current,
          isPlaying: isPlayingRef.current,
          progress: progressRef.current,
          duration: durationRef.current,
          volume: volumeRef.current,
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || `Spice Connect state update failed with status ${response.status}.`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Spice Connect state update failed.';
      setRemoteStatus(message);
      logDebug('error', `Spice Connect device state failed: ${message}`);
    } finally {
      remoteDeviceReportInFlightRef.current = false;
    }
  };

  const loadRemoteDevices = async (showStatus = false) => {
    if (!cloudToken || !remoteControlEnabled || remoteDeviceLoadInFlightRef.current) return;

    remoteDeviceLoadInFlightRef.current = true;
    try {
      const response = await fetch('/api/remote/devices', {
        headers: { Authorization: `Bearer ${cloudToken}` },
        cache: 'no-store',
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || `Spice Connect device load failed with status ${response.status}.`);
      }

      const devices = Array.isArray(data.devices)
        ? data.devices.map((device: RemoteDevice) => ({
          ...device,
          currentTrack: device.currentTrack ? enrichTrackSnapshot(device.currentTrack) : null,
          queue: Array.isArray(device.queue) ? device.queue.map(enrichTrackSnapshot) : [],
          lastSeenSeconds: Math.max(0, Math.round((Date.now() - new Date(device.updatedAt).getTime()) / 1000)),
        }))
        : [];
      setRemoteDevices(devices);

      setSelectedRemoteDeviceId((current) => (
        current && devices.some((device: RemoteDevice) => device.deviceId === current && device.deviceId !== remoteDeviceId)
          ? current
          : ''
      ));

      if (showStatus) {
        setRemoteStatus(`Found ${Math.max(devices.length - 1, 0)} Spice Connect device(s).`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Spice Connect device load failed.';
      setRemoteStatus(message);
      logDebug('error', `Spice Connect device load failed: ${message}`);
    } finally {
      remoteDeviceLoadInFlightRef.current = false;
    }
  };

  const scheduleRemoteDeviceSync = (delayMs = SPICE_CONNECT_POST_COMMAND_SYNC_DELAY_MS) => {
    if (typeof window === 'undefined') return;
    if (remoteStateSyncTimeoutRef.current) {
      clearTimeout(remoteStateSyncTimeoutRef.current);
    }

    remoteStateSyncTimeoutRef.current = window.setTimeout(() => {
      remoteStateSyncTimeoutRef.current = null;
      void reportRemoteDeviceState();
      void loadRemoteDevices();
    }, delayMs);
  };

  const rememberRemoteCommandId = (commandId: string) => {
    const appliedIds = appliedRemoteCommandIdsRef.current;
    if (appliedIds.has(commandId)) return false;

    appliedIds.add(commandId);
    if (appliedIds.size > 160) {
      const oldestId = appliedIds.values().next().value;
      if (oldestId) appliedIds.delete(oldestId);
    }

    return true;
  };

  const applyRemoteCommand = (command: RemoteCommand) => {
    if (command.sourceDeviceId === remoteDeviceId) return;

    switch (command.command) {
      case 'play':
        if (!isPlayingRef.current) resumeCurrentPlayback();
        break;
      case 'pause':
        if (isPlayingRef.current || isLoadingStreamRef.current) pauseCurrentPlayback();
        break;
      case 'toggle':
        togglePlayPause();
        break;
      case 'next':
        handleNextRef.current();
        break;
      case 'previous':
        handlePrev();
        break;
      case 'seek': {
        const seekTime = Number(command.payload?.progress);
        if (Number.isFinite(seekTime)) seekToPosition(seekTime);
        break;
      }
      case 'volume': {
        const nextVolume = Number(command.payload?.volume);
        if (Number.isFinite(nextVolume)) {
          setVolume(Math.max(0, Math.min(100, Math.round(nextVolume))));
        }
        break;
      }
      case 'play_track': {
        const payloadTrack = command.payload?.track;
        if (payloadTrack && typeof payloadTrack === 'object' && payloadTrack.id) {
          const hydratedTrack = enrichTrackSnapshot(payloadTrack as Track);
          const hydratedQueue = Array.isArray(command.payload?.queue)
            ? command.payload.queue.map(enrichTrackSnapshot)
            : [hydratedTrack];
          playTrack(hydratedTrack, hydratedQueue.length > 0 ? hydratedQueue : [hydratedTrack]);
        }
        break;
      }
    }

    setRemoteStatus(`Spice Connect command received: ${command.command}.`);
    scheduleRemoteDeviceSync(command.command === 'play_track' ? 900 : 300);
  };

  const pollRemoteCommands = async () => {
    if (!cloudToken || !remoteControlEnabled || remoteCommandPollInFlightRef.current) return;

    remoteCommandPollInFlightRef.current = true;
    try {
      const response = await fetch(`/api/remote/commands?deviceId=${encodeURIComponent(remoteDeviceId)}`, {
        headers: { Authorization: `Bearer ${cloudToken}` },
        cache: 'no-store',
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || `Spice Connect command poll failed with status ${response.status}.`);
      }

      const commands = Array.isArray(data.commands) ? data.commands as RemoteCommand[] : [];
      const freshCommands = commands.filter((command) => {
        if (!command.id || !rememberRemoteCommandId(command.id)) return false;
        if (!isSpiceConnectCommandFresh(command.createdAt, Date.now(), SPICE_CONNECT_COMMAND_TTL_MS)) {
          logDebug('remote', `Ignored stale Spice Connect command ${command.command}.`);
          return false;
        }
        return true;
      });

      freshCommands.forEach(applyRemoteCommand);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Spice Connect command poll failed.';
      setRemoteStatus(message);
      logDebug('error', `Spice Connect command poll failed: ${message}`);
    } finally {
      remoteCommandPollInFlightRef.current = false;
    }
  };

  const sendRemoteCommand = async (command: RemoteCommandType, payload: RemoteCommand['payload'] = {}) => {
    if (!cloudToken) {
      setRemoteStatus('Sign in to use Spice Connect.');
      return;
    }
    if (!selectedRemoteDeviceId) {
      setRemoteStatus('Choose another Spice Connect device first.');
      return;
    }
    const targetRemoteDevice = remoteDevices.find((device) => device.deviceId === selectedRemoteDeviceId);
    if (
      targetRemoteDevice?.lastSeenSeconds !== undefined
      && targetRemoteDevice.lastSeenSeconds > SPICE_CONNECT_STALE_DEVICE_SECONDS
    ) {
      setRemoteStatus(`${targetRemoteDevice.displayName} has not checked in recently. Refresh Spice Connect before controlling it.`);
      void loadRemoteDevices(true);
      return;
    }
    if (command === 'play' && targetRemoteDevice && !targetRemoteDevice.currentTrack) {
      setRemoteStatus(`Choose a track for ${targetRemoteDevice.displayName} before pressing play.`);
      return;
    }

    try {
      const response = await fetch('/api/remote/commands', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${cloudToken}`,
        },
        body: JSON.stringify({
          sourceDeviceId: remoteDeviceId,
          targetDeviceId: selectedRemoteDeviceId,
          command,
          payload,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || `Spice Connect command failed with status ${response.status}.`);
      }

      setRemoteStatus(`Sent ${command} through Spice Connect.`);
      scheduleRemoteDeviceSync(command === 'play_track' ? 900 : SPICE_CONNECT_POST_COMMAND_SYNC_DELAY_MS);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Spice Connect command failed.';
      setRemoteStatus(message);
      logDebug('error', `Spice Connect command send failed: ${message}`);
    }
  };

  useEffect(() => {
    if (!isMounted || !cloudToken || !remoteControlEnabled) return;

    void reportRemoteDeviceState();
    void loadRemoteDevices();

    const interval = setInterval(() => {
      void reportRemoteDeviceState();
      void loadRemoteDevices();
    }, SPICE_CONNECT_DEVICE_SYNC_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [isMounted, cloudToken, remoteControlEnabled, remoteDeviceId, remoteDeviceName]);

  useEffect(() => {
    if (!isMounted || !cloudToken || !remoteControlEnabled) return;

    void pollRemoteCommands();
    const interval = setInterval(() => {
      void pollRemoteCommands();
    }, SPICE_CONNECT_COMMAND_POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [isMounted, cloudToken, remoteControlEnabled, remoteDeviceId]);

  const fetchSearchProviderResults = async (query: string, provider: SearchProvider) => {
    const fetchProvider = async (targetProvider: Exclude<SearchProvider, 'hybrid'>, limit: number) => {
      const params = new URLSearchParams({
        q: query,
        limit: String(limit),
      });
      const endpoint = {
        youtube_music: '/api/yt/search',
        youtube_videos: '/api/yt/search',
        soundcloud: '/api/sc/search',
      }[targetProvider];

      if (targetProvider === 'youtube_music' || targetProvider === 'youtube_videos') {
        params.set('kind', targetProvider === 'youtube_videos' ? 'videos' : 'tracks');
      }

      const res = await fetch(`${endpoint}?${params}`);
      if (!res.ok) throw new Error(`${SEARCH_PROVIDER_LABELS[targetProvider]} search failed`);
      const data = await res.json();
      return playableSearchTracks((data.tracks ?? []).map(enrichTrackSnapshot) as Track[]);
    };

    if (provider === 'hybrid') {
      const batches = await Promise.allSettled([
        fetchProvider('youtube_music', 8),
        fetchProvider('youtube_videos', 8),
        fetchProvider('soundcloud', 8),
      ]);
      return dedupeTracks(
        batches.flatMap((batch) => batch.status === 'fulfilled' ? batch.value : []),
      ).slice(0, 30);
    }

    return fetchProvider(provider, 20);
  };

  // Search logic (debounced)
  const queueSearch = (query: string, provider = searchProvider) => {
    const requestId = ++searchRequestRef.current;

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!query.trim()) {
      setSearchResults([]);
      setSearchResultsSource(null);
      setIsSearching(false);
      return;
    }

    const cachedSearch = getCachedSearch(query, provider);
    if (cachedSearch) {
      setSearchResults(playableSearchTracks(cachedSearch.tracks as Track[]));
      setSearchResultsSource('cache');
      setRecentSearchEntries(getRecentCachedSearches());
    }

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const tracks = await fetchSearchProviderResults(query, provider);
        if (requestId !== searchRequestRef.current) return;
        rememberSearchResults(query, tracks, provider);
        setRecentSearchEntries(getRecentCachedSearches());
        setSearchResults(tracks);
        setSearchResultsSource('network');
        setError(undefined);
      } catch (err: any) {
        console.error(err);
        if (requestId === searchRequestRef.current) {
          setError(`${SEARCH_PROVIDER_LABELS[provider]} search failed: ${err.message || err}`);
        }
      } finally {
        if (requestId === searchRequestRef.current) {
          setIsSearching(false);
        }
      }
    }, 400);
  };

  const handleSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    queueSearch(e.target.value);
  };

  const handleSearchProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const provider = e.target.value as SearchProvider;
    setSearchProvider(provider);
    localStorage.setItem('spice_search_provider', provider);
    queueSearch(searchQuery, provider);
  };

  const runTopbarSearch = (query: string, provider = searchProvider) => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      setTopbarSearchTrayOpen(false);
      return;
    }

    setTopbarSearchQuery(trimmedQuery);
    setSelectedPlaylist(null);
    setTopbarSearchTrayOpen(true);
    setRecentSearchEntries(getRecentCachedSearches());

    if (provider !== searchProvider) {
      setSearchProvider(provider);
      localStorage.setItem('spice_search_provider', provider);
    }

    queueSearch(trimmedQuery, provider);
  };

  const handleTopbarSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runTopbarSearch(topbarSearchQuery, searchProvider);
  };

  const handleTopbarSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const recent = getRecentCachedSearches();
    setTopbarSearchQuery(e.target.value);
    setRecentSearchEntries(recent);
    if (!topbarSearchTrayOpen && (e.target.value.trim() || recent.length > 0)) {
      setTopbarSearchTrayOpen(true);
    }
  };

  const runRecentTopbarSearch = (entry: ReturnType<typeof getRecentCachedSearches>[number]) => {
    const cachedProvider = entry.sourceId ?? null;
    const provider = isSearchProvider(cachedProvider) ? cachedProvider : searchProvider;
    runTopbarSearch(entry.query, provider);
  };

  const openAccountFromTopbar = () => {
    setSelectedPlaylist(null);
    setCurrentPage('account');
  };

  useEffect(() => {
    if (!isMounted || launchIntentHandledRef.current || typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const pageIntent = params.get('page');
    const authIntent = params.get('auth');
    const searchIntent = params.get('q') || params.get('search');
    const songIntent = params.get('song');
    const providerIntent = params.get('provider');
    const provider = isSearchProvider(providerIntent) ? providerIntent : searchProvider;
    let consumedIntent = false;

    if (songIntent) {
      const sharedTrack = decodeSongShareToken(songIntent);
      if (sharedTrack) {
        rememberTrackSnapshots([sharedTrack]);
        setSelectedPlaylist(null);
        setCurrentPage('search');
        setSearchQuery(`${sharedTrack.title} ${profileArtistName(sharedTrack)}`);
        void playTrack(sharedTrack, [sharedTrack]);
        showSpiceNotice(`Opening shared song: "${sharedTrack.title}".`, 'success');
      } else {
        showSpiceNotice('This shared song link could not be opened.', 'warning');
      }
      consumedIntent = true;
    } else if (authIntent === 'register' || authIntent === 'login') {
      setAuthMode(authIntent === 'register' ? 'register' : 'login');
      setSelectedPlaylist(null);
      setCurrentPage('account');
      consumedIntent = true;
    } else if (pageIntent === 'account') {
      setSelectedPlaylist(null);
      setCurrentPage('account');
      consumedIntent = true;
    }

    if (searchIntent?.trim()) {
      const trimmedSearch = searchIntent.trim();
      setSearchQuery(trimmedSearch);
      setSelectedPlaylist(null);
      setCurrentPage('search');
      runTopbarSearch(trimmedSearch, provider);
      consumedIntent = true;
    } else if (pageIntent === 'search') {
      setSelectedPlaylist(null);
      setCurrentPage('search');
      consumedIntent = true;
    }

    if (!consumedIntent) return;

    launchIntentHandledRef.current = true;
    for (const key of ['page', 'auth', 'q', 'search', 'provider', 'song']) {
      params.delete(key);
    }

    const nextUrl = params.toString()
      ? `${window.location.pathname}?${params.toString()}`
      : window.location.pathname;
    window.history.replaceState(null, '', nextUrl);
  }, [isMounted, searchProvider]);

  const updateSidebarHiddenPreference = (hidden: boolean) => {
    setSidebarHidden(hidden);
    localStorage.setItem('spice_sidebar_hidden', String(hidden));
  };

  const updateSidebarSearchPreference = (enabled: boolean) => {
    setSidebarSearchEnabled(enabled);
    localStorage.setItem('spice_sidebar_search_enabled', String(enabled));
    if (!enabled && currentPage === 'search' && !selectedPlaylist) {
      setCurrentPage('home');
    }
  };

  const updateSidebarProfilePreference = (enabled: boolean) => {
    setSidebarProfileEnabled(enabled);
    localStorage.setItem('spice_sidebar_profile_enabled', String(enabled));
    if (!enabled && currentPage === 'account' && !selectedPlaylist) {
      setCurrentPage('home');
    }
  };

  useEffect(() => {
    const profile = buildPrivateTasteProfile({
      history,
      likedTracks: Object.values(likedTrackDetails),
      playlists: customPlaylists,
    });
    const seeds = buildRecommendationSeeds(profile, 4);
    const requestId = ++recommendationRequestRef.current;
    const primarySeed = seeds[0] ?? null;

    setHomeRecommendationSeed(primarySeed);

    if (!primarySeed) {
      setHomeRecommended([]);
      setIsLoadingRecommendations(false);
      return;
    }

    const exclude = [currentTrack, ...history.slice(0, 20)];
    const cachedBatches = seeds.flatMap((seed) => {
      const cached = getCachedSearch(seed.query, 'hybrid');
      if (!cached) return [];

      return [{
        seed,
        tracks: playableSearchTracks(cached.tracks as Track[]),
      }];
    });

    if (cachedBatches.length > 0) {
      setHomeRecommended(rankRecommendedTracks(cachedBatches, profile, { exclude, limit: 12 }));
    } else {
      setHomeRecommended([]);
    }

    let cancelled = false;
    setIsLoadingRecommendations(true);
    const timeout = setTimeout(async () => {
      try {
        const batches = await Promise.allSettled(
          seeds.map(async (seed) => {
            const tracks = await fetchSearchProviderResults(seed.query, 'hybrid');
            rememberSearchResults(seed.query, tracks, 'hybrid');
            return { seed, tracks };
          }),
        );

        if (cancelled || requestId !== recommendationRequestRef.current) return;

        const fulfilled = batches.flatMap((batch) =>
          batch.status === 'fulfilled' ? [batch.value] : [],
        );
        const ranked = rankRecommendedTracks(fulfilled, profile, { exclude, limit: 12 });
        rememberTrackSnapshots(ranked);
        setHomeRecommended(ranked);
      } finally {
        if (!cancelled && requestId === recommendationRequestRef.current) {
          setIsLoadingRecommendations(false);
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [history, likedTrackDetails, customPlaylists, currentTrack]);

  // Playlists Operations
  const persistCustomPlaylists = (updated: Playlist[], syncOwnedPlaylists = true) => {
    setCustomPlaylists(updated);
    updateActiveProfileData({ customPlaylists: updated });
    if (syncOwnedPlaylists) {
      autoSyncPlaylists(updated);
    }
  };

  const createPlaylist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlTitle.trim()) return;

    const newPlaylist: Playlist = {
      id: createPlaylistId(),
      title: newPlTitle,
      description: newPlDesc || 'Custom Spice compilation.',
      tracks: [],
      gradient: PRESET_GRADIENTS[randomIndex(PRESET_GRADIENTS.length)],
      createdAt: new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
    };

    const updated = [...customPlaylists, newPlaylist];
    persistCustomPlaylists(updated);

    setNewPlTitle('');
    setNewPlDesc('');
    setShowCreateDialog(false);
  };

  const deletePlaylist = async (playlistId: string) => {
    const target = customPlaylists.find(pl => pl.id === playlistId);
    if (!target) return;

    if (target.shared) {
      if (cloudToken && isPlaylistUuid(target.id)) {
        try {
          const response = await fetch(`/api/playlists/shared/${encodeURIComponent(target.id)}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${cloudToken}` },
          });
          const data = await response.json().catch(() => ({}));
          if (!response.ok) {
            throw new Error(data.message || 'Failed to leave shared playlist.');
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to leave shared playlist.';
          setShareStatus(message);
          logDebug('error', `Leave shared playlist failed: ${message}`);
          return;
        }
      } else if (!cloudToken) {
        setShareStatus('Removed locally. Sign in to leave account-backed shared playlists permanently.');
      }

      const updated = customPlaylists.filter(pl => pl.id !== playlistId);
      persistCustomPlaylists(updated, false);
      setSelectedPlaylist(null);
      return;
    }

    const updated = customPlaylists.filter(pl => pl.id !== playlistId);
    persistCustomPlaylists(updated);
    setSelectedPlaylist(null);
  };

  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      showSpiceNotice('Image is too large. Please choose an image smaller than 2MB.', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setEditPlCoverUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const savePlaylistEdits = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlaylist) return;

    const updatedPl = {
      ...selectedPlaylist,
      title: editPlTitle.trim() || 'Untitled Playlist',
      description: editPlDesc.trim(),
      gradient: editPlGradient,
      coverUrl: editPlCoverUrl.trim() || undefined,
    };

    // Update in customPlaylists state
    const updatedPlaylists = customPlaylists.map(pl => pl.id === selectedPlaylist.id ? updatedPl : pl);

    if (selectedPlaylist.shared) {
      if (cloudToken && isPlaylistUuid(selectedPlaylist.id)) {
        try {
          const response = await fetch(`/api/playlists/shared/${encodeURIComponent(selectedPlaylist.id)}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${cloudToken}`
            },
            body: JSON.stringify({
              title: updatedPl.title,
              description: updatedPl.description,
              gradient: updatedPl.gradient,
              coverUrl: updatedPl.coverUrl || null,
            })
          });
          const data = await response.json().catch(() => ({}));
          if (!response.ok) {
            throw new Error(data.message || 'Failed to update shared playlist.');
          }
          if (data.playlist) {
            const normalized = normalizePlaylistSnapshot(data.playlist);
            setCustomPlaylists(customPlaylists.map(pl => pl.id === selectedPlaylist.id ? normalized : pl));
            setSelectedPlaylist(normalized);
          } else {
            setCustomPlaylists(updatedPlaylists);
            setSelectedPlaylist(updatedPl);
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to update shared playlist.';
          setError(message);
          return;
        }
      } else {
        persistCustomPlaylists(updatedPlaylists, false);
        setSelectedPlaylist(updatedPl);
      }
    } else {
      persistCustomPlaylists(updatedPlaylists);
      setSelectedPlaylist(updatedPl);
    }

    setShowEditPlaylistDialog(false);
  };

  const addTrackToPlaylist = async (track: Track, playlistId: string): Promise<boolean> => {
    const target = customPlaylists.find(pl => pl.id === playlistId);

    // For shared playlists, add via API
    if (target?.shared && cloudToken && isPlaylistUuid(playlistId)) {
      try {
        const response = await fetch(`/api/playlists/shared/${encodeURIComponent(playlistId)}/tracks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cloudToken}` },
          body: JSON.stringify({ track: { id: track.id, title: track.title, artists: track.artists, artworkUrl: track.artworkUrl, durationMs: track.durationMs, sourceId: track.sourceId || 'youtube_music' } }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || 'Failed to add track.');

        // Optimistically update the local playlist
        let wasAdded = false;
        const updated = customPlaylists.map(pl => {
          if (pl.id === playlistId) {
            if (pl.tracks.some(t => t.id === track.id)) return pl;
            wasAdded = true;
            return { ...pl, tracks: [...pl.tracks, { ...track, addedBy: cloudUsername ? { userId: '', username: cloudUsername, displayName: cloudUsername } : undefined }] };
          }
          return pl;
        });
        persistCustomPlaylists(updated, false);
        if (selectedPlaylist && selectedPlaylist.id === playlistId) {
          setSelectedPlaylist(updated.find(p => p.id === playlistId) || null);
        }
        return wasAdded;
      } catch (error) {
        setShareStatus(error instanceof Error ? error.message : 'Failed to add track to shared playlist.');
        return false;
      }
    }

    if (target?.shared) {
      setShareStatus('Sign in to add tracks to shared playlists.');
      return false;
    }

    rememberTrackSnapshots([track]);
    let wasAdded = false;
    const updated = customPlaylists.map(pl => {
      if (pl.id === playlistId) {
        if (pl.tracks.some(t => t.id === track.id)) return pl;
        wasAdded = true;
        return { ...pl, tracks: [...pl.tracks, track] };
      }
      return pl;
    });
    persistCustomPlaylists(updated);

    if (selectedPlaylist && selectedPlaylist.id === playlistId) {
      setSelectedPlaylist(updated.find(p => p.id === playlistId) || null);
    }
    return wasAdded;
  };

  const removeTrackFromPlaylist = async (trackId: string, playlistId: string, position?: number) => {
    const target = customPlaylists.find(pl => pl.id === playlistId);

    // For shared playlists, remove via API
    if (target?.shared && cloudToken && isPlaylistUuid(playlistId) && typeof position === 'number') {
      try {
        const response = await fetch(`/api/playlists/shared/${encodeURIComponent(playlistId)}/tracks`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cloudToken}` },
          body: JSON.stringify({ position }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || 'Failed to remove track.');

        const updated = customPlaylists.map(pl => {
          if (pl.id === playlistId) {
            return { ...pl, tracks: pl.tracks.filter(t => t.id !== trackId) };
          }
          return pl;
        });
        persistCustomPlaylists(updated, false);
        if (selectedPlaylist && selectedPlaylist.id === playlistId) {
          setSelectedPlaylist(updated.find(p => p.id === playlistId) || null);
        }
      } catch (error) {
        setShareStatus(error instanceof Error ? error.message : 'Failed to remove track.');
      }
      return;
    }

    if (target?.shared) {
      setShareStatus('Sign in to manage shared playlist tracks.');
      return;
    }

    const updated = customPlaylists.map(pl => {
      if (pl.id === playlistId) {
        return { ...pl, tracks: pl.tracks.filter(t => t.id !== trackId) };
      }
      return pl;
    });
    persistCustomPlaylists(updated);

    if (selectedPlaylist && selectedPlaylist.id === playlistId) {
      setSelectedPlaylist(updated.find(p => p.id === playlistId) || null);
    }
  };

  const sharePlaylist = async (playlist: Playlist) => {
    // Members of a shared playlist they don't own cannot generate invite links
    if (playlist.shared && !isPlaylistOwner) {
      setShareStatus('Only the playlist owner can create invite links.');
      return;
    }

    if (!cloudToken) {
      setShareStatus('Sign in to your SPICE account before creating share links.');
      return;
    }

    setSharingPlaylistId(playlist.id);
    setShareStatus(playlist.shared ? 'Generating a new invite link...' : 'Saving playlist before creating a share link...');

    try {
      let shareablePlaylist = playlist;
      let updatedPlaylists = customPlaylists;

      // For regular (unshared) playlists: ensure a UUID and sync to backend first
      if (!playlist.shared) {
        if (!isPlaylistUuid(playlist.id)) {
          shareablePlaylist = { ...playlist, id: createPlaylistId() };
          updatedPlaylists = customPlaylists.map(pl => pl.id === playlist.id ? shareablePlaylist : pl);
          setSharingPlaylistId(shareablePlaylist.id);
          persistCustomPlaylists(updatedPlaylists);
          if (selectedPlaylist?.id === playlist.id) {
            setSelectedPlaylist(shareablePlaylist);
          }
        }

        const syncResponse = await fetch('/api/sync/playlists', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${cloudToken}`,
          },
          body: JSON.stringify({
            playlists: ownedPlaylistsOnly(updatedPlaylists),
            profileId: activeProfileId,
          }),
        });
        const syncData = await syncResponse.json().catch(() => ({}));
        if (!syncResponse.ok) {
          throw new Error(syncData.message || 'Could not save playlist before sharing.');
        }
      }

      const inviteResponse = await fetch('/api/playlists/invites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${cloudToken}`,
        },
        body: JSON.stringify({ playlistId: shareablePlaylist.id }),
      });
      const inviteData = await inviteResponse.json().catch(() => ({}));
      if (!inviteResponse.ok) {
        throw new Error(inviteData.message || 'Could not create playlist invite.');
      }

      const inviteUrl = inviteData.inviteUrl as string;
      let copied = false;
      if (inviteUrl && navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(inviteUrl);
          copied = true;
        } catch { }
      }

      setShareStatus(copied ? 'Invite link copied to clipboard.' : `Invite link ready: ${inviteUrl}`);

      // Mark playlist as shared locally
      const finalPlaylist: Playlist = { ...shareablePlaylist, shared: true, shareRole: 'owner' };
      const finalPlaylists = customPlaylists.map(pl => pl.id === playlist.id ? finalPlaylist : pl);
      persistCustomPlaylists(finalPlaylists, false);
      if (selectedPlaylist?.id === playlist.id) {
        setSelectedPlaylist(finalPlaylist);
      }

      logDebug('database', `Created shared playlist invite for "${shareablePlaylist.title}".`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to share playlist.';
      setShareStatus(message);
      logDebug('error', `Share playlist failed: ${message}`);
    } finally {
      setSharingPlaylistId(null);
    }
  };

  const acceptSharedPlaylistInvite = async () => {
    if (!invitePreview) return;
    if (!cloudToken) {
      setInviteStatus('Sign in to your SPICE account first, then accept the invite.');
      setCurrentPage('account');
      return;
    }

    setAcceptingInvite(true);
    setInviteStatus('Accepting shared playlist...');
    try {
      const response = await fetch(`/api/playlists/invites/${encodeURIComponent(invitePreview.token)}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${cloudToken}` },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || 'Failed to accept shared playlist invite.');
      }

      const acceptedPlaylist = normalizePlaylistSnapshot(data.playlist);
      const updated = [
        acceptedPlaylist,
        ...customPlaylists.filter(pl => pl.id !== acceptedPlaylist.id),
      ];
      rememberTrackSnapshots(acceptedPlaylist.tracks);
      persistCustomPlaylists(updated, false);
      setSelectedPlaylist(acceptedPlaylist);
      setCurrentPage('library');
      setInvitePreview(null);
      setInviteStatus(null);
      if (typeof window !== 'undefined') {
        window.history.replaceState(null, '', window.location.pathname);
      }
      logDebug('database', `Accepted shared playlist "${acceptedPlaylist.title}".`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to accept shared playlist.';
      setInviteStatus(message);
      logDebug('error', `Accept shared playlist failed: ${message}`);
    } finally {
      setAcceptingInvite(false);
    }
  };

  const likedTracksList = Object.values(likedTrackDetails);
  const editablePlaylists = customPlaylists.filter((playlist) => !playlist.shared);
  const sharedPlaylists = customPlaylists.filter((playlist) => playlist.shared);
  const allEditablePlaylists = customPlaylists.filter((playlist) => !playlist.shared || playlist.shareRole === 'editor' || playlist.shareRole === 'owner');

  // ── Username Management ──────────────────────────────────────────
  const fetchUsername = useCallback(async (token: string | null = cloudToken, profileId: string = activeProfileId) => {
    if (!token) return;
    try {
      const response = await fetch('/api/account/username', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok && data.username) {
        updateProfileData(profileId, { cloudUsername: data.username });
        if (activeProfileIdRef.current === profileId && cloudTokenRef.current === token) {
          setCloudUsername(data.username);
          setUsernameInput(data.username);
          cloudUsernameRef.current = data.username;
        }
      }
    } catch { /* silent */ }
  }, [cloudToken, activeProfileId]);
  const fetchPendingInvites = async () => {
    if (!cloudToken) return;
    setPendingInvitesLoading(true);
    try {
      const res = await fetch('/api/account/invites', {
        headers: { Authorization: `Bearer ${cloudToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPendingInvites(data.invites || []);
      }
    } catch (err) {
      logDebug('error', `Failed to fetch pending invites: ${err}`);
    } finally {
      setPendingInvitesLoading(false);
    }
  };

  useEffect(() => {
    if (currentPage === 'settings' && cloudToken) {
      fetchPendingInvites();
    }
  }, [currentPage, cloudToken]);

  const handleAcceptInvite = async (playlistId: string) => {
    if (!cloudToken) return;
    setAcceptingInvite(true);
    try {
      const res = await fetch(`/api/account/invites/${playlistId}/accept`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${cloudToken}` }
      });
      if (res.ok) {
        setPendingInvites(prev => prev.filter(inv => inv.playlistId !== playlistId));
        showSpiceNotice('Invite accepted. The playlist will sync shortly.', 'success');
        // Trigger a sync
        void syncWithCloud();
      } else {
        const err = await res.json();
        showSpiceNotice(err.message || 'Failed to accept invite.', 'danger');
      }
    } catch (e) {
      showSpiceNotice('Failed to accept invite.', 'danger');
    } finally {
      setAcceptingInvite(false);
    }
  };

  const handleRejectInvite = async (playlistId: string) => {
    if (!cloudToken) return;
    setAcceptingInvite(true);
    try {
      const res = await fetch(`/api/account/invites/${playlistId}/reject`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${cloudToken}` }
      });
      if (res.ok) {
        setPendingInvites(prev => prev.filter(inv => inv.playlistId !== playlistId));
        showSpiceNotice('Invite rejected.', 'success');
      } else {
        const err = await res.json();
        showSpiceNotice(err.message || 'Failed to reject invite.', 'danger');
      }
    } catch (e) {
      showSpiceNotice('Failed to reject invite.', 'danger');
    } finally {
      setAcceptingInvite(false);
    }
  };
  useEffect(() => {
    if (cloudToken) {
      void fetchUsername(cloudToken, activeProfileId);
    }
  }, [cloudToken, activeProfileId, fetchUsername]);

  const saveUsername = async () => {
    if (!cloudToken || !usernameInput.trim()) return;
    const usernameProfileId = activeProfileIdRef.current;
    const usernameToken = cloudToken;
    setUsernameSaving(true);
    setUsernameError(null);
    setUsernameSuccess(false);
    try {
      const response = await fetch('/api/account/username', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cloudToken}` },
        body: JSON.stringify({ username: usernameInput.trim() }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Failed to save username.');
      updateProfileData(usernameProfileId, { cloudUsername: data.username });
      if (activeProfileIdRef.current === usernameProfileId && cloudTokenRef.current === usernameToken) {
        setCloudUsername(data.username);
        setUsernameInput(data.username);
        cloudUsernameRef.current = data.username;
      }
      setUsernameSuccess(true);
      setTimeout(() => setUsernameSuccess(false), 3000);
    } catch (error) {
      setUsernameError(error instanceof Error ? error.message : 'Failed to save username.');
    } finally {
      setUsernameSaving(false);
    }
  };

  // ── Shared Playlist Member Management ───────────────────────────
  const fetchPlaylistMembers = async (playlistId: string) => {
    if (!cloudToken) {
      if (selectedPlaylist && selectedPlaylist.id === playlistId) {
        setMembersList({
          owner: {
            userId: selectedPlaylist.ownerId || 'unknown',
            username: selectedPlaylist.ownerUsername || null,
            displayName: selectedPlaylist.ownerDisplayName || 'Owner',
            avatarUrl: null,
            role: 'owner',
          },
          members: selectedPlaylist.members || [],
          maxMembers: 4,
        });
      }
      return;
    }
    setMembersLoading(true);
    setMemberActionStatus(null);
    try {
      const response = await fetch(`/api/playlists/shared/members?playlistId=${encodeURIComponent(playlistId)}`, {
        headers: { Authorization: `Bearer ${cloudToken}` },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Failed to load members.');
      setMembersList({ owner: data.owner, members: data.members || [], maxMembers: data.maxMembers || 4 });
    } catch (error) {
      setMemberActionStatus(error instanceof Error ? error.message : 'Failed to load members.');
    } finally {
      setMembersLoading(false);
    }
  };

  const inviteMember = async (playlistId: string) => {
    if (!cloudToken || !inviteUsername.trim()) return;
    setInvitingMember(true);
    setMemberActionStatus(null);
    try {
      const response = await fetch('/api/playlists/shared/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cloudToken}` },
        body: JSON.stringify({ playlistId, username: inviteUsername.trim() }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Failed to invite member.');
      setMemberActionStatus(`Invited ${data.member?.displayName || inviteUsername}!`);
      setInviteUsername('');
      await fetchPlaylistMembers(playlistId);
    } catch (error) {
      setMemberActionStatus(error instanceof Error ? error.message : 'Failed to invite member.');
    } finally {
      setInvitingMember(false);
    }
  };

  const removeMember = async (playlistId: string, userId: string) => {
    if (!cloudToken) return;
    setMemberActionStatus(null);
    try {
      const response = await fetch('/api/playlists/shared/members', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cloudToken}` },
        body: JSON.stringify({ playlistId, userId }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Failed to remove member.');
      setMemberActionStatus('Member removed.');
      await fetchPlaylistMembers(playlistId);
    } catch (error) {
      setMemberActionStatus(error instanceof Error ? error.message : 'Failed to remove member.');
    }
  };

  // ── Shared Playlist Live Refresh ─────────────────────────────────
  // When the user opens a shared UUID-backed playlist, fetch fresh tracks
  // from the backend so collaborator additions appear immediately.
  const refreshSharedPlaylist = useCallback(async (playlist: Playlist) => {
    if (!cloudToken || !isPlaylistUuid(playlist.id)) return;
    try {
      const response = await fetch(`/api/playlists/shared/${encodeURIComponent(playlist.id)}/tracks`, {
        headers: { Authorization: `Bearer ${cloudToken}` },
      });
      if (!response.ok) return; // silently ignore — the cached view still works
      const data = await response.json().catch(() => ({}));
      if (!Array.isArray(data.tracks)) return;
      const freshTracks = (data.tracks as any[]).map(enrichTrackSnapshot);
      setCustomPlaylists((prev) => {
        const updated = prev.map((pl) =>
          pl.id === playlist.id ? { ...pl, tracks: freshTracks } : pl,
        );
        setSelectedPlaylist((sel) => (sel?.id === playlist.id ? { ...sel, tracks: freshTracks } : sel));
        return updated;
      });
    } catch {
      // silently fail — cached data is still shown
    }
  }, [cloudToken]);

  useEffect(() => {
    if (!selectedPlaylist?.shared || !isPlaylistUuid(selectedPlaylist.id)) return;
    void refreshSharedPlaylist(selectedPlaylist);
    // Only re-run when we switch to a different shared playlist
  }, [selectedPlaylist?.id]);

  useEffect(() => {
    setShowMembersPanel(false);
  }, [selectedPlaylist?.id]);

  const createSharedPlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSharedPlTitle.trim() || !cloudToken) return;

    const localId = createPlaylistId();
    const gradient = PRESET_GRADIENTS[randomIndex(PRESET_GRADIENTS.length)];
    const newPlaylist: Playlist = {
      id: localId,
      title: newSharedPlTitle,
      description: newSharedPlDesc || 'Collaborative Spice playlist.',
      tracks: [],
      gradient,
      createdAt: new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }),
      shared: true,
      shareRole: 'owner',
    };

    setNewSharedPlTitle('');
    setNewSharedPlDesc('');
    setShowCreateSharedDialog(false);

    // Sync to backend first so we have a real UUID, then auto-generate a share link
    try {
      const syncResponse = await fetch('/api/sync/playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cloudToken}` },
        body: JSON.stringify({
          playlists: [...ownedPlaylistsOnly(customPlaylists), { ...newPlaylist, shared: false }],
          profileId: activeProfileId,
        }),
      });
      const syncData = await syncResponse.json().catch(() => ({}));
      if (!syncResponse.ok) throw new Error(syncData.message || 'Failed to sync new shared playlist.');

      // Reload playlists from sync to get the server-assigned UUID
      const serverPlaylist = Array.isArray(syncData.playlists)
        ? syncData.playlists.find((p: any) => p.title === newPlaylist.title && p.tracks?.length === 0)
        : null;
      const resolvedId = (serverPlaylist?.id && isPlaylistUuid(serverPlaylist.id)) ? serverPlaylist.id : localId;
      const resolvedPlaylist: Playlist = { ...newPlaylist, id: resolvedId, shared: true, shareRole: 'owner' };

      const updated = [...customPlaylists, resolvedPlaylist];
      persistCustomPlaylists(updated, false);
      setSelectedPlaylist(resolvedPlaylist);
      setCurrentPage('library');

      // Auto-generate invite link
      if (isPlaylistUuid(resolvedId)) {
        const inviteResponse = await fetch('/api/playlists/invites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cloudToken}` },
          body: JSON.stringify({ playlistId: resolvedId }),
        });
        const inviteData = await inviteResponse.json().catch(() => ({}));
        if (inviteResponse.ok && inviteData.inviteUrl) {
          let copied = false;
          if (navigator.clipboard?.writeText) {
            try { await navigator.clipboard.writeText(inviteData.inviteUrl); copied = true; } catch { }
          }
          setShareStatus(copied
            ? `"${resolvedPlaylist.title}" created! Invite link copied to clipboard.`
            : `"${resolvedPlaylist.title}" created! Invite link: ${inviteData.inviteUrl}`);
        }
      }
    } catch (error) {
      // Fallback: add locally without backend sync
      const updated = [...customPlaylists, newPlaylist];
      persistCustomPlaylists(updated, false);
      setCurrentPage('library');
      setShareStatus(error instanceof Error ? error.message : 'Created locally. Sign in to sync.');
    }
  };

  const remoteTargetDevices = remoteDevices.filter((device) => device.deviceId !== remoteDeviceId);
  const selectedRemoteDevice = remoteTargetDevices.find((device) => device.deviceId === selectedRemoteDeviceId) || null;
  const isControllingRemoteReceiver = Boolean(selectedRemoteDevice);
  const remoteReceiverPlaceholder: Track = {
    id: 'spice-connect-placeholder',
    title: selectedRemoteDevice ? 'No active track on receiver' : 'Select a track to play',
    artists: [{ id: 'spice-connect', name: selectedRemoteDevice?.displayName || 'Spice Connect' }],
    artworkUrl: '/icon.svg',
  };
  const playerTrack = isControllingRemoteReceiver
    ? (selectedRemoteDevice?.currentTrack || remoteReceiverPlaceholder)
    : currentTrack;
  const playerQueue = isControllingRemoteReceiver
    ? (
      selectedRemoteDevice?.queue && selectedRemoteDevice.queue.length > 0
        ? selectedRemoteDevice.queue
        : (selectedRemoteDevice?.currentTrack ? [selectedRemoteDevice.currentTrack] : [])
    )
    : queue;
  const playerQueueIndex = isControllingRemoteReceiver ? (selectedRemoteDevice?.queueIndex || 0) : queueIndex;
  const playerIsPlaying = isControllingRemoteReceiver ? Boolean(selectedRemoteDevice?.isPlaying) : isPlaying;
  const playerProgress = isControllingRemoteReceiver ? (selectedRemoteDevice?.progress || 0) : progress;
  const playerDuration = isControllingRemoteReceiver ? (selectedRemoteDevice?.duration || 0) : duration;
  const playerVolume = isControllingRemoteReceiver ? (selectedRemoteDevice?.volume ?? 70) : volume;
  const playerIsPlaceholder = playerTrack.id === 'placeholder' || playerTrack.id === 'spice-connect-placeholder';
  const receiverLabel = selectedRemoteDevice?.displayName || 'This device';
  const receiverSelectDisabled = !cloudToken || !remoteControlEnabled;

  const canControlSelectedRemoteReceiver = (command: RemoteCommandType) => {
    if (!selectedRemoteDevice) return false;
    if (
      selectedRemoteDevice.lastSeenSeconds !== undefined
      && selectedRemoteDevice.lastSeenSeconds > SPICE_CONNECT_STALE_DEVICE_SECONDS
    ) {
      setRemoteStatus(`${selectedRemoteDevice.displayName} has not checked in recently. Refresh Spice Connect before controlling it.`);
      void loadRemoteDevices(true);
      return false;
    }
    if (command === 'play' && !selectedRemoteDevice.currentTrack) {
      setRemoteStatus(`Choose a track for ${selectedRemoteDevice.displayName} before pressing play.`);
      return false;
    }

    return true;
  };

  const selectSpiceConnectReceiver = (deviceId: string) => {
    const safeDeviceId = deviceId === remoteDeviceId ? '' : deviceId;
    setSelectedRemoteDeviceId(safeDeviceId);
    if (safeDeviceId) {
      localStorage.setItem('spice_connect_receiver_id', safeDeviceId);
      const device = remoteTargetDevices.find((entry) => entry.deviceId === safeDeviceId);
      setRemoteStatus(`Player controls now target ${device?.displayName || 'selected Spice Connect device'}.`);
    } else {
      localStorage.removeItem('spice_connect_receiver_id');
      setRemoteStatus('Player controls now target this device.');
    }
  };

  const patchSelectedRemoteDevice = (updates: Partial<RemoteDevice>) => {
    if (!selectedRemoteDeviceId) return;
    setRemoteDevices((devices) => devices.map((device) => (
      device.deviceId === selectedRemoteDeviceId
        ? {
          ...device,
          ...updates,
          updatedAt: new Date().toISOString(),
          lastSeenSeconds: 0,
        }
        : device
    )));
  };

  const startTrackOnActiveReceiver = (track: Track, newQueue?: Track[]) => {
    if (isControllingRemoteReceiver) {
      if (!canControlSelectedRemoteReceiver('play_track')) return;
      const queuePayload = newQueue && newQueue.length > 0 ? newQueue : [track];
      const queueIndexPayload = Math.max(0, queuePayload.findIndex((entry) => entry.id === track.id));
      rememberTrackSnapshots([track, ...queuePayload]);
      patchSelectedRemoteDevice({
        currentTrack: track,
        queue: queuePayload,
        queueIndex: queueIndexPayload,
        isPlaying: true,
        progress: 0,
        duration: track.durationMs ? track.durationMs / 1000 : selectedRemoteDevice?.duration || 0,
      });
      void sendRemoteCommand('play_track', {
        track,
        queue: queuePayload,
        queueIndex: queueIndexPayload,
      });
      setRemoteStatus(`Sent "${track.title}" to ${receiverLabel}.`);
      return;
    }

    playTrack(track, newQueue);
  };

  const handleReceiverPrev = () => {
    if (isControllingRemoteReceiver) {
      if (!canControlSelectedRemoteReceiver('previous')) return;
      patchSelectedRemoteDevice({ isPlaying: true });
      void sendRemoteCommand('previous');
      return;
    }
    handlePrev();
  };

  const handleReceiverNext = () => {
    if (isControllingRemoteReceiver) {
      if (!canControlSelectedRemoteReceiver('next')) return;
      patchSelectedRemoteDevice({ isPlaying: true });
      void sendRemoteCommand('next');
      return;
    }
    handleNext();
  };

  const toggleReceiverPlayPause = () => {
    if (isControllingRemoteReceiver) {
      const nextCommand: RemoteCommandType = playerIsPlaying ? 'pause' : 'play';
      if (!canControlSelectedRemoteReceiver(nextCommand)) return;
      patchSelectedRemoteDevice({ isPlaying: !playerIsPlaying });
      void sendRemoteCommand(nextCommand);
      return;
    }
    togglePlayPause();
  };

  const seekActiveReceiverTo = (seekTime: number) => {
    if (isControllingRemoteReceiver) {
      if (!canControlSelectedRemoteReceiver('seek')) return;
      const safeSeek = Math.max(0, Math.min(seekTime, playerDuration || seekTime));
      patchSelectedRemoteDevice({ progress: safeSeek });
      void sendRemoteCommand('seek', { progress: safeSeek });
      return;
    }
    seekToPosition(seekTime);
  };

  const handleReceiverSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (playerDuration <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = x / rect.width;
    seekActiveReceiverTo(pct * playerDuration);
  };

  const setReceiverVolume = (nextVolume: number) => {
    const safeVolume = Math.max(0, Math.min(100, Math.round(nextVolume)));
    if (isControllingRemoteReceiver) {
      if (!canControlSelectedRemoteReceiver('volume')) return;
      patchSelectedRemoteDevice({ volume: safeVolume });
      void sendRemoteCommand('volume', { volume: safeVolume });
      return;
    }
    setVolume(safeVolume);
  };

  const refreshSpiceConnectReceiverList = () => {
    if (!cloudToken || !remoteControlEnabled) return;
    void reportRemoteDeviceState();
    void loadRemoteDevices();
  };

  const receiverStatusLabel = (device: RemoteDevice | null) => {
    if (!device) return 'Local playback';
    if (device.lastSeenSeconds === undefined) return 'Remote ready';
    if (device.lastSeenSeconds <= 5) return device.isPlaying ? 'Live now' : 'Online now';
    return `Last seen ${device.lastSeenSeconds}s ago`;
  };

  const renderSpiceConnectReceiverOption = (
    value: string,
    label: string,
    detail: string,
    selected: boolean,
  ) => (
    <button
      key={value || 'local-device'}
      type="button"
      role="option"
      aria-selected={selected}
      className={`spice-connect-receiver__option ${selected ? 'is-selected' : ''}`}
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => {
        selectSpiceConnectReceiver(value);
        setReceiverMenuOpen(null);
      }}
    >
      <span className="spice-connect-receiver__option-icon">{Icons.monitor}</span>
      <span className="spice-connect-receiver__option-copy">
        <strong>{label}</strong>
        <small>{detail}</small>
      </span>
      <span className="spice-connect-receiver__option-marker" aria-hidden="true" />
    </button>
  );

  const renderSpiceConnectReceiverSelect = (variant: ReceiverSelectVariant) => {
    const menuId = `spice-connect-receiver-menu-${variant}`;
    const isMenuOpen = receiverMenuOpen === variant;
    const receiverDetail = receiverSelectDisabled
      ? 'Sign in to choose devices'
      : receiverStatusLabel(selectedRemoteDevice);

    return (
      <div
        className={`spice-connect-receiver spice-connect-receiver--${variant} ${isControllingRemoteReceiver ? 'is-remote' : ''} ${isMenuOpen ? 'is-open' : ''} ${receiverSelectDisabled ? 'is-disabled' : ''}`}
        onBlur={(event) => {
          const nextTarget = event.relatedTarget as Node | null;
          if (!nextTarget || !event.currentTarget.contains(nextTarget)) {
            setReceiverMenuOpen(null);
          }
        }}
      >
        <button
          type="button"
          className="spice-connect-receiver__button"
          onClick={() => {
            if (receiverSelectDisabled) return;
            refreshSpiceConnectReceiverList();
            setReceiverMenuOpen((openVariant) => (openVariant === variant ? null : variant));
          }}
          onFocus={refreshSpiceConnectReceiverList}
          disabled={receiverSelectDisabled}
          aria-haspopup="listbox"
          aria-expanded={isMenuOpen}
          aria-controls={menuId}
          title={receiverSelectDisabled ? 'Sign in and enable Spice Connect to choose another receiver' : `Receiver: ${receiverLabel}`}
        >
          <span className="spice-connect-receiver__icon">{Icons.monitor}</span>
          <span className="spice-connect-receiver__copy">
            <strong>{receiverLabel}</strong>
            <small>{receiverDetail}</small>
          </span>
          <span className="spice-connect-receiver__chevron" aria-hidden="true">{Icons.chevronRight}</span>
        </button>

        {isMenuOpen && (
          <div
            id={menuId}
            className="spice-connect-receiver__menu"
            role="listbox"
            aria-label="Choose Spice Connect receiver"
          >
            {renderSpiceConnectReceiverOption('', 'This device', 'Play and control locally', !selectedRemoteDeviceId)}
            {remoteTargetDevices.length > 0 ? (
              remoteTargetDevices.map((device) => renderSpiceConnectReceiverOption(
                device.deviceId,
                device.displayName,
                receiverStatusLabel(device),
                selectedRemoteDeviceId === device.deviceId,
              ))
            ) : (
              <p className="spice-connect-receiver__empty">No other devices online.</p>
            )}
          </div>
        )}
      </div>
    );
  };

  const getLikedTrackClickHandler = (track: Track) => () => {
    startTrackOnActiveReceiver(track);
  };

  const clearHistory = () => {
    requestSpiceConfirm({
      title: 'Clear Recently Played?',
      message: 'This removes the recent track list for the active profile.',
      confirmLabel: 'Clear History',
      kind: 'warning',
      onConfirm: () => {
        setHistory([]);
        updateActiveProfileData({ history: [] });
        autoSyncHistory([]);
        showSpiceNotice('Recently played tracks cleared.', 'success');
      },
    });
  };

  const shufflePlaylistPlay = (tracks: Track[]) => {
    if (!tracks || tracks.length === 0) return;
    setIsShuffle(true);
    localStorage.setItem('spice_is_shuffle', 'true');
    const shuffled = [...tracks].sort(() => getSecureRandom() - 0.5);
    startTrackOnActiveReceiver(shuffled[0], shuffled);
  };

  // Profile switching, locking and passcode validations
  const switchProfile = (profileId: string, profileOverride?: UserProfile) => {
    let latestProfiles = profiles;
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('spice_profiles_list');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.length > 0) {
            latestProfiles = parsed;
            setProfiles(parsed);
          }
        } catch { }
      }
    }

    const currentProfileId = activeProfileIdRef.current;
    let capturedCurrentSession = false;
    latestProfiles = latestProfiles.map((profile) => {
      if (profile.id !== currentProfileId) return profile;
      capturedCurrentSession = true;
      return {
        ...profile,
        cloudToken: cloudTokenRef.current,
        cloudUser: cloudUserRef.current,
        cloudUsername: cloudUsernameRef.current,
      };
    });
    if (capturedCurrentSession) {
      setProfiles(latestProfiles);
      localStorage.setItem('spice_profiles_list', JSON.stringify(latestProfiles));
    }

    const target = profileOverride || latestProfiles.find(p => p.id === profileId);
    if (!target) return;

    setActiveProfileId(profileId);
    localStorage.setItem('spice_active_profile_id', profileId);

    const nextToken = target.cloudToken || null;
    const nextUser = target.cloudUser || null;
    const nextUsername = target.cloudUsername || null;
    setCloudToken(nextToken);
    setCloudUser(nextUser);
    setCloudUsername(nextUsername);
    setUsernameInput(nextUsername || '');
    activeProfileIdRef.current = profileId;
    cloudTokenRef.current = nextToken;
    cloudUserRef.current = nextUser;
    cloudUsernameRef.current = nextUsername;

    if (nextToken) {
      localStorage.setItem('spice_cloud_token', nextToken);
    } else {
      localStorage.removeItem('spice_cloud_token');
    }
    if (nextUser) {
      localStorage.setItem('spice_cloud_user', JSON.stringify(nextUser));
    } else {
      localStorage.removeItem('spice_cloud_user');
    }
    logDebug('profile', `Switched active profile to "${target.displayName}" (Playlists: ${target.customPlaylists?.length || 0}, Likes: ${target.likedTracks?.length || 0})`);

    // Synchronize states immediately to prevent cascading renders
    const targetHistory = (target.history || []).map(enrichTrackSnapshot);
    const targetLikedDetails = Object.fromEntries(
      Object.entries(target.likedTrackDetails || {}).map(([id, track]) => [id, enrichTrackSnapshot(track)]),
    );
    const targetPlaylists = (target.customPlaylists || []).map((playlist) => ({
      ...playlist,
      tracks: (playlist.tracks || []).map(enrichTrackSnapshot),
    }));
    setLikedTracks(new Set(target.likedTracks));
    setLikedTrackDetails(targetLikedDetails);
    setCustomPlaylists(targetPlaylists);
    setHistory(targetHistory);
    setEditName(target.displayName);
    setEditBio(target.bio);
    setEditGradient(target.gradient);
    setEditPasscode(target.passcode || '');
    setEditAvatarUrl(target.avatarUrl || '');

    const savedPlayback = getPlaybackState(target.id);
    if (savedPlayback) {
      setCurrentTrack(savedPlayback.currentTrack);
      setQueue(savedPlayback.queue.length > 0 ? savedPlayback.queue : [savedPlayback.currentTrack]);
      setQueueIndex(Math.min(savedPlayback.queueIndex, Math.max(savedPlayback.queue.length - 1, 0)));
      setProgress(savedPlayback.progress);
    } else if (targetHistory.length > 0) {
      setCurrentTrack(targetHistory[0]);
      setQueue([targetHistory[0]]);
    } else {
      const placeholderTrack = {
        id: 'placeholder',
        title: 'Select a track to play',
        artists: [{ id: 'Spice', name: 'Spice Player' }],
        artworkUrl: '/icon.svg'
      };
      setCurrentTrack(placeholderTrack);
      setQueue([placeholderTrack]);
    }
    if (!savedPlayback) {
      setQueueIndex(0);
      setProgress(0);
    }
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

  const createProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProfileName.trim()) return;

    const newId = createUserProfileId();
    const sanitizedUrl = sanitizePfpUrl(newProfileAvatarUrl);
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
      history: [],
      avatarUrl: sanitizedUrl || undefined
    };

    const updatedList = [...profiles, newProf];
    setProfiles(updatedList);
    localStorage.setItem('spice_profiles_list', JSON.stringify(updatedList));
    autoSyncProfiles(updatedList);

    // Reset forms and dialogs
    setNewProfileName('');
    setNewProfileBio('');
    setNewProfilePasscode('');
    setNewProfileAvatarUrl('');
    setShowCreateProfileDialog(false);

    // Switch instantly
    switchProfile(newId, newProf);
  };

  const deleteProfile = (profileId: string) => {
    if (profiles.length <= 1) {
      showSpiceNotice('You must have at least one active profile.', 'warning');
      return;
    }
    requestSpiceConfirm({
      title: 'Delete Profile?',
      message: 'This deletes the profile and all of its playlists and likes. This cannot be undone.',
      confirmLabel: 'Delete Profile',
      kind: 'danger',
      onConfirm: () => {
        const updated = profiles.filter(p => p.id !== profileId);
        setProfiles(updated);
        localStorage.setItem('spice_profiles_list', JSON.stringify(updated));
        autoSyncProfiles(updated);

        // Switch to first profile
        switchProfile(updated[0].id);
        showSpiceNotice('Profile deleted.', 'success');
      },
    });
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
    showSpiceNotice('Passcode protection removed successfully.', 'success');
  };

  const saveProfile = (e: React.FormEvent) => {
    e.preventDefault();

    // Passcode validation
    const passcodeVal = editPasscode.trim();
    if (passcodeVal && passcodeVal.length !== 4) {
      showSpiceNotice('Passcode must be exactly 4 digits.', 'warning');
      return;
    }

    const sanitizedUrl = sanitizePfpUrl(editAvatarUrl);
    updateActiveProfileData({
      displayName: editName.trim() || 'Spice Listener',
      bio: editBio.trim() || 'No bio written yet.',
      gradient: editGradient,
      passcode: passcodeVal ? passcodeVal : undefined,
      avatarUrl: sanitizedUrl || undefined,
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
      rememberTrackSnapshots(tracks);

      // Add as custom playlist
      const newPlaylist: Playlist = {
        id: createPlaylistId(),
        title: playlistData.title || 'YT Import',
        description: playlistData.description || 'Imported YouTube playlist.',
        tracks,
        gradient: PRESET_GRADIENTS[randomIndex(PRESET_GRADIENTS.length)],
        createdAt: new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
      };

      const updated = [...customPlaylists, newPlaylist];
      persistCustomPlaylists(updated);

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
      .then(() => showSpiceNotice('Spice JSON Backup copied to clipboard.', 'success'))
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
            id: 'backup_' + Date.now() + '_' + randomSuffix()
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
      showSpiceNotice('Backup database parsed and merged successfully.', 'success');

    } catch (e: any) {
      console.error(e);
      setJsonBackupStatus('error');
      showSpiceNotice('Error parsing JSON backup: ' + e.message, 'danger');
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
            --accent-violet: #3b82f6 !important;
            --accent-cyan: #06b6d4 !important;
            --accent-gradient: linear-gradient(135deg, #06b6d4, #3b82f6) !important;
            --text-accent: #93c5fd !important;
          }
        `;
        break;
      case 'orange':
        base = `
          :root {
            --accent-pink: #f97316 !important;
            --accent-pink-rgb: 249, 115, 22 !important;
            --accent-purple: #ef4444 !important;
            --accent-violet: #f97316 !important;
            --accent-cyan: #ef4444 !important;
            --accent-gradient: linear-gradient(135deg, #f97316, #ef4444) !important;
            --text-accent: #fdba74 !important;
          }
        `;
        break;
      case 'green':
        base = `
          :root {
            --accent-pink: #10b981 !important;
            --accent-pink-rgb: 16, 185, 129 !important;
            --accent-purple: #059669 !important;
            --accent-violet: #10b981 !important;
            --accent-cyan: #059669 !important;
            --accent-gradient: linear-gradient(135deg, #10b981, #059669) !important;
            --text-accent: #6ee7b7 !important;
          }
        `;
        break;
      case 'gold':
        base = `
          :root {
            --accent-pink: #f59e0b !important;
            --accent-pink-rgb: 245, 158, 11 !important;
            --accent-purple: #d97706 !important;
            --accent-violet: #f59e0b !important;
            --accent-cyan: #d97706 !important;
            --accent-gradient: linear-gradient(135deg, #f59e0b, #d97706) !important;
            --text-accent: #fcd34d !important;
          }
        `;
        break;
      case 'crimson':
        base = `
          :root {
            --accent-pink: #ff003c !important;
            --accent-pink-rgb: 255, 0, 60 !important;
            --accent-purple: #990011 !important;
            --accent-violet: #ff003c !important;
            --accent-cyan: #ff3366 !important;
            --accent-gradient: linear-gradient(135deg, #ff003c, #990011) !important;
            --text-accent: #ffa3b1 !important;
          }
        `;
        break;
      case 'deeppurple':
        base = `
          :root {
            --accent-pink: #7c3aed !important;
            --accent-pink-rgb: 124, 58, 237 !important;
            --accent-purple: #4c1d95 !important;
            --accent-violet: #7c3aed !important;
            --accent-cyan: #3b0764 !important;
            --accent-gradient: linear-gradient(135deg, #4c1d95, #120024) !important;
            --text-accent: #c084fc !important;
          }
        `;
        break;
      default: // pink
        base = `
          :root {
            --accent-pink: #ec4899 !important;
            --accent-pink-rgb: 236, 72, 153 !important;
            --accent-purple: #a855f7 !important;
            --accent-violet: #a855f7 !important;
            --accent-cyan: #ec4899 !important;
            --accent-gradient: linear-gradient(135deg, #a855f7, #ec4899) !important;
            --text-accent: #f9a8d4 !important;
          }
        `;
        break;
    }

    const surfaceCssByMode: Record<VisualSurface, string> = {
      midnight: `
        --body-bg: #000000;
        --card-bg: rgba(10, 10, 10, 0.92);
        --border-color: rgba(255, 255, 255, 0.08);
        --bg-primary: #000000;
        --bg-surface: #0a0a0a;
        --bg-surface-hover: #151515;
        --bg-glass: rgba(8, 8, 10, 0.9);
        --spice-app-background: #000000;
        --spice-panel-filter: blur(20px);
      `,
      glass: `
        --body-bg: #050507;
        --card-bg: rgba(17, 17, 24, 0.68);
        --border-color: rgba(255, 255, 255, 0.12);
        --bg-primary: #050507;
        --bg-surface: rgba(14, 14, 18, 0.78);
        --bg-surface-hover: rgba(34, 34, 42, 0.82);
        --bg-glass: rgba(12, 12, 18, 0.72);
        --spice-app-background: radial-gradient(circle at 12% 8%, rgba(var(--accent-pink-rgb), 0.16), transparent 32%), #050507;
        --spice-panel-filter: blur(24px);
      `,
      solid: `
        --body-bg: #050505;
        --card-bg: #111113;
        --border-color: rgba(255, 255, 255, 0.1);
        --bg-primary: #050505;
        --bg-surface: #111113;
        --bg-surface-hover: #1b1b1f;
        --bg-glass: #0d0d10;
        --spice-app-background: #050505;
        --spice-panel-filter: none;
      `,
      aurora: `
        --body-bg: #030305;
        --card-bg: rgba(14, 12, 22, 0.78);
        --border-color: rgba(var(--accent-pink-rgb), 0.16);
        --bg-primary: #030305;
        --bg-surface: rgba(12, 10, 18, 0.9);
        --bg-surface-hover: rgba(35, 26, 48, 0.9);
        --bg-glass: rgba(9, 8, 16, 0.78);
        --spice-app-background: radial-gradient(circle at 16% 10%, rgba(var(--accent-pink-rgb), 0.22), transparent 28%), radial-gradient(circle at 86% 20%, rgba(168, 85, 247, 0.16), transparent 34%), #030305;
        --spice-panel-filter: blur(24px);
      `,
    };
    const artRadiusByShape: Record<ArtworkShape, string> = {
      rounded: '10px',
      soft: '18px',
      circle: '9999px',
    };
    const scaleCssByMode: Record<InterfaceScale, string> = {
      compact: '--sidebar-width: 240px; --now-playing-height: 78px; --spice-content-x: 32px; --spice-content-y: 24px;',
      comfortable: '--sidebar-width: 260px; --now-playing-height: 88px; --spice-content-x: 48px; --spice-content-y: 32px;',
      spacious: '--sidebar-width: 290px; --now-playing-height: 104px; --spice-content-x: 64px; --spice-content-y: 44px;',
    };
    const playerBarRootCssByDensity: Record<PlayerBarDensity, string> = {
      standard: '',
      slim: '--now-playing-height: 66px;',
    };
    const playerBarCssByDensity: Record<PlayerBarDensity, string> = {
      standard: '',
      slim: `
        .now-playing {
          min-height: 66px !important;
          padding-left: clamp(10px, 1.6vw, 22px) !important;
          padding-right: clamp(10px, 1.6vw, 22px) !important;
          gap: clamp(6px, 1vw, 14px) !important;
        }
        .now-playing__btn {
          width: 28px !important;
          height: 28px !important;
        }
        .now-playing__btn svg {
          width: 16px !important;
          height: 16px !important;
        }
        .now-playing__btn--play {
          width: 36px !important;
          height: 36px !important;
        }
        .now-playing__btn--play svg {
          width: 18px !important;
          height: 18px !important;
        }
        .now-playing__song {
          gap: 10px !important;
          flex-basis: clamp(150px, 22vw, 300px) !important;
          max-width: clamp(150px, 22vw, 300px) !important;
        }
        .now-playing__art {
          width: 40px !important;
          height: 40px !important;
        }
        .now-playing__title {
          font-size: 0.82rem !important;
        }
        .now-playing__artist {
          font-size: 0.7rem !important;
        }
        .now-playing__seek {
          font-size: 0.7rem !important;
        }
        .now-playing__seek-track {
          height: 3px !important;
        }
        .now-playing__seek-track:hover {
          height: 5px !important;
        }
        .now-playing__waveform {
          height: 12px !important;
        }
        .now-playing__like,
        .now-playing__volume-btn {
          width: 26px !important;
          height: 26px !important;
        }
        @media (max-width: 600px) {
          .now-playing {
            height: 58px !important;
            min-height: 58px !important;
            border-radius: 18px !important;
            grid-template-columns: minmax(0, 1fr) 38px !important;
          }
          .now-playing__art {
            width: 40px !important;
            height: 40px !important;
          }
          .now-playing__mobile-play {
            width: 38px !important;
            height: 38px !important;
          }
        }
      `,
    };
    const motionCssByLevel: Record<MotionLevel, string> = {
      full: '',
      calm: `
        .vinyl-spin { animation-duration: 34s !important; }
        .now-playing__waveform-bar { animation-duration: 1.35s !important; }
        .animate-in { animation-duration: 0.18s !important; }
      `,
      off: `
        html { scroll-behavior: auto !important; }
        *, *::before, *::after {
          animation-duration: 0.001ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.001ms !important;
          scroll-behavior: auto !important;
        }
        .vinyl-spin,
        .now-playing__waveform-bar,
        .animate-in,
        .animate-spin {
          animation: none !important;
        }
      `,
    };

    base += `
      :root {
        ${surfaceCssByMode[visualSurface]}
        ${scaleCssByMode[interfaceScale]}
        ${playerBarRootCssByDensity[playerBarDensity]}
        --spice-art-radius: ${artRadiusByShape[artworkShape]};
      }
      .app {
        background: var(--spice-app-background) !important;
      }
      .main__content {
        padding: var(--spice-content-y) var(--spice-content-x) calc(var(--space-4xl) + 40px) !important;
      }
      .sidebar,
      .now-playing,
      .queue-drawer,
      .lyrics-drawer,
      .mini-player,
      .expanded-player {
        backdrop-filter: var(--spice-panel-filter) !important;
        -webkit-backdrop-filter: var(--spice-panel-filter) !important;
      }
      .card__art-wrapper,
      .card__art,
      .quick-card__art,
      .library-item__art,
      .now-playing__art,
      .expanded-player__art-box,
      .mini-player img {
        border-radius: var(--spice-art-radius) !important;
      }
      ${motionCssByLevel[motionLevel]}
      ${playerBarCssByDensity[playerBarDensity]}
    `;

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

  const normalizedTopbarQuery = topbarSearchQuery.trim().toLocaleLowerCase();
  const topbarRecentSuggestions = recentSearchEntries
    .filter((entry) => entry.query.trim().toLocaleLowerCase() !== normalizedTopbarQuery)
    .slice(0, 6);
  const topbarTrayResults = searchResults.slice(0, 6);
  const shouldShowTopbarSearchTray =
    topbarSearchTrayOpen
    && (Boolean(topbarSearchQuery.trim()) || topbarRecentSuggestions.length > 0 || topbarTrayResults.length > 0 || isSearching);

  const isPlaylistOwner = selectedPlaylist
    ? (!selectedPlaylist.shared || selectedPlaylist.shareRole === 'owner' || selectedPlaylist.ownerId === cloudUser?.id)
    : false;

  return (
    <div className={`app ${sidebarHidden ? 'app--sidebar-hidden' : ''}`}>
      <style dangerouslySetInnerHTML={{ __html: getAccentStyles() }} />
      {spiceNotices.length > 0 && (
        <div className="spice-notices-container">
          {spiceNotices.map((notice) => (
            <div key={notice.id} className={`spice-notice spice-notice--${notice.kind}`} role="status" aria-live="polite">
              <span className="spice-notice__icon">
                {notice.kind === 'success' ? Icons.checkCircle : notice.kind === 'info' ? Icons.musicNote : Icons.alertTriangle}
              </span>
              <span className="spice-notice__message">{notice.message}</span>
              <button type="button" onClick={() => dismissSpiceNotice(notice.id)} aria-label="Dismiss notification" className="spice-notice__close">
                {Icons.close}
              </button>
            </div>
          ))}
        </div>
      )}
      {spiceConfirm && (
        <div className="spice-dialog-backdrop" role="presentation">
          <div
            className={`spice-dialog spice-dialog--${spiceConfirm.kind || 'info'}`}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="spice-dialog-title"
            aria-describedby="spice-dialog-message"
          >
            <div className="spice-dialog__mark">
              {spiceConfirm.kind === 'success' ? Icons.checkCircle : spiceConfirm.kind === 'info' ? Icons.musicNote : Icons.alertTriangle}
            </div>
            <div className="spice-dialog__body">
              <h2 id="spice-dialog-title">{spiceConfirm.title}</h2>
              <p id="spice-dialog-message">{spiceConfirm.message}</p>
            </div>
            <div className="spice-dialog__actions">
              <button type="button" className="spice-dialog__button spice-dialog__button--ghost" onClick={cancelSpiceConfirm}>
                {spiceConfirm.cancelLabel || 'Cancel'}
              </button>
              <button
                type="button"
                className="spice-dialog__button spice-dialog__button--primary"
                onClick={() => {
                  const onConfirm = spiceConfirm.onConfirm;
                  setSpiceConfirm(null);
                  onConfirm();
                }}
              >
                {spiceConfirm.confirmLabel || 'Continue'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── Song Share Dialog ── */}
      {songShareDialog && (
        <div className="spice-dialog-backdrop" role="presentation" onClick={() => setSongShareDialog(null)}>
          <div
            className="spice-share-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="spice-share-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="spice-share-dialog__header">
              <img
                src={songShareDialog.track.artworkUrl || '/icon.svg'}
                alt=""
                className="spice-share-dialog__art"
              />
              <div className="spice-share-dialog__copy">
                <span className="spice-share-dialog__eyebrow">Share song</span>
                <h2 id="spice-share-title">{songShareDialog.track.title}</h2>
                <p>{profileArtistName(songShareDialog.track)} | {trackSourceLabel(songShareDialog.track)}</p>
              </div>
              <button
                type="button"
                className="spice-share-dialog__close"
                onClick={() => setSongShareDialog(null)}
                aria-label="Close share options"
              >
                {Icons.close}
              </button>
            </div>
            <div className="spice-share-dialog__link" title={songShareDialog.shareUrl}>
              {songShareDialog.shareUrl}
            </div>
            <div className="spice-share-dialog__actions">
              <button type="button" className="spice-share-dialog__button spice-share-dialog__button--primary" onClick={copySongShareLink}>
                {Icons.clipboard} Copy Link
              </button>
              <button
                type="button"
                className="spice-share-dialog__button"
                onClick={downloadSharedSong}
                title="Download audio file"
              >
                {Icons.download} Download
              </button>
              <button type="button" className="spice-share-dialog__button" onClick={openSongSource}>
                {Icons.globe} Source
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── Security Passcode Lock Overlay ── */}
      {isLocked && (
        <div className="passcode-overlay animate-in" style={{ position: 'fixed', inset: 0, background: '#000000', zIndex: 120000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(32px)' }}>
          <div style={{ textAlign: 'center', maxWidth: '320px', width: '100%', padding: '24px' }}>
            <div style={{ width: '120px', height: '120px', borderRadius: '50%', background: activeProfile.avatarUrl ? 'none' : activeProfile.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3.5rem', fontWeight: 900, color: '#fff', margin: '0 auto 24px auto', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', overflow: 'hidden', border: '3px solid var(--accent-pink)' }}>
              {activeProfile.avatarUrl ? (
                <img src={activeProfile.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                activeProfile.displayName.charAt(0).toUpperCase()
              )}
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
                    showSpiceNotice('All profiles are locked. Please enter correct credentials.', 'warning');
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
          key={streamUrl}
          ref={audioRef}
          src={streamUrl}
          autoPlay={isPlaying}
          preload="auto"
          onCanPlay={handleAudioCanPlay}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleAudioEnded}
          onError={handleAudioError}
        />
      )}

      {/* Stealth YouTube Embed Container — Invisible but functional for audio fallback */}
      <div
        className={`floating-yt-panel ${showVideoPlayer ? 'is-visible' : ''}`}
        aria-hidden={!showVideoPlayer}
      >
        {showVideoPlayer && (
          <div className="floating-yt-panel__header">
            <span className="floating-yt-panel__title">YouTube Video</span>
            <button
              className="floating-yt-panel__close"
              type="button"
              onClick={() => setShowVideoPlayer(false)}
              aria-label="Close video player"
              title="Close video player"
            >
              {Icons.close}
            </button>
          </div>
        )}
        <div
          id="spice-yt-iframe-container"
          className="floating-yt-panel__frame"
        />
      </div>

      {sidebarHidden && (
        <button
          type="button"
          className="sidebar-restore-btn"
          onClick={() => updateSidebarHiddenPreference(false)}
          aria-label="Show sidebar"
          title="Show sidebar"
        >
          {Icons.chevronRight}
          <span>Sidebar</span>
        </button>
      )}

      {/* ═══ Sidebar Panel ═══ */}
      {!sidebarHidden && (
        <aside className="sidebar">
          <div className="sidebar__logo">
            <button
              type="button"
              className="sidebar__brand"
              onClick={() => { setCurrentPage('home'); setSelectedPlaylist(null); }}
              aria-label="Go to SPICE home"
            >
              <div
                className="sidebar__logo-icon"
              >
                <span style={{ fontSize: '1rem', fontWeight: 900, color: '#fff' }}>S</span>
              </div>
              <span className="sidebar__logo-text">
                Spice
              </span>
            </button>
            <button
              type="button"
              className="sidebar__hide-btn"
              onClick={() => updateSidebarHiddenPreference(true)}
              aria-label="Hide sidebar"
              title="Hide sidebar"
            >
              {Icons.chevronLeft}
            </button>
          </div>

          <nav className="sidebar__nav">
            <button
              className={`sidebar__nav-item ${currentPage === 'home' && !selectedPlaylist ? 'active' : ''}`}
              onClick={() => { setCurrentPage('home'); setSelectedPlaylist(null); }}
            >
              {Icons.home}
              <span className="sidebar__nav-label">Home</span>
            </button>
            {sidebarSearchEnabled && (
              <button
                className={`sidebar__nav-item ${currentPage === 'search' && !selectedPlaylist ? 'active' : ''}`}
                onClick={() => { setCurrentPage('search'); setSelectedPlaylist(null); }}
              >
                {Icons.search}
                <span className="sidebar__nav-label">Search</span>
              </button>
            )}
            <button
              className={`sidebar__nav-item ${currentPage === 'library' && !selectedPlaylist ? 'active' : ''}`}
              onClick={() => { setCurrentPage('library'); setSelectedPlaylist(null); }}
            >
              {Icons.library}
              <span className="sidebar__nav-label">Library</span>
            </button>
            {sidebarProfileEnabled && (
              <button
                className={`sidebar__nav-item ${currentPage === 'account' && !selectedPlaylist ? 'active' : ''}`}
                onClick={() => { setCurrentPage('account'); setSelectedPlaylist(null); }}
              >
                {Icons.account}
                <span className="sidebar__nav-label">Profile</span>
              </button>
            )}
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
            <button className="sidebar__add-btn" onClick={() => setShowCreateDialog(true)} title="Create Playlist" aria-label="Create Playlist">
              {Icons.plus}
            </button>
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
                  <span className="sidebar__playlist-title">
                    <span className="truncate">{pl.title}</span>
                    {pl.shared && <span className="playlist-shared-pill">Shared</span>}
                  </span>
                </button>
              ))
            )}
          </div>
        </aside>
      )}

      {/* ═══ Main Content Area ═══ */}
      <main className="main" id="main">
        <div className="main__content">
          <header className="app-topbar" aria-label="SPICE topbar">
            <div className="app-topbar__context">
              <span>{currentPage === 'search' ? 'Search mode' : 'SPICE Music'}</span>
              <strong>{currentPage.charAt(0).toUpperCase() + currentPage.slice(1)}</strong>
            </div>

            <div className="app-topbar__search-shell">
              <form className="app-topbar__search" onSubmit={handleTopbarSearchSubmit} role="search">
                {Icons.search}
                <input
                  type="search"
                  placeholder={`Search ${SEARCH_PROVIDER_LABELS[searchProvider]}...`}
                  value={topbarSearchQuery}
                  onChange={handleTopbarSearchInput}
                  onFocus={() => {
                    const recent = getRecentCachedSearches();
                    setRecentSearchEntries(recent);
                    if (topbarSearchQuery.trim() || recent.length > 0 || searchResults.length > 0) {
                      setTopbarSearchTrayOpen(true);
                    }
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Escape') {
                      setTopbarSearchTrayOpen(false);
                    }
                  }}
                  autoComplete="off"
                  aria-label="Search SPICE"
                />
                <button type="submit" disabled={!topbarSearchQuery.trim()}>
                  Search
                </button>
              </form>

              {shouldShowTopbarSearchTray && (
                <div className="app-topbar__search-tray" role="region" aria-label="Topbar search results">
                  <div className="app-topbar__search-tray-header">
                    <div>
                      <span>Quick Search</span>
                      <strong>{topbarSearchQuery.trim() ? topbarSearchQuery.trim() : 'Recent searches'}</strong>
                    </div>
                    <button
                      type="button"
                      className="app-topbar__tray-close"
                      onClick={() => setTopbarSearchTrayOpen(false)}
                      aria-label="Close search tray"
                    >
                      {Icons.close}
                    </button>
                  </div>

                  {topbarRecentSuggestions.length > 0 && (
                    <div className="app-topbar__recent-searches">
                      <span>Previous queries</span>
                      <div>
                        {topbarRecentSuggestions.map((entry) => (
                          <button
                            key={`${entry.sourceId ?? 'unknown'}:${entry.query}`}
                            type="button"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => runRecentTopbarSearch(entry)}
                            title={`Search ${entry.query}`}
                          >
                            {entry.query}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="app-topbar__tray-results">
                    <div className="app-topbar__tray-section-title">
                      <span>{isSearching ? 'Searching...' : topbarTrayResults.length > 0 ? 'Songs' : 'No songs yet'}</span>
                      {searchResultsSource === 'cache' && <small>saved locally</small>}
                    </div>

                    {topbarTrayResults.length > 0 ? (
                      <div className="app-topbar__result-list">
                        {topbarTrayResults.map((song) => (
                          <div
                            key={`${song.sourceId || 'music'}:${song.id}`}
                            className="app-topbar__result-item"
                          >
                            <button
                              type="button"
                              className="app-topbar__result-main"
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => {
                                startTrackOnActiveReceiver(song, searchResults);
                                setTopbarSearchTrayOpen(false);
                              }}
                            >
                              <img src={song.artworkUrl || '/icon.svg'} alt="" />
                              <span>
                                <strong>{song.title}</strong>
                                <small>
                                  {song.artists.map((artist) => artist.name).join(', ')}
                                  <em>{trackSourceLabel(song)}</em>
                                </small>
                              </span>
                            </button>
                            {renderSongShareButton(song, 'app-topbar__result-share')}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="app-topbar__tray-empty">
                        {topbarSearchQuery.trim()
                          ? 'Submit the search to fill this tray with playable songs.'
                          : 'Pick a previous query or type a new search.'}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="app-topbar__actions">
              <span className="app-topbar__provider">
                {SEARCH_PROVIDER_LABELS[searchProvider]}
              </span>
              <button
                className="app-topbar__profile"
                type="button"
                onClick={openAccountFromTopbar}
                aria-label={`Open profile for ${activeProfile.displayName}`}
              >
                <span className="app-topbar__avatar" style={{ background: activeProfile.avatarUrl ? 'transparent' : activeProfile.gradient }}>
                  {activeProfile.avatarUrl ? (
                    <img src={activeProfile.avatarUrl} alt="" />
                  ) : (
                    activeProfile.displayName.charAt(0).toUpperCase()
                  )}
                </span>
                <span className="app-topbar__profile-copy">
                  <strong>{activeProfile.displayName}</strong>
                  <small>{cloudUser?.accountRole ? `${cloudUser.accountRole} account` : 'Local profile'}</small>
                </span>
              </button>
            </div>
          </header>

          {error && (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '12px 20px', borderRadius: '8px', marginBottom: '24px', color: '#f87171', display: 'flex', alignItems: 'center' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>{Icons.alertTriangle} {error}</span>
              <button onClick={() => setError(undefined)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', display: 'inline-flex' }} title="Dismiss error">{Icons.close}</button>
            </div>
          )}

          {/* ── Playlist Details View (Intercepts regular screens) ── */}
          {selectedPlaylist ? (
            <div className="animate-in">
              <button
                onClick={() => setSelectedPlaylist(null)}
                className="playlist-back-btn"
              >
                {Icons.back} Back to Library
              </button>

              {/* Hero banner */}
              <div className="playlist-hero" style={{ '--pl-gradient': selectedPlaylist.gradient } as React.CSSProperties}>
                <div className="playlist-hero__bg" />

                {isPlaylistOwner && (
                  <button
                    className="playlist-hero__edit-btn"
                    onClick={() => {
                      setEditPlTitle(selectedPlaylist.title);
                      setEditPlDesc(selectedPlaylist.description || '');
                      setEditPlGradient(selectedPlaylist.gradient);
                      setEditPlCoverUrl(selectedPlaylist.coverUrl || '');
                      setShowEditPlaylistDialog(true);
                    }}
                    title="Edit Playlist"
                  >
                    {Icons.edit} Edit Playlist
                  </button>
                )}

                <div className="playlist-hero__body">
                  {/* Cover art */}
                  <div className="playlist-hero__cover">
                    {selectedPlaylist.coverUrl ? (
                      <img src={selectedPlaylist.coverUrl} alt={selectedPlaylist.title} />
                    ) : selectedPlaylist.tracks.length > 0 ? (
                      <img src={selectedPlaylist.tracks[0].artworkUrl} alt={selectedPlaylist.title} />
                    ) : (
                      <span className="playlist-hero__cover-icon">{Icons.musicNote}</span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="playlist-hero__info">
                    <span className="playlist-hero__tag">
                      {selectedPlaylist.shared
                        ? (isPlaylistOwner ? '✦ Collaborative playlist' : '✦ Shared with you')
                        : 'Playlist'}
                    </span>
                    <h1 className="playlist-hero__title">{selectedPlaylist.title}</h1>
                    {selectedPlaylist.description && (
                      <p className="playlist-hero__desc">{selectedPlaylist.description}</p>
                    )}
                    <p className="playlist-hero__meta">
                      {selectedPlaylist.shared
                        ? (selectedPlaylist.ownerDisplayName ? `by ${selectedPlaylist.ownerDisplayName}` : 'Shared')
                        : `Created ${selectedPlaylist.createdAt}`}
                      {' · '}{selectedPlaylist.tracks.length} {selectedPlaylist.tracks.length === 1 ? 'track' : 'tracks'}
                    </p>
                  </div>
                </div>

                {/* Action bar sits at the bottom of the hero */}
                <div className="playlist-hero__actions">
                  {selectedPlaylist.tracks.length > 0 && (
                    <button
                      className="btn btn--primary"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      onClick={() => startTrackOnActiveReceiver(selectedPlaylist.tracks[0], selectedPlaylist.tracks)}
                    >
                      {Icons.play} Play all
                    </button>
                  )}
                  {selectedPlaylist.tracks.length > 0 && (
                    <button
                      className="btn btn--ghost playlist-hero__action-btn"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      onClick={() => shufflePlaylistPlay(selectedPlaylist.tracks)}
                    >
                      {Icons.shuffle} Shuffle Play
                    </button>
                  )}
                  {(!selectedPlaylist.shared || isPlaylistOwner) && (
                    <button
                      className="btn btn--ghost playlist-hero__action-btn"
                      onClick={() => sharePlaylist(selectedPlaylist)}
                      disabled={sharingPlaylistId === selectedPlaylist.id}
                    >
                      {Icons.clipboard}
                      {sharingPlaylistId === selectedPlaylist.id
                        ? 'Preparing…'
                        : selectedPlaylist.shared ? 'New Invite Link' : 'Share Playlist'}
                    </button>
                  )}
                  {selectedPlaylist.shared && isPlaylistUuid(selectedPlaylist.id) && (
                    <button
                      className="btn btn--ghost playlist-hero__action-btn"
                      onClick={() => {
                        setShowMembersPanel(!showMembersPanel);
                        if (!showMembersPanel) fetchPlaylistMembers(selectedPlaylist.id);
                      }}
                    >
                      {Icons.account} Collaborators
                    </button>
                  )}
                  {!isPlaylistOwner && (
                    <button
                      className="btn playlist-hero__action-btn playlist-hero__action-btn--danger"
                      onClick={() => {
                        requestSpiceConfirm({
                          title: 'Leave Shared Playlist?',
                          message: 'It will be removed from your library.',
                          confirmLabel: 'Leave Playlist',
                          kind: 'danger',
                          onConfirm: () => deletePlaylist(selectedPlaylist.id),
                        });
                      }}
                    >
                      {Icons.trash} Leave
                    </button>
                  )}
                </div>
              </div>

              {/* Share / invite status toast */}
              {shareStatus && (
                <div className="playlist-status-toast">
                  <span>{shareStatus}</span>
                  <button onClick={() => setShareStatus(null)} aria-label="Dismiss" className="playlist-status-toast__close">{Icons.close}</button>
                </div>
              )}

              {/* Collaborators Panel */}
              {showMembersPanel && (
                <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px', margin: '24px auto', maxWidth: '800px' }} className="animate-in">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontFamily: 'Outfit, sans-serif' }}>Playlist Collaborators</h3>
                    <button className="btn btn--ghost" style={{ padding: '4px 8px', fontSize: '0.8rem' }} onClick={() => setShowMembersPanel(false)}>
                      Close
                    </button>
                  </div>

                  {membersLoading ? (
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Loading collaborators...</div>
                  ) : (
                    <div>
                      {membersList && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                          {/* Owner */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: membersList.owner.avatarUrl ? 'none' : 'linear-gradient(135deg, #a855f7, #ec4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.9rem', color: '#fff', overflow: 'hidden', flexShrink: 0 }}>
                              {membersList.owner.avatarUrl ? <img src={membersList.owner.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : membersList.owner.displayName.charAt(0).toUpperCase()}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{membersList.owner.displayName}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Owner</div>
                            </div>
                          </div>

                          {/* Members */}
                          {membersList.members.map((m) => (
                            <div key={m.userId} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: m.avatarUrl ? 'none' : 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.9rem', color: '#fff', overflow: 'hidden', flexShrink: 0 }}>
                                {m.avatarUrl ? <img src={m.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : m.displayName.charAt(0).toUpperCase()}
                              </div>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{m.displayName}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Collaborator ({m.role})</div>
                              </div>
                              {/* Kick option if caller is owner */}
                              {isPlaylistOwner && (
                                <button
                                  onClick={() => removeMember(selectedPlaylist.id, m.userId)}
                                  style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem' }}
                                >
                                  Remove
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Invite section if caller is owner */}
                      {isPlaylistOwner && (
                        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                          <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Invite Collaborator (by Username)</label>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <input
                              type="text"
                              placeholder="e.g. music_buddy"
                              value={inviteUsername}
                              onChange={(e) => setInviteUsername(e.target.value)}
                              style={{ flex: 1, background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '6px 12px', fontSize: '0.85rem', color: '#fff' }}
                            />
                            <button
                              className="btn btn--primary"
                              style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                              onClick={() => inviteMember(selectedPlaylist.id)}
                              disabled={invitingMember || !inviteUsername.trim()}
                            >
                              {invitingMember ? 'Inviting...' : 'Invite'}
                            </button>
                          </div>
                          {memberActionStatus && (
                            <div style={{ fontSize: '0.8rem', color: 'var(--accent-pink)', marginTop: '6px' }}>
                              {memberActionStatus}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <section className="section" style={{ marginTop: '32px' }}>
                {selectedPlaylist.tracks.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--text-secondary)', background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                    <p style={{ fontSize: '1.2rem', marginBottom: '8px', color: '#fff' }}>This playlist is empty</p>
                    <p style={{ fontSize: '0.9rem', marginBottom: '16px' }}>
                      Search and add your favorite tracks
                    </p>
                    <button className="btn btn--primary" onClick={() => { setSelectedPlaylist(null); setCurrentPage('search'); }}>
                      Search Tracks
                    </button>
                  </div>
                ) : (
                  <div className="library-list">
                    {selectedPlaylist.tracks.map((song, i) => {
                      const isLiked = likedTracks.has(song.id);
                      const isPlayingCurrent = playerTrack.id === song.id;
                      return (
                        <div key={song.id} className="library-item animate-in">
                          <span className="library-item__index" style={{ width: '24px', color: 'var(--text-secondary)' }}>{i + 1}</span>
                          <img className="library-item__art" src={song.artworkUrl || '/icon.svg'} alt={song.title} onClick={() => startTrackOnActiveReceiver(song, selectedPlaylist.tracks)} />
                          <div className="library-item__info" onClick={() => startTrackOnActiveReceiver(song, selectedPlaylist.tracks)}>
                            <span className="library-item__title" style={isPlayingCurrent ? { color: 'var(--accent-pink)' } : {}}>
                              {song.title}
                            </span>
                            <span className="library-item__subtitle">
                              {song.artists.map(a => a.name).join(', ')}
                              {selectedPlaylist.shared && song.addedBy && (
                                <span style={{ marginLeft: '8px', fontSize: '0.72rem', background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: '4px', color: 'var(--accent-pink)', border: '1px solid rgba(255,255,255,0.04)' }}>
                                  Added by {song.addedBy.displayName}
                                </span>
                              )}
                            </span>
                          </div>

                          {(isPlaylistOwner || (selectedPlaylist.shared && song.addedBy?.userId === cloudUser?.id)) && (
                            <button
                              className="library-item__action"
                              style={{ opacity: 1, color: '#ef4444', marginRight: '8px' }}
                              onClick={() => removeTrackFromPlaylist(song.id, selectedPlaylist.id, i)}
                              title="Remove from playlist"
                            >
                              {Icons.trash}
                            </button>
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
                )}
              </section>
            </div>
          ) : (
            <>
              {/* ── Home Page ── */}
              {currentPage === 'home' && (
                <>
                  {/* cover greetings header */}
                  <section style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color)', padding: '28px', borderRadius: '16px', backdropFilter: 'blur(10px)' }} className="home-greeting animate-in">
                    <div className="home-greeting__copy">
                      <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '2.25rem', fontWeight: 800, margin: '0 0 6px 0', background: activeProfile.gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        Welcome back, {activeProfile.displayName}!
                      </h1>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: 0 }}>
                        Discover, stream, and sync your favorite music on the ultimate closed-source player.
                      </p>
                    </div>
                    <div className="home-greeting__avatar" style={{ width: '96px', height: '96px', borderRadius: '50%', background: activeProfile.avatarUrl ? 'none' : activeProfile.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', fontWeight: 900, color: '#fff', boxShadow: '0 8px 32px rgba(0,0,0,0.4)', textShadow: activeProfile.avatarUrl ? 'none' : '0 2px 8px rgba(0,0,0,0.3)', flexShrink: 0, overflow: 'hidden', border: '3px solid rgba(255, 255, 255, 0.1)' }}>
                      {activeProfile.avatarUrl ? (
                        <img src={activeProfile.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        activeProfile.displayName.charAt(0).toUpperCase()
                      )}
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
                              <div className="card__art-wrapper" style={{ background: pl.gradient || PRESET_GRADIENTS[0], display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '180px', position: 'relative', overflow: 'hidden' }}>
                                {pl.coverUrl ? (
                                  <img src={pl.coverUrl} alt={pl.title} style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} />
                                ) : pl.tracks.length > 0 ? (
                                  <img src={pl.tracks[0].artworkUrl} alt={pl.title} style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} />
                                ) : (
                                  <div style={{ fontSize: '3rem', textShadow: '0 4px 12px rgba(0,0,0,0.3)', color: '#fff', position: 'relative', zIndex: 1 }}>{Icons.musicFolder}</div>
                                )}
                                <div className="card__play-overlay">{Icons.play}</div>
                              </div>
                              <div className="card__title truncate" style={{ marginTop: '8px', fontWeight: 600 }}>{pl.title}</div>
                              <div className="card__subtitle truncate">
                                {pl.tracks.length} tracks{pl.shared ? ' | Shared' : ''}
                              </div>
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
                            <div key={song.id} className="card card--round animate-in" onClick={() => startTrackOnActiveReceiver(song, history)}>
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
                            <div key={song.id} className="card animate-in" onClick={() => startTrackOnActiveReceiver(song, homeListenAgain)}>
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

                  {/* Private recommendations */}
                  {(isLoadingRecommendations || homeRecommended.length > 0) && (
                    <section className="section animate-in">
                      <div className="section__header">
                        <div>
                          <h2 className="section__title">
                            {homeRecommendationSeed?.label || 'Recommended For You'}
                            <span style={{ marginLeft: '10px', fontSize: '0.7rem', fontWeight: 700, color: 'var(--accent-pink)', border: '1px solid var(--border-color)', borderRadius: '999px', padding: '3px 8px', verticalAlign: 'middle' }}>
                              Private mix
                            </span>
                          </h2>
                          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '6px 0 0' }}>
                            {homeRecommendationSeed?.reason || 'Built locally from this profile. Only coarse source searches leave the device.'}
                          </p>
                        </div>
                        {homeRecommendationSeed && (
                          <button
                            onClick={() => {
                              setCurrentPage('search');
                              setSearchQuery(homeRecommendationSeed.query);
                              queueSearch(homeRecommendationSeed.query);
                            }}
                            style={{ background: 'none', border: 'none', color: 'var(--accent-pink)', fontSize: '0.85rem', cursor: 'pointer' }}
                          >
                            Open Search
                          </button>
                        )}
                      </div>
                      <div className="carousel-wrapper">
                        <div className="carousel">
                          {isLoadingRecommendations && homeRecommended.length === 0 ? (
                            [...Array(4)].map((_, i) => (
                              <div key={i} style={{ width: '180px', height: '220px', background: 'var(--card-bg)', borderRadius: '12px', flexShrink: 0 }} />
                            ))
                          ) : (
                            homeRecommended.map((song) => (
                              <div key={`${song.sourceId || 'youtube_music'}:${song.id}`} className="card animate-in" onClick={() => startTrackOnActiveReceiver(song, homeRecommended)}>
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
                  )}

                  {/* Quick Picks (dynamic charts) */}
                  <section className="section">
                    <div className="section__header">
                      <h2 className="section__title">Quick Picks</h2>
                    </div>
                    {isLoadingHome ? (
                      <div className="quick-grid quick-grid--skeleton">
                        {[...Array(6)].map((_, i) => (
                          <div key={i} className="quick-card-skeleton"></div>
                        ))}
                      </div>
                    ) : (
                      <div className="quick-grid">
                        {homeTrending.slice(1, 7).map((song) => (
                          <div key={song.id} className="quick-card animate-in" onClick={() => startTrackOnActiveReceiver(song, homeTrending)}>
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
                            <div key={song.id} className="card animate-in" onClick={() => startTrackOnActiveReceiver(song, homeChill)}>
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
                            <div key={song.id} className="card animate-in" onClick={() => startTrackOnActiveReceiver(song, homeEnergy)}>
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
                        placeholder={`Search ${SEARCH_PROVIDER_LABELS[searchProvider]}...`}
                        value={searchQuery}
                        onChange={handleSearchInput}
                        autoComplete="off"
                        autoFocus
                      />
                      {isSearching && <span className="loader-glow" style={{ fontSize: '0.85rem' }}>Searching...</span>}
                      <select
                        className="search-provider-select"
                        value={searchProvider}
                        onChange={handleSearchProviderChange}
                        aria-label="Search provider"
                      >
                        <option value="hybrid">Hybrid</option>
                        <option value="youtube_music">YouTube Music</option>
                        <option value="youtube_videos">YouTube Videos</option>
                        <option value="soundcloud">SoundCloud</option>
                      </select>
                    </div>
                  </div>

                  {searchResults.length > 0 ? (
                    <section className="section animate-in">
                      <div className="section__header">
                        <h2 className="section__title">
                          Search Results{searchResultsSource === 'cache' ? ' (saved locally)' : ''}
                        </h2>
                      </div>
                      <div className="library-list">
                        {searchResults.map((song) => {
                          const isLiked = likedTracks.has(song.id);
                          const isPlayingCurrent = playerTrack.id === song.id;
                          return (
                            <div key={song.id} className="library-item animate-in">
                              <img className="library-item__art" src={song.artworkUrl || '/icon.svg'} alt={song.title} onClick={() => startTrackOnActiveReceiver(song, searchResults)} />
                              <div className="library-item__info" onClick={() => startTrackOnActiveReceiver(song, searchResults)}>
                                <span className="library-item__title" style={isPlayingCurrent ? { color: 'var(--accent-pink)' } : {}}>
                                  {song.title}
                                </span>
                                <span className="library-item__subtitle">
                                  {song.artists.map(a => a.name).join(', ')} {song.durationMs ? `· ${formatTime(song.durationMs / 1000)}` : ''}
                                  <span className="track-source-badge">{trackSourceLabel(song)}</span>
                                </span>
                              </div>

                              {/* Custom Playlist Selector */}
                              {allEditablePlaylists.length > 0 && (
                                <select
                                  onChange={async (e) => {
                                    if (e.target.value) {
                                      const added = await addTrackToPlaylist(song, e.target.value);
                                      e.target.value = '';
                                      if (added) {
                                        showSpiceNotice('Added track to playlist.', 'success');
                                      } else {
                                        showSpiceNotice('Song already in playlist.', 'info');
                                      }
                                    }
                                  }}
                                  style={{ background: 'var(--card-bg)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '0.8rem', padding: '6px 10px', cursor: 'pointer', outline: 'none', marginRight: '8px' }}
                                >
                                  <option value="">+ Add Playlist</option>
                                  {allEditablePlaylists.map(pl => (
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
                    <>
                      {!searchQuery.trim() && (isLoadingRecommendations || homeRecommended.length > 0) && (
                        <section className="section animate-in">
                          <div className="section__header">
                            <div>
                              <h2 className="section__title">Recommended Searches</h2>
                              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '6px 0 0' }}>
                                {homeRecommendationSeed?.reason || 'Suggestions are scored on this device from your local profile.'}
                              </p>
                            </div>
                          </div>
                          {isLoadingRecommendations && homeRecommended.length === 0 ? (
                            <div className="library-list">
                              {[...Array(3)].map((_, i) => (
                                <div key={i} className="library-item animate-in">
                                  <div className="library-item__art" style={{ background: 'var(--card-bg)' }} />
                                  <div className="library-item__info">
                                    <span className="library-item__title">Finding private picks...</span>
                                    <span className="library-item__subtitle">Local taste profile, no raw history upload</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="library-list">
                              {homeRecommended.slice(0, 8).map((song) => {
                                const isLiked = likedTracks.has(song.id);
                                const isPlayingCurrent = playerTrack.id === song.id;
                                return (
                                  <div key={`${song.sourceId || 'youtube_music'}:${song.id}`} className="library-item animate-in">
                                    <img className="library-item__art" src={song.artworkUrl || '/icon.svg'} alt={song.title} onClick={() => startTrackOnActiveReceiver(song, homeRecommended)} />
                                    <div className="library-item__info" onClick={() => startTrackOnActiveReceiver(song, homeRecommended)}>
                                      <span className="library-item__title" style={isPlayingCurrent ? { color: 'var(--accent-pink)' } : {}}>
                                        {song.title}
                                      </span>
                                      <span className="library-item__subtitle">
                                        {song.artists.map(a => a.name).join(', ')} {song.durationMs ? `| ${formatTime(song.durationMs / 1000)}` : ''}
                                        <span className="track-source-badge">{trackSourceLabel(song)}</span>
                                      </span>
                                    </div>
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
                      )}

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
                              <span className="genre-card__icon">{g.icon}</span>
                            </div>
                          ))}
                        </div>
                      </section>
                    </>
                  )}
                </>
              )}

              {/* ── Library Page ── */}
              {currentPage === 'library' && (
                <>
                  <div className="library-header animate-in">
                    <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '2rem', fontWeight: 800 }}>Your Library</h1>
                    <div className="library-header__actions">
                      <button
                        className="btn btn--secondary"
                        style={{ padding: '8px 16px', fontSize: '0.8rem', marginRight: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-color)', color: '#fff', cursor: 'pointer', borderRadius: '6px' }}
                        onClick={() => {
                          if (!cloudToken) {
                            setCurrentPage('account');
                            setShareStatus('Sign in to your SPICE account to create shared playlists.');
                          } else {
                            setShowCreateSharedDialog(true);
                          }
                        }}
                      >
                        + Create Shared Playlist
                      </button>
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
                    {cloudToken && (
                      <button className={`chip ${libraryFilter === 'shared' ? 'active' : ''}`} onClick={() => setLibraryFilter('shared')}>
                        Shared
                      </button>
                    )}
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
                      {editablePlaylists.length === 0 ? (
                        <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '64px 0', color: 'var(--text-secondary)' }}>
                          <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center', transform: 'scale(1.8)' }}>{Icons.folder}</div>
                          <p style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '8px', color: 'var(--text-primary)' }}>Create your first custom playlist</p>
                          <p style={{ marginBottom: '16px' }}>Build custom compilations from YouTube Music streams</p>
                          <button className="btn btn--primary" onClick={() => setShowCreateDialog(true)}>Create Playlist</button>
                        </div>
                      ) : (
                        editablePlaylists.map((pl) => (
                          <div key={pl.id} className="playlist-card animate-in" onClick={() => setSelectedPlaylist(pl)}>
                            {pl.coverUrl ? (
                              <img src={pl.coverUrl} alt={pl.title} className="playlist-card__img" />
                            ) : pl.tracks.length > 0 ? (
                              <img src={pl.tracks[0].artworkUrl} alt={pl.title} className="playlist-card__img" />
                            ) : (
                              <div className="playlist-card__bg" style={{ background: pl.gradient }}></div>
                            )}
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

                  {/* Shared Playlists view */}
                  {libraryFilter === 'shared' && (
                    <div className="playlist-grid animate-in">
                      {sharedPlaylists.length === 0 ? (
                        <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '64px 0', color: 'var(--text-secondary)' }}>
                          <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center', transform: 'scale(1.8)' }}>{Icons.folder}</div>
                          <p style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '8px', color: 'var(--text-primary)' }}>No shared playlists yet</p>
                          <p style={{ marginBottom: '16px' }}>Collaborate with other SPICE users on shared compilations</p>
                          <button className="btn btn--primary" onClick={() => setShowCreateSharedDialog(true)}>+ Create Shared Playlist</button>
                        </div>
                      ) : (
                        sharedPlaylists.map((pl) => (
                          <div key={pl.id} className="playlist-card animate-in" style={{ position: 'relative' }} onClick={() => setSelectedPlaylist(pl)}>
                            {pl.coverUrl ? (
                              <img src={pl.coverUrl} alt={pl.title} className="playlist-card__img" />
                            ) : pl.tracks.length > 0 ? (
                              <img src={pl.tracks[0].artworkUrl} alt={pl.title} className="playlist-card__img" />
                            ) : (
                              <div className="playlist-card__bg" style={{ background: pl.gradient }}></div>
                            )}
                            <div className="playlist-card__overlay"></div>
                            {/* Shared badge chip */}
                            <span className="playlist-card__shared-badge">
                              {pl.shareRole === 'owner' ? '✦ Yours' : '✦ Shared'}
                            </span>
                            <div className="playlist-card__info">
                              <h3 className="playlist-card__title truncate">{pl.title}</h3>
                              <p className="playlist-card__desc">
                                {pl.tracks.length} {pl.tracks.length === 1 ? 'song' : 'songs'}
                                {pl.ownerDisplayName && pl.shareRole !== 'owner' ? ` · by ${pl.ownerDisplayName}` : ''}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* Liked songs view */}
                  {libraryFilter === 'liked' && (
                    <div className="library-list animate-in">
                      {likedTracksList.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--text-secondary)' }}>
                          <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center', transform: 'scale(1.8)', color: 'var(--accent-pink)' }}>{Icons.heartFilled}</div>
                          <p style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '8px', color: 'var(--text-primary)' }}>Songs you like will appear here</p>
                          <p>Tap the heart icon next to any search results to save tracks</p>
                        </div>
                      ) : (
                        likedTracksList.map((song) => {
                          const isPlayingCurrent = playerTrack.id === song.id;
                          return (
                            <div
                              key={song.id}
                              className="library-item animate-in"
                              onClick={getLikedTrackClickHandler(song)}
                            >
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
                          <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center', transform: 'scale(1.8)' }}>{Icons.clock}</div>
                          <p style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '8px', color: 'var(--text-primary)' }}>No playback history yet</p>
                          <p>Tracks you listen to will be preserved locally in chronological order</p>
                        </div>
                      ) : (
                        history.map((song) => {
                          const isPlayingCurrent = playerTrack.id === song.id;
                          return (
                            <div key={song.id} className="library-item animate-in" onClick={() => startTrackOnActiveReceiver(song, history)}>
                              <img className="library-item__art" src={song.artworkUrl || '/icon.svg'} alt={song.title} />
                              <div className="library-item__info">
                                <span className="library-item__title" style={isPlayingCurrent ? { color: 'var(--accent-pink)' } : {}}>
                                  {song.title}
                                </span>
                                <span className="library-item__subtitle">
                                  {song.artists.map(a => a.name).join(', ')}
                                </span>
                              </div>
                              {allEditablePlaylists.length > 0 && (
                                <select
                                  onChange={async (e) => {
                                    if (e.target.value) {
                                      const added = await addTrackToPlaylist(song, e.target.value);
                                      e.target.value = '';
                                      if (added) {
                                        showSpiceNotice('Added track to playlist.', 'success');
                                      } else {
                                        showSpiceNotice('Song already in playlist.', 'info');
                                      }
                                    }
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  style={{ background: 'var(--card-bg)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '0.8rem', padding: '6px 10px', cursor: 'pointer', outline: 'none', marginRight: '8px' }}
                                >
                                  <option value="">+ Add Playlist</option>
                                  {allEditablePlaylists.map(pl => (
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
                      style={{ width: '120px', height: '120px', borderRadius: '50%', background: activeProfile.avatarUrl ? 'none' : activeProfile.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3.5rem', fontWeight: 900, color: '#fff', textShadow: activeProfile.avatarUrl ? 'none' : '0 4px 12px rgba(0,0,0,0.3)', flexShrink: 0, overflow: 'hidden', border: '4px solid rgba(255, 255, 255, 0.12)', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}
                    >
                      {activeProfile.avatarUrl ? (
                        <img src={activeProfile.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        activeProfile.displayName.charAt(0).toUpperCase()
                      )}
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
                          <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: p.avatarUrl ? 'none' : p.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 800, color: '#fff', overflow: 'hidden', flexShrink: 0, border: isActive ? '2px solid var(--accent-pink)' : '2px solid rgba(255, 255, 255, 0.08)', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
                            {p.avatarUrl ? (
                              <img src={p.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              p.displayName.charAt(0).toUpperCase()
                            )}
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
                              {Icons.close}
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
                    {Icons.globe} Cloud Sync & Server Accounts
                    {cloudUser && <span style={{ fontSize: '0.75rem', background: 'rgba(52, 211, 153, 0.1)', color: '#34d399', padding: '2px 8px', borderRadius: '12px', border: '1px solid rgba(52, 211, 153, 0.2)' }}>Connected</span>}
                  </h3>

                  <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '24px', marginBottom: '32px' }}>
                    {cloudUser ? (
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                          <div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Logged in as</div>
                            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>{cloudUser.email}</div>
                            <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '0.72rem', background: cloudUser.isAdmin ? 'rgba(250, 204, 21, 0.12)' : 'rgba(255,255,255,0.06)', color: cloudUser.isAdmin ? '#facc15' : 'var(--text-secondary)', padding: '3px 8px', borderRadius: '999px', border: cloudUser.isAdmin ? '1px solid rgba(250, 204, 21, 0.25)' : '1px solid rgba(255,255,255,0.08)', textTransform: 'capitalize' }}>
                                {cloudUser.accountRole || 'user'} account
                              </span>
                              <span style={{ fontSize: '0.72rem', background: cloudUser.subscription?.isActive ? 'rgba(52, 211, 153, 0.1)' : 'rgba(255,255,255,0.06)', color: cloudUser.subscription?.isActive ? '#34d399' : 'var(--text-secondary)', padding: '3px 8px', borderRadius: '999px', border: cloudUser.subscription?.isActive ? '1px solid rgba(52, 211, 153, 0.2)' : '1px solid rgba(255,255,255,0.08)', textTransform: 'capitalize' }}>
                                {cloudUser.subscription?.tier || 'free'} subscription
                              </span>
                            </div>
                          </div>
                          <button className="btn btn--ghost" onClick={handleLogout} style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                            Sign Out
                          </button>
                        </div>

                        {isLocalDbFallback && (
                          <div style={{ background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.2)', padding: '12px', borderRadius: '8px', color: '#60a5fa', fontSize: '0.85rem', marginBottom: '16px', lineHeight: 1.4 }}>
                            <span style={{ display: 'inline-flex', verticalAlign: 'middle', marginRight: '6px' }}>{Icons.database}</span><strong>Local File Account:</strong> Signed in using backend local fallback storage (`local_db.json`). Syncing works locally! Setup a DATABASE_URL to connect to the cloud.
                          </div>
                        )}

                        {dbError && (
                          <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '12px', borderRadius: '8px', color: '#f87171', fontSize: '0.85rem', marginBottom: '16px' }}>
                            <span style={{ display: 'inline-flex', verticalAlign: 'middle', marginRight: '6px' }}>{Icons.alertTriangle}</span>{dbError} Please make sure DATABASE_URL is configured in your `.env` file and run `pnpm db:push` to enable full cloud backup!
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
                              {Icons.checkCircle} Synchronized successfully with the database!
                            </span>
                          )}
                          {syncingStatus === 'error' && !dbError && (
                            <span style={{ color: '#f87171', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                              {Icons.alertTriangle} Sync failed. Please check server logs.
                            </span>
                          )}
                        </div>

                        {/* Collaborative Username Section */}
                        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px', marginTop: '20px' }}>
                          <h4 style={{ fontSize: '0.95rem', fontWeight: 600, margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {Icons.account} Collaborative Username
                          </h4>
                          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 12px 0', lineHeight: 1.4 }}>
                            Claim a unique username to allow other SPICE users to invite you to collaborative playlists. Only lowercase letters, numbers, and underscores are allowed (3-20 chars).
                          </p>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <input
                              type="text"
                              placeholder="e.g. sound_lover"
                              value={usernameInput}
                              onChange={(e) => setUsernameInput(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                              disabled={usernameSaving}
                              style={{
                                flex: 1,
                                background: 'rgba(0,0,0,0.2)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '8px',
                                padding: '8px 12px',
                                color: '#fff',
                                fontSize: '0.9rem',
                              }}
                            />
                            <button
                              className="btn btn--primary"
                              onClick={saveUsername}
                              disabled={usernameSaving || !usernameInput.trim() || usernameInput === cloudUsername}
                              style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                            >
                              {usernameSaving ? 'Saving...' : 'Save Username'}
                            </button>
                          </div>
                          {usernameError && (
                            <div style={{ color: '#f87171', fontSize: '0.8rem', marginTop: '8px' }}>
                              {usernameError}
                            </div>
                          )}
                          {usernameSuccess && (
                            <div style={{ color: '#34d399', fontSize: '0.8rem', marginTop: '8px' }}>
                              Username successfully updated!
                            </div>
                          )}
                          {cloudUsername && (
                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '8px' }}>
                              Your active username: <strong style={{ color: 'var(--accent-pink)' }}>@{cloudUsername}</strong>
                            </div>
                          )}
                        </div>

                        {/* Pending Invites Section */}
                        {cloudUsername && pendingInvites.length > 0 && (
                          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px', marginTop: '20px' }}>
                            <h4 style={{ fontSize: '0.95rem', fontWeight: 600, margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {Icons.plus} Pending Playlist Invites ({pendingInvites.length})
                            </h4>
                            {pendingInvitesLoading ? (
                              <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Loading invites...</div>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {pendingInvites.map((invite) => (
                                  <div key={invite.playlistId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                    <div>
                                      <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '4px' }}>{invite.playlistTitle}</div>
                                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Invited by <strong style={{ color: '#fff' }}>{invite.ownerDisplayName}</strong> (@{invite.ownerUsername})</div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                      <button
                                        className="btn btn--primary"
                                        style={{ padding: '6px 12px', fontSize: '0.8rem', minHeight: 'auto', background: 'var(--accent-pink)' }}
                                        onClick={() => handleAcceptInvite(invite.playlistId)}
                                        disabled={acceptingInvite}
                                      >
                                        Accept
                                      </button>
                                      <button
                                        className="btn btn--secondary"
                                        style={{ padding: '6px 12px', fontSize: '0.8rem', minHeight: 'auto' }}
                                        onClick={() => handleRejectInvite(invite.playlistId)}
                                        disabled={acceptingInvite}
                                      >
                                        Deny
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0 0 20px 0', lineHeight: 1.5 }}>
                          Connect your Spice account to synchronize your custom playlists, liked tracks, and listening history with a secure backend database.
                        </p>

                        {!dbError && (
                          <div style={{ background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.2)', padding: '12px', borderRadius: '8px', color: '#60a5fa', fontSize: '0.85rem', marginBottom: '16px', lineHeight: 1.4 }}>
                            <span style={{ display: 'inline-flex', verticalAlign: 'middle', marginRight: '6px' }}>{Icons.database}</span><strong>Local Database Active:</strong> Signup and sign-in are enabled via local file storage (`local_db.json`). No external PostgreSQL setup required to start using accounts!
                          </div>
                        )}

                        {dbError && (
                          <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)', padding: '12px', borderRadius: '8px', color: '#fbbf24', fontSize: '0.85rem', marginBottom: '16px', lineHeight: 1.4 }}>
                            <strong>Database Configuration Pending:</strong><br />
                            Define `DATABASE_URL` in `apps/backend/.env` and run migrations to unlock cloud accounts on your machine!
                          </div>
                        )}

                        {authError && (
                          <div style={{ color: '#f87171', fontSize: '0.8rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>{Icons.alertTriangle} {authError}</div>
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
                        <div style={{ color: '#f87171', fontSize: '0.75rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>{Icons.alertTriangle} {playlistImportError}</div>
                      )}
                      {playlistImportSuccess && (
                        <div style={{ color: '#34d399', fontSize: '0.75rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>{Icons.checkCircle} {playlistImportSuccess}</div>
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
                          {Icons.download} Download Backup File (.json)
                        </button>
                        <button className="btn btn--ghost" onClick={copyBackupToClipboard} style={{ width: '100%', padding: '8px 16px', fontSize: '0.85rem' }}>
                          {Icons.clipboard} Copy Backup to Clipboard
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

                      <div style={{ marginBottom: '24px' }}>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Profile Picture (PFP)</label>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '12px' }}>
                          <input
                            type="text"
                            value={editAvatarUrl}
                            onChange={(e) => setEditAvatarUrl(e.target.value)}
                            placeholder="Paste custom image URL or select below..."
                            style={{ flex: 1, padding: '10px 14px', background: '#0a0a0a', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#fff', outline: 'none' }}
                          />
                          <label
                            style={{
                              padding: '10px 14px',
                              background: 'rgba(236, 72, 153, 0.15)',
                              border: '1px solid rgba(236, 72, 153, 0.3)',
                              borderRadius: '8px',
                              color: 'var(--accent-pink)',
                              cursor: 'pointer',
                              fontSize: '0.8rem',
                              fontWeight: 600,
                              whiteSpace: 'nowrap',
                              transition: 'all 0.15s ease'
                            }}
                            title="Upload image from device"
                          >
                            {Icons.camera} Upload
                            <input
                              type="file"
                              accept="image/*"
                              style={{ display: 'none' }}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  if (file.size > 2 * 1024 * 1024) {
                                    showSpiceNotice('Image must be under 2MB.', 'warning');
                                    return;
                                  }
                                  const reader = new FileReader();
                                  reader.onload = () => {
                                    if (typeof reader.result === 'string') {
                                      setEditAvatarUrl(reader.result);
                                      logDebug('system', `PFP uploaded from device: ${file.name} (${(file.size / 1024).toFixed(1)}KB)`);
                                    }
                                  };
                                  reader.readAsDataURL(file);
                                }
                                e.target.value = '';
                              }}
                            />
                          </label>
                          {editAvatarUrl && (
                            <button
                              type="button"
                              onClick={() => setEditAvatarUrl('')}
                              style={{
                                padding: '10px 14px',
                                background: 'rgba(239, 68, 68, 0.15)',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                borderRadius: '8px',
                                color: '#ef4444',
                                cursor: 'pointer',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                whiteSpace: 'nowrap',
                                transition: 'all 0.15s ease'
                              }}
                              title="Remove avatar"
                            >
                              {Icons.close} Remove
                            </button>
                          )}
                        </div>
                        {editAvatarUrl && (
                          <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '48px', height: '48px', borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--accent-pink)', flexShrink: 0 }}>
                              <img src={editAvatarUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Preview</span>
                          </div>
                        )}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px' }}>
                          {PRESET_AVATARS.map((avatar, idx) => {
                            const isSelected = editAvatarUrl === avatar.url;
                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => setEditAvatarUrl(isSelected ? '' : avatar.url)}
                                style={{
                                  position: 'relative',
                                  width: '100%',
                                  aspectRatio: '1',
                                  borderRadius: '10px',
                                  overflow: 'hidden',
                                  border: isSelected ? '2px solid var(--accent-pink)' : '1px solid rgba(255,255,255,0.1)',
                                  padding: 0,
                                  cursor: 'pointer',
                                  boxShadow: isSelected ? '0 0 12px var(--accent-pink)' : 'none',
                                  transition: 'all 0.2s ease',
                                  transform: isSelected ? 'scale(1.05)' : 'scale(1)'
                                }}
                                title={avatar.name}
                              >
                                <img src={avatar.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              </button>
                            );
                          })}
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
                        setEditAvatarUrl(activeProfile.avatarUrl || '');
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
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', fontWeight: 700, color: '#fff', fontFamily: 'Outfit, sans-serif', display: 'flex', alignItems: 'center', gap: '8px' }}>{Icons.palette} Global Accent Colors</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0 0 20px 0', lineHeight: 1.4 }}>
                      Select a dynamic accent theme color to instantly paint application highlights, glow animations, button hovers, and dividers.
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
                      {[
                        { id: 'pink', name: 'Neon Spice (Pink)', color: '#ec4899', gradient: 'linear-gradient(135deg, #a855f7, #ec4899)' },
                        { id: 'blue', name: 'Ocean Breeze (Blue)', color: '#3b82f6', gradient: 'linear-gradient(135deg, #06b6d4, #3b82f6)' },
                        { id: 'orange', name: 'Solar Fire (Orange)', color: '#f97316', gradient: 'linear-gradient(135deg, #f97316, #ef4444)' },
                        { id: 'green', name: 'Jade Emerald (Green)', color: '#10b981', gradient: 'linear-gradient(135deg, #10b981, #059669)' },
                        { id: 'gold', name: 'Imperial Gold (Gold)', color: '#f59e0b', gradient: 'linear-gradient(135deg, #f59e0b, #d97706)' },
                        { id: 'crimson', name: 'Crimson Moon (Red)', color: '#ff003c', gradient: 'linear-gradient(135deg, #ff003c, #990011)' },
                        { id: 'deeppurple', name: 'Midnight Velvet (Dark Purple)', color: '#7c3aed', gradient: 'linear-gradient(135deg, #4c1d95, #120024)' }
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

                  {/* Visual Customization */}
                  <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', fontWeight: 700, color: '#fff', fontFamily: 'Outfit, sans-serif', display: 'flex', alignItems: 'center', gap: '8px' }}>{Icons.palette} Visual Customization</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0 0 20px 0', lineHeight: 1.4 }}>
                      Tune the app surface, cover shape, motion level, and layout density. These preferences save locally and apply instantly.
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.25fr) minmax(220px, 0.75fr)', gap: '20px', alignItems: 'stretch' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '16px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Surface Style</label>
                          <select
                            value={visualSurface}
                            onChange={(e) => {
                              if (!isVisualSurface(e.target.value)) return;
                              setVisualSurface(e.target.value);
                              localStorage.setItem('spice_visual_surface', e.target.value);
                            }}
                            style={{ width: '100%', padding: '10px 14px', background: '#0a0a0a', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#fff', outline: 'none', cursor: 'pointer' }}
                          >
                            {(Object.entries(VISUAL_SURFACE_LABELS) as [VisualSurface, string][]).map(([id, label]) => (
                              <option key={id} value={id}>{label}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Artwork Shape</label>
                          <select
                            value={artworkShape}
                            onChange={(e) => {
                              if (!isArtworkShape(e.target.value)) return;
                              setArtworkShape(e.target.value);
                              localStorage.setItem('spice_artwork_shape', e.target.value);
                            }}
                            style={{ width: '100%', padding: '10px 14px', background: '#0a0a0a', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#fff', outline: 'none', cursor: 'pointer' }}
                          >
                            {(Object.entries(ARTWORK_SHAPE_LABELS) as [ArtworkShape, string][]).map(([id, label]) => (
                              <option key={id} value={id}>{label}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Motion Level</label>
                          <select
                            value={motionLevel}
                            onChange={(e) => {
                              if (!isMotionLevel(e.target.value)) return;
                              setMotionLevel(e.target.value);
                              localStorage.setItem('spice_motion_level', e.target.value);
                            }}
                            style={{ width: '100%', padding: '10px 14px', background: '#0a0a0a', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#fff', outline: 'none', cursor: 'pointer' }}
                          >
                            {(Object.entries(MOTION_LEVEL_LABELS) as [MotionLevel, string][]).map(([id, label]) => (
                              <option key={id} value={id}>{label}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Interface Density</label>
                          <select
                            value={interfaceScale}
                            onChange={(e) => {
                              if (!isInterfaceScale(e.target.value)) return;
                              setInterfaceScale(e.target.value);
                              localStorage.setItem('spice_interface_scale', e.target.value);
                            }}
                            style={{ width: '100%', padding: '10px 14px', background: '#0a0a0a', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#fff', outline: 'none', cursor: 'pointer' }}
                          >
                            {(Object.entries(INTERFACE_SCALE_LABELS) as [InterfaceScale, string][]).map(([id, label]) => (
                              <option key={id} value={id}>{label}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div style={{ border: '1px solid var(--border-color)', borderRadius: '14px', padding: '16px', background: 'linear-gradient(135deg, rgba(var(--accent-pink-rgb), 0.12), rgba(255,255,255,0.03))', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '178px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                          <div style={{ width: '52px', height: '52px', borderRadius: 'var(--spice-art-radius)', background: 'var(--accent-gradient)', boxShadow: '0 10px 28px rgba(var(--accent-pink-rgb), 0.28)' }} />
                          <div style={{ minWidth: 0 }}>
                            <div style={{ color: '#fff', fontWeight: 800, fontSize: '0.95rem' }}>Live Preview</div>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>{VISUAL_SURFACE_LABELS[visualSurface]} / {INTERFACE_SCALE_LABELS[interfaceScale]}</div>
                          </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                          {[0.35, 0.6, 0.9].map((opacity, i) => (
                            <div key={i} style={{ height: i === 1 ? '34px' : '24px', borderRadius: '8px', background: `rgba(var(--accent-pink-rgb), ${opacity})`, alignSelf: 'end' }} />
                          ))}
                        </div>
                        <div style={{ marginTop: '14px', fontSize: '0.74rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                          Motion: {MOTION_LEVEL_LABELS[motionLevel]} · Covers: {ARTWORK_SHAPE_LABELS[artworkShape]}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Sidebar Controls */}
                  <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', fontWeight: 700, color: '#fff', fontFamily: 'Outfit, sans-serif', display: 'flex', alignItems: 'center', gap: '8px' }}>{Icons.library} Sidebar Controls</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0 0 20px 0', lineHeight: 1.4 }}>
                      Collapse the SPICE Music sidebar or trim optional sidebar tabs. Topbar search and the profile button stay available.
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '14px' }}>
                      <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '14px', background: '#070707', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={!sidebarHidden}
                          onChange={(e) => updateSidebarHiddenPreference(!e.target.checked)}
                          style={{ accentColor: 'var(--accent-pink)', marginTop: '3px' }}
                        />
                        <span>
                          <span style={{ display: 'block', color: '#fff', fontWeight: 800, fontSize: '0.9rem' }}>Show sidebar</span>
                          <span style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.74rem', lineHeight: 1.4, marginTop: '4px' }}>
                            Hide it for a wider player and content area. Use the floating Sidebar button to bring it back.
                          </span>
                        </span>
                      </label>

                      <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '14px', background: '#070707', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={sidebarSearchEnabled}
                          onChange={(e) => updateSidebarSearchPreference(e.target.checked)}
                          style={{ accentColor: 'var(--accent-pink)', marginTop: '3px' }}
                        />
                        <span>
                          <span style={{ display: 'block', color: '#fff', fontWeight: 800, fontSize: '0.9rem' }}>Search tab</span>
                          <span style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.74rem', lineHeight: 1.4, marginTop: '4px' }}>
                            Show Search in the sidebar. Global topbar search remains enabled.
                          </span>
                        </span>
                      </label>

                      <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '14px', background: '#070707', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={sidebarProfileEnabled}
                          onChange={(e) => updateSidebarProfilePreference(e.target.checked)}
                          style={{ accentColor: 'var(--accent-pink)', marginTop: '3px' }}
                        />
                        <span>
                          <span style={{ display: 'block', color: '#fff', fontWeight: 800, fontSize: '0.9rem' }}>Profile tab</span>
                          <span style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.74rem', lineHeight: 1.4, marginTop: '4px' }}>
                            Show Profile in the sidebar. The topbar avatar still opens your account page.
                          </span>
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Audio Settings */}
                  <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', fontWeight: 700, color: '#fff', fontFamily: 'Outfit, sans-serif', display: 'flex', alignItems: 'center', gap: '8px' }}>{Icons.headphones} Audio & Streaming Preferences</h3>
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
                          <option value="high">High Definition (Best Available AAC)</option>
                          <option value="standard">Standard Balanced (Browser Compatible)</option>
                          <option value="low">Data Saver (Lowest Available Stream)</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Stream Endpoint Transport</label>
                        <select
                          value={streamProtocol}
                          onChange={(e) => {
                            const nextProtocol = isStreamProtocol(e.target.value) ? e.target.value : 'proxy';
                            setStreamProtocol(nextProtocol);
                            streamProtocolRef.current = nextProtocol;
                            localStorage.setItem('spice_stream_protocol', nextProtocol);
                            if (nextProtocol === 'embed') {
                              localStorage.setItem('spice_stream_embed_migration_v1034', 'true');
                            }
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

                  {/* Listening Profile Sync */}
                  <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', marginBottom: '18px' }}>
                      <div>
                        <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', fontWeight: 700, color: '#fff', fontFamily: 'Outfit, sans-serif', display: 'flex', alignItems: 'center', gap: '8px' }}>{Icons.database} Listening Profile Sync</h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0, lineHeight: 1.4 }}>
                          Update your Last.fm and ListenBrainz profiles from playback. Search stays focused on playable providers.
                        </p>
                      </div>
                      <span style={{
                        fontSize: '0.72rem',
                        color: profileSyncStatus === 'error' ? '#f87171' : 'var(--text-secondary)',
                        border: profileSyncStatus === 'error' ? '1px solid rgba(248, 113, 113, 0.35)' : '1px solid var(--border-color)',
                        borderRadius: '999px',
                        padding: '5px 10px',
                        whiteSpace: 'nowrap',
                      }}>
                        {PROFILE_SYNC_STATUS_LABELS[profileSyncStatus]}
                      </span>
                    </div>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px', color: '#fff', fontSize: '0.9rem', fontWeight: 700 }}>
                      <input
                        type="checkbox"
                        checked={profileSyncEnabled}
                        onChange={(e) => {
                          setProfileSyncEnabled(e.target.checked);
                          localStorage.setItem('spice_profile_sync_enabled', String(e.target.checked));
                        }}
                        style={{ accentColor: 'var(--accent-pink)' }}
                      />
                      Enable now-playing and scrobble updates
                    </label>

                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.35fr) minmax(240px, 0.65fr)', gap: '18px', alignItems: 'start' }}>
                      <div style={{ border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px', background: '#070707' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '14px' }}>
                          <div>
                            <div style={{ color: '#fff', fontWeight: 800, fontSize: '0.92rem' }}>Last.fm Account</div>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.74rem', lineHeight: 1.4, margin: '4px 0 0 0' }}>
                              Uses backend Last.fm API credentials. Signed-in SPICE accounts store the approved session in the backend.
                              Callback route: /api/lastfm/callback.
                            </p>
                          </div>
                          {lastFmLinkedUser && (
                            <span style={{ color: '#34d399', border: '1px solid rgba(52, 211, 153, 0.35)', borderRadius: '999px', padding: '4px 9px', fontSize: '0.72rem', whiteSpace: 'nowrap' }}>
                              Linked: {lastFmLinkedUser}
                            </span>
                          )}
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
                          <div style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '12px', background: '#0a0a0a' }}>
                            <div style={{ color: '#fff', fontWeight: 800, fontSize: '0.86rem', marginBottom: '4px' }}>
                              {(lastFmSessionKey || lastFmAccountLinked) ? (lastFmLinkedUser || 'Last.fm connected') : 'No Last.fm account linked'}
                            </div>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.73rem', lineHeight: 1.4, margin: 0 }}>
                              {lastFmAccountLinked
                                ? 'Saved to your SPICE account, so it can be restored after clearing browser storage.'
                                : lastFmSessionKey
                                  ? 'Saved locally. Sign in to SPICE before setup to keep it backed up on the account.'
                                  : 'Click setup, sign in through Last.fm, and the callback will finish the link automatically.'}
                            </p>
                          </div>

                          <button
                            type="button"
                            className="btn btn--primary"
                            onClick={handleLinkLastFm}
                            disabled={isLinkingLastFm}
                            style={{ padding: '10px 16px', fontSize: '0.84rem', whiteSpace: 'nowrap' }}
                          >
                            {isLinkingLastFm ? 'Opening...' : 'Set up Last.fm'}
                          </button>
                        </div>

                        <p style={{ color: lastFmLinkStatus?.includes('failed') || lastFmLinkStatus?.includes('required') || lastFmLinkStatus?.includes('blocked') ? '#f87171' : 'var(--text-secondary)', fontSize: '0.74rem', lineHeight: 1.4, margin: 0 }}>
                          {lastFmLinkStatus || 'Click Set up Last.fm, approve the popup, and SPICE will finish the account link.'}
                        </p>
                      </div>

                      <div style={{ border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px', background: '#070707' }}>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>ListenBrainz User Token</label>
                        <input
                          type="password"
                          value={listenBrainzToken}
                          onChange={(e) => {
                            setListenBrainzToken(e.target.value);
                            localStorage.setItem('spice_listenbrainz_token', e.target.value);
                          }}
                          placeholder="Paste user token"
                          autoComplete="off"
                          style={{ width: '100%', padding: '10px 14px', background: '#0a0a0a', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#fff', outline: 'none' }}
                        />
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.74rem', lineHeight: 1.4, margin: '8px 0 0 0' }}>
                          Sends temporary playing-now updates and permanent listens after the scrobble threshold.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Player View & Position Settings */}
                  <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', fontWeight: 700, color: '#fff', fontFamily: 'Outfit, sans-serif', display: 'flex', alignItems: 'center', gap: '8px' }}>{Icons.monitor} Player Layout & Viewing Options</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0 0 20px 0', lineHeight: 1.4 }}>
                      Customize the now-playing bar placement, open the immersive full-screen player, or collapse it into a floating picture-in-picture widget.
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
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

                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Player Bar Density</label>
                        <select
                          value={playerBarDensity}
                          onChange={(e) => {
                            if (!isPlayerBarDensity(e.target.value)) return;
                            setPlayerBarDensity(e.target.value);
                            localStorage.setItem('spice_player_bar_density', e.target.value);
                          }}
                          style={{ width: '100%', padding: '10px 14px', background: '#0a0a0a', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#fff', outline: 'none', cursor: 'pointer' }}
                        >
                          {(Object.entries(PLAYER_BAR_DENSITY_LABELS) as [PlayerBarDensity, string][]).map(([id, label]) => (
                            <option key={id} value={id}>{label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Spice Connect Settings */}
                  <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', fontWeight: 700, color: '#fff', fontFamily: 'Outfit, sans-serif', display: 'flex', alignItems: 'center', gap: '8px' }}>{Icons.monitor} Spice Connect Setup</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0 0 20px 0', lineHeight: 1.4 }}>
                      Name this device and keep cross-device control enabled here. Use the receiver selector in the player to decide whether the normal controls target this device or another signed-in device.
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 0.85fr) minmax(0, 1.15fr)', gap: '20px', alignItems: 'start' }}>
                      <div style={{ border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px', background: '#070707' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#fff', fontSize: '0.85rem', fontWeight: 700, marginBottom: '14px' }}>
                          <input
                            type="checkbox"
                            checked={remoteControlEnabled}
                            onChange={(e) => {
                              setRemoteControlEnabled(e.target.checked);
                              localStorage.setItem('spice_remote_control_enabled', String(e.target.checked));
                              setRemoteStatus(e.target.checked ? 'Spice Connect enabled on this device.' : 'Spice Connect disabled on this device.');
                            }}
                            style={{ accentColor: 'var(--accent-pink)' }}
                          />
                          Enable Spice Connect on this device
                        </label>

                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>This Spice Connect Device</label>
                        <input
                          type="text"
                          value={remoteDeviceName}
                          onChange={(e) => {
                            setRemoteDeviceName(e.target.value);
                            localStorage.setItem('spice_remote_device_name', e.target.value);
                          }}
                          placeholder="Living room speaker"
                          style={{ width: '100%', padding: '10px 14px', background: '#0a0a0a', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#fff', outline: 'none', marginBottom: '12px' }}
                        />

                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.74rem', lineHeight: 1.4, margin: 0 }}>
                          Connect ID: {remoteDeviceId.slice(0, 8)}. Sign in on another device with the same account, keep SPICE open, then choose it here.
                        </p>
                      </div>

                      <div style={{ border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px', background: '#070707' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                          <div>
                            <div style={{ color: '#fff', fontWeight: 800, fontSize: '0.92rem' }}>Player Receiver</div>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.74rem', lineHeight: 1.4, margin: '4px 0 0 0' }}>
                              {cloudToken ? `${remoteTargetDevices.length} other Spice Connect device(s) visible. The player uses this same receiver.` : 'Sign in to SPICE to see Spice Connect devices.'}
                            </p>
                          </div>
                          <button
                            className="btn btn--ghost"
                            onClick={() => {
                              void reportRemoteDeviceState();
                              void loadRemoteDevices(true);
                            }}
                            disabled={!cloudToken || !remoteControlEnabled}
                            style={{ padding: '8px 12px', fontSize: '0.78rem', whiteSpace: 'nowrap' }}
                          >
                            Refresh
                          </button>
                        </div>

                        <select
                          value={selectedRemoteDeviceId}
                          onChange={(e) => selectSpiceConnectReceiver(e.target.value)}
                          disabled={!cloudToken || !remoteControlEnabled}
                          style={{ width: '100%', padding: '10px 14px', background: '#0a0a0a', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#fff', outline: 'none', cursor: 'pointer', marginBottom: '14px' }}
                        >
                          <option value="">This device (current browser)</option>
                          {remoteTargetDevices.map((device) => (
                            <option key={device.deviceId} value={device.deviceId}>
                              {device.displayName} - {device.isPlaying ? 'Playing' : 'Idle'}
                            </option>
                          ))}
                        </select>

                        {selectedRemoteDevice && (
                          <div style={{ display: 'grid', gap: '14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', background: '#0a0a0a' }}>
                              <img
                                src={selectedRemoteDevice.currentTrack?.artworkUrl || '/icon.svg'}
                                alt=""
                                style={{ width: '48px', height: '48px', borderRadius: '10px', objectFit: 'cover', flexShrink: 0 }}
                              />
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <div className="truncate" style={{ color: '#fff', fontWeight: 800, fontSize: '0.86rem' }}>
                                  {selectedRemoteDevice.currentTrack?.title || 'No active track'}
                                </div>
                                <div className="truncate" style={{ color: 'var(--text-secondary)', fontSize: '0.74rem', marginTop: '2px' }}>
                                  {selectedRemoteDevice.currentTrack?.artists?.map((artist) => artist.name).join(', ') || selectedRemoteDevice.displayName}
                                </div>
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.68rem', marginTop: '4px' }}>
                                  Last seen {selectedRemoteDevice.lastSeenSeconds ?? 0}s ago
                                </div>
                              </div>
                            </div>

                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                              <button className="btn btn--ghost" onClick={() => sendRemoteCommand('previous')} style={{ padding: '8px 12px' }}>{Icons.prev} Previous</button>
                              <button className="btn btn--primary" onClick={() => sendRemoteCommand(selectedRemoteDevice.isPlaying ? 'pause' : 'play')} style={{ padding: '8px 14px' }}>
                                {selectedRemoteDevice.isPlaying ? Icons.pause : Icons.play} {selectedRemoteDevice.isPlaying ? 'Pause' : 'Play'}
                              </button>
                              <button className="btn btn--ghost" onClick={() => sendRemoteCommand('next')} style={{ padding: '8px 12px' }}>{Icons.next} Next</button>
                              <button className="btn btn--ghost" onClick={() => sendRemoteCommand('seek', { progress: Math.max(0, selectedRemoteDevice.progress - 15) })} style={{ padding: '8px 12px' }}>-15s</button>
                              <button className="btn btn--ghost" onClick={() => sendRemoteCommand('seek', { progress: Math.min(selectedRemoteDevice.duration || selectedRemoteDevice.progress + 15, selectedRemoteDevice.progress + 15) })} style={{ padding: '8px 12px' }}>+15s</button>
                            </div>

                            <label style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                              Connected Device Volume
                              <input
                                type="range"
                                min="0"
                                max="100"
                                defaultValue={selectedRemoteDevice.volume}
                                onMouseUp={(e) => sendRemoteCommand('volume', { volume: Number((e.target as HTMLInputElement).value) })}
                                onTouchEnd={(e) => sendRemoteCommand('volume', { volume: Number((e.target as HTMLInputElement).value) })}
                                style={{ flex: 1, accentColor: 'var(--accent-pink)' }}
                              />
                            </label>
                          </div>
                        )}

                        {remoteStatus && (
                          <p style={{ color: remoteStatus.includes('failed') || remoteStatus.includes('Sign in') ? '#f87171' : 'var(--text-secondary)', fontSize: '0.74rem', lineHeight: 1.4, margin: '12px 0 0 0' }}>
                            {remoteStatus}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Cache & Safety Controls */}
                  <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', fontWeight: 700, color: '#fff', fontFamily: 'Outfit, sans-serif', display: 'flex', alignItems: 'center', gap: '8px' }}>{Icons.shield} Caches & System Integrity</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0 0 20px 0', lineHeight: 1.4 }}>
                      Reset local session states, clear playback history logs, or completely purge LocalStorage profile registries with a single command.
                    </p>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                      <button
                        className="btn btn--ghost"
                        onClick={() => {
                          requestSpiceConfirm({
                            title: 'Reset Local Database?',
                            message: 'All custom settings will revert to default and the app will reload.',
                            confirmLabel: 'Reset Registry',
                            kind: 'danger',
                            onConfirm: () => {
                              localStorage.clear();
                              showSpiceNotice('Local database caches cleared. Reloading...', 'success');
                              window.setTimeout(() => window.location.reload(), 650);
                            },
                          });
                        }}
                        style={{ padding: '8px 16px', fontSize: '0.85rem', borderColor: '#f87171', color: '#f87171' }}
                      >
                        Reset Local Database Registry
                      </button>
                      <button
                        className="btn btn--ghost"
                        onClick={() => {
                          requestSpiceConfirm({
                            title: 'Purge Playback History?',
                            message: 'This clears the active profile listening history logs.',
                            confirmLabel: 'Purge Logs',
                            kind: 'warning',
                            onConfirm: () => {
                              setHistory([]);
                              updateActiveProfileData({ history: [] });
                              showSpiceNotice('Active history logs cleared.', 'success');
                            },
                          });
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
                        {Icons.tool} System Diagnostics & Live Terminal
                      </h3>
                      <span style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary)', padding: '4px 10px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                        Spice Media Core v1.0.65 (Discord RPC)
                        Spice Media Core v1.0.65
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

                      {/* YouTube Embed Player API Card */}
                      <div style={{ background: '#070707', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Embed Player API</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: selfTestRunning ? '#fb923c' : (selfTestResults.embed === 'passed' ? '#4ade80' : (selfTestResults.embed === 'failed' ? '#f87171' : '#52525b')),
                            boxShadow: selfTestRunning ? '0 0 8px #fb923c' : (selfTestResults.embed === 'passed' ? '0 0 8px #4ade80' : (selfTestResults.embed === 'failed' ? '0 0 8px #f87171' : 'none')),
                            animation: selfTestRunning ? 'blink 0.8s ease infinite alternate' : 'none'
                          }}></div>
                          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: selfTestRunning ? '#fb923c' : (selfTestResults.embed === 'passed' ? '#4ade80' : (selfTestResults.embed === 'failed' ? '#f87171' : '#a1a1aa')) }}>
                            {selfTestRunning ? 'LOADING' : (selfTestResults.embed === 'passed' ? 'READY' : (selfTestResults.embed === 'failed' ? 'BLOCKED' : 'UNTESTED'))}
                          </span>
                        </div>
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
                          {logsCopied ? 'Copied Logs' : 'Copy Logs'}
                        </button>

                        <button
                          className="btn btn--ghost"
                          onClick={() => setDebugLogs([])}
                          style={{ padding: '8px 16px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}
                        >
                          Clear
                        </button>

                        {streamProtocol === 'embed' && (
                          <button
                            className="btn btn--ghost"
                            onClick={() => {
                              setStreamProtocol('proxy');
                              streamProtocolRef.current = 'proxy';
                              localStorage.setItem('spice_stream_protocol', 'proxy');
                              logDebug('system', 'Switched stream endpoint back to direct proxy from diagnostics panel.');
                            }}
                            style={{ padding: '8px 16px', fontSize: '0.85rem', color: '#22d3ee', borderColor: 'rgba(34, 211, 238, 0.3)' }}
                          >
                            Force Proxy Mode
                          </button>
                        )}
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

      {invitePreview && (
        <div className="dialog-overlay" onClick={() => setInvitePreview(null)}>
          <div className="dialog-box dialog-box--wide" onClick={(e) => e.stopPropagation()}>
            <div className="playlist-invite-dialog__header">
              <div className="playlist-invite-dialog__icon">{Icons.playlist}</div>
              <div>
                <h2>Shared playlist invite</h2>
                <p>{invitePreview.playlist.tracks.length} tracks available from this shared playlist.</p>
              </div>
            </div>

            <div className="playlist-invite-dialog__preview">
              <div className="playlist-invite-dialog__cover" style={{ background: invitePreview.playlist.gradient }}>
                {invitePreview.playlist.tracks[0]?.artworkUrl ? (
                  <img src={invitePreview.playlist.tracks[0].artworkUrl} alt="" />
                ) : (
                  Icons.musicFolder
                )}
              </div>
              <div>
                <h3>{invitePreview.playlist.title}</h3>
                <p>{invitePreview.playlist.description || 'A shared SPICE playlist.'}</p>
                {invitePreview.expiresAt && (
                  <span>Invite expires {new Date(invitePreview.expiresAt).toLocaleDateString()}</span>
                )}
              </div>
            </div>

            {invitePreview.playlist.tracks.length > 0 && (
              <div className="playlist-invite-dialog__tracks">
                {invitePreview.playlist.tracks.slice(0, 3).map((track) => (
                  <div key={`${track.sourceId ?? 'youtube_music'}:${track.id}`}>
                    <span>{track.title}</span>
                    <small>{track.artists.map((artist) => artist.name).join(', ') || 'Unknown artist'}</small>
                  </div>
                ))}
              </div>
            )}

            {inviteStatus && (
              <p className="playlist-invite-dialog__status">{inviteStatus}</p>
            )}

            <div className="dialog-box__actions">
              <button type="button" className="btn btn--ghost" style={{ padding: '8px 16px' }} onClick={() => setInvitePreview(null)}>
                Dismiss
              </button>
              <button
                type="button"
                className="btn btn--primary"
                style={{ padding: '8px 16px' }}
                onClick={cloudToken ? acceptSharedPlaylistInvite : () => { setCurrentPage('account'); setInviteStatus('Sign in to SPICE, then accept this playlist invite.'); }}
                disabled={acceptingInvite}
              >
                {acceptingInvite ? 'Accepting' : cloudToken ? 'Accept Playlist' : 'Sign In First'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Edit Custom Playlist Dialog ═══ */}
      {showEditPlaylistDialog && selectedPlaylist && (
        <div className="dialog-overlay" onClick={() => setShowEditPlaylistDialog(false)}>
          <div className="dialog-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <h2>Edit Playlist Details</h2>
            <form onSubmit={savePlaylistEdits}>
              <label style={{ fontSize: '0.8rem', color: '#a1a1aa' }}>Playlist Name</label>
              <input
                type="text"
                value={editPlTitle}
                onChange={(e) => setEditPlTitle(e.target.value)}
                placeholder="Spicy compile title..."
                required
                autoFocus
              />

              <label style={{ fontSize: '0.8rem', color: '#a1a1aa', marginTop: '12px', display: 'block' }}>Description (optional)</label>
              <input
                type="text"
                value={editPlDesc}
                onChange={(e) => setEditPlDesc(e.target.value)}
                placeholder="Description details..."
              />

              <label style={{ fontSize: '0.8rem', color: '#a1a1aa', marginTop: '12px', display: 'block' }}>Select Accent Color Banner</label>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', marginTop: '6px' }}>
                {PRESET_GRADIENTS.map((g, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setEditPlGradient(g)}
                    style={{ width: '28px', height: '28px', borderRadius: '50%', background: g, border: editPlGradient === g ? '2px solid #fff' : '2px solid transparent', cursor: 'pointer', outline: 'none', transition: 'all 0.15s ease' }}
                  />
                ))}
              </div>

              <label style={{ fontSize: '0.8rem', color: '#a1a1aa', display: 'block', marginBottom: '6px' }}>Playlist Cover Image URL</label>
              <input
                type="text"
                value={editPlCoverUrl}
                onChange={(e) => setEditPlCoverUrl(e.target.value)}
                placeholder="Paste custom image URL..."
              />

              <div style={{ marginTop: '12px', marginBottom: '16px' }}>
                <label style={{ fontSize: '0.8rem', color: '#a1a1aa', display: 'block', marginBottom: '6px' }}>Or Upload Local Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleCoverUpload}
                  style={{ display: 'none' }}
                  id="playlist-cover-upload"
                />
                <label
                  htmlFor="playlist-cover-upload"
                  className="btn btn--ghost"
                  style={{ display: 'inline-flex', padding: '8px 16px', fontSize: '0.8rem', cursor: 'pointer', gap: '6px', alignItems: 'center' }}
                >
                  {Icons.camera} Choose Image
                </label>

                {editPlCoverUrl && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '12px', background: 'rgba(255,255,255,0.04)', padding: '8px', borderRadius: '8px' }}>
                    <img src={editPlCoverUrl} alt="Cover Preview" style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '6px' }} />
                    <span style={{ fontSize: '0.75rem', color: '#a1a1aa' }}>Cover image set</span>
                    <button
                      type="button"
                      className="btn btn--ghost"
                      style={{ marginLeft: 'auto', padding: '4px 8px', fontSize: '0.75rem', color: '#f87171' }}
                      onClick={() => setEditPlCoverUrl('')}
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>

              <div className="dialog-box__actions" style={{ justifyContent: 'space-between', marginTop: '24px' }}>
                <button
                  type="button"
                  className="btn btn--ghost"
                  style={{ padding: '8px 16px', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.2)' }}
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  {Icons.trash} Delete
                </button>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button type="button" className="btn btn--ghost" style={{ padding: '8px 16px' }} onClick={() => setShowEditPlaylistDialog(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn--primary" style={{ padding: '8px 16px' }}>
                    Save Changes
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ Delete Confirmation Dialog ═══ */}
      {showDeleteConfirm && selectedPlaylist && (
        <div className="dialog-overlay" onClick={() => setShowDeleteConfirm(false)} style={{ zIndex: 110000 }}>
          <div className="dialog-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '380px', textAlign: 'center' }}>
            <div style={{ color: '#f87171', marginBottom: '16px', transform: 'scale(1.5)', display: 'inline-block' }}>{Icons.alertTriangle}</div>
            <h2>Delete Playlist?</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '24px', lineHeight: 1.4 }}>
              Are you sure you want to delete this playlist? This action cannot be undone.
            </p>
            <div className="dialog-box__actions" style={{ justifyContent: 'center', gap: '12px' }}>
              <button
                type="button"
                className="btn btn--ghost"
                style={{ padding: '8px 16px' }}
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn--primary"
                style={{ padding: '8px 16px', backgroundColor: '#ef4444' }}
                onClick={() => {
                  deletePlaylist(selectedPlaylist.id);
                  setShowDeleteConfirm(false);
                  setShowEditPlaylistDialog(false);
                }}
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* ═══ Create Shared Playlist Dialog ═══ */}
      {showCreateSharedDialog && (
        <div className="dialog-overlay" onClick={() => setShowCreateSharedDialog(false)}>
          <div className="dialog-box" onClick={(e) => e.stopPropagation()}>
            <h2>Create Shared Playlist</h2>
            <form onSubmit={createSharedPlaylist}>
              <label style={{ fontSize: '0.8rem', color: '#a1a1aa' }}>Playlist Name</label>
              <input
                type="text"
                value={newSharedPlTitle}
                onChange={(e) => setNewSharedPlTitle(e.target.value)}
                placeholder="Collaborative selection..."
                required
                autoFocus
              />
              <label style={{ fontSize: '0.8rem', color: '#a1a1aa' }}>Description (optional)</label>
              <input
                type="text"
                value={newSharedPlDesc}
                onChange={(e) => setNewSharedPlDesc(e.target.value)}
                placeholder="Let's build a vibe together..."
              />
              <div className="dialog-box__actions">
                <button type="button" className="btn btn--ghost" style={{ padding: '8px 16px' }} onClick={() => setShowCreateSharedDialog(false)}>
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

              <label style={{ fontSize: '0.8rem', color: '#a1a1aa', display: 'block', marginBottom: '6px' }}>Profile Picture (PFP) URL</label>
              <input
                type="text"
                value={newProfileAvatarUrl}
                onChange={(e) => setNewProfileAvatarUrl(e.target.value)}
                placeholder="Paste custom image URL or select a preset below..."
                style={{ marginBottom: '10px' }}
              />
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                {PRESET_AVATARS.map((avatar, idx) => {
                  const isSelected = newProfileAvatarUrl === avatar.url;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setNewProfileAvatarUrl(isSelected ? '' : avatar.url)}
                      style={{
                        position: 'relative',
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        border: isSelected ? '2px solid var(--accent-pink)' : '1px solid rgba(255,255,255,0.1)',
                        padding: 0,
                        cursor: 'pointer',
                        boxShadow: isSelected ? '0 0 8px var(--accent-pink)' : 'none'
                      }}
                      title={avatar.name}
                    >
                      <img src={avatar.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </button>
                  );
                })}
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
            <button onClick={() => setShowQueueDrawer(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'inline-flex' }} title="Close queue">{Icons.close}</button>
          </div>
          <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '280px', paddingRight: '4px' }} className="custom-scrollbar">
            {playerQueue.length === 0 && (
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', padding: '12px', textAlign: 'center' }}>
                {isControllingRemoteReceiver ? `${receiverLabel} has no visible queue yet.` : 'Queue is empty.'}
              </div>
            )}
            {playerQueue.map((song, idx) => {
              const isActive = idx === playerQueueIndex;
              return (
                <div
                  key={`${song.id}-${idx}`}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px', borderRadius: '8px', background: isActive ? 'rgba(255,255,255,0.06)' : 'transparent', border: isActive ? '1px solid var(--accent-pink)' : '1px solid transparent', cursor: 'pointer', transition: 'all 0.15s ease' }}
                  onClick={() => startTrackOnActiveReceiver(song, playerQueue)}
                >
                  <img src={song.artworkUrl || '/icon.svg'} alt="" style={{ width: '36px', height: '36px', borderRadius: '4px', objectFit: 'cover' }} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: isActive ? 'var(--accent-pink)' : '#fff' }} className="truncate">{song.title}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }} className="truncate">{song.artists.map(a => a.name).join(', ')}</div>
                  </div>
                  {!isControllingRemoteReceiver && queue.length > 1 && (
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
                      {Icons.close}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: '12px', display: 'flex', gap: '8px', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
            <button className="btn btn--ghost" style={{ padding: '4px 8px', fontSize: '0.75rem' }} disabled={isControllingRemoteReceiver} onClick={() => {
              setQueue([currentTrack]);
              setQueueIndex(0);
            }}>
              {isControllingRemoteReceiver ? 'Remote Queue' : 'Clear Queue'}
            </button>
          </div>
        </div>
      )}

      {/* ═══ Floating Bar Lyrics Drawer ═══ */}
      {showBarLyrics && (
        <div className="lyrics-drawer animate-in" style={{ position: 'fixed', right: '24px', bottom: '96px', width: '320px', height: '420px', background: 'rgba(10, 10, 10, 0.95)', border: '1px solid var(--border-color)', borderRadius: '16px', backdropFilter: 'blur(20px)', zIndex: 99, padding: '20px', display: 'flex', flexDirection: 'column', boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, fontFamily: 'Outfit, sans-serif', color: '#fff' }}>Lyrics</h4>
              {lyricsData && !lyricsData.isSynced && lyricsData.lines.length > 0 && (
                <span style={{ fontSize: '0.58rem', background: 'rgba(236, 72, 153, 0.15)', color: 'var(--accent-pink)', padding: '2px 6px', borderRadius: '20px', fontWeight: 700 }}>UNSYNCED</span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                onClick={() => lyricsData?.isSynced && setIsKaraokeMode(!isKaraokeMode)}
                style={{ background: 'none', border: 'none', color: isKaraokeMode ? 'var(--accent-pink)' : 'rgba(255,255,255,0.4)', cursor: lyricsData?.isSynced ? 'pointer' : 'not-allowed', fontSize: '0.9rem', outline: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                title="Toggle Karaoke Mode"
              >
                {Icons.microphone} {isKaraokeMode ? 'ON' : 'OFF'}
              </button>
              <button onClick={() => setShowBarLyrics(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', outline: 'none', display: 'inline-flex' }} title="Close lyrics">{Icons.close}</button>
            </div>
          </div>

          {/* Body content (same interactive parser view!) */}
          <div
            ref={lyricsContainerRef}
            style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '18px', textAlign: 'center', padding: '10px 0', scrollBehavior: 'smooth' }}
            className="custom-scrollbar"
          >
            {lyricsLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '12px', color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>
                <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--accent-pink)', animation: 'spin 1s linear infinite' }} />
                <span>Tuning...</span>
              </div>
            ) : !lyricsData || lyricsData.lines.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>
                No lyrics found.
              </div>
            ) : (
              lyricsData.lines.map((line, idx) => {
                const isActive = idx === activeLineIdx;
                const isPast = idx < activeLineIdx;
                const isChorus = line.text.includes('[Chorus]');
                const isHeader = line.text.startsWith('[') && line.text.endsWith(']');

                return (
                  <div
                    key={idx}
                    data-active={isActive}
                    onClick={() => {
                      if (!lyricsData.isSynced) return;
                      setProgress(line.time);
                      if (streamProtocol === 'embed' && isYouTubeTrack(currentTrack) && ytPlayerRef.current && typeof ytPlayerRef.current.seekTo === 'function') {
                        ytPlayerRef.current.seekTo(line.time, true);
                      }
                      if (audioRef.current) {
                        audioRef.current.currentTime = line.time;
                      }
                    }}
                    style={{
                      fontSize: isChorus ? '1rem' : '0.88rem',
                      fontWeight: (isChorus || isHeader) ? 800 : (isActive ? 700 : 500),
                      color: isHeader ? 'var(--accent-pink)' : isChorus ? '#fff' : (isActive ? '#fff' : 'rgba(255,255,255,0.4)'),
                      fontFamily: 'Outfit, sans-serif',
                      lineHeight: 1.3,
                      textShadow: isActive ? (isHeader ? '0 0 10px rgba(236,72,153,0.4)' : '0 0 12px rgba(255,255,255,0.3)') : 'none',
                      cursor: lyricsData.isSynced ? 'pointer' : 'default',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      transform: isActive ? 'scale(1.03)' : 'scale(1)',
                      background: isActive ? 'rgba(255, 255, 255, 0.03)' : 'transparent',
                      transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                      opacity: isActive ? 1 : (isPast ? 0.35 : 0.6)
                    }}
                  >
                    {lyricsData.isSynced && isKaraokeMode && line.words.length > 0 && !isHeader ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center' }}>
                        {line.words.map((w, wIdx) => {
                          const isWordActive = progress >= w.start && progress < (w.start + w.duration);
                          const isWordPassed = progress >= (w.start + w.duration);

                          let wColor = isActive ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.3)';
                          let wGlow = 'none';
                          let wWeight = isActive ? 700 : 500;

                          if (isWordPassed) {
                            wColor = '#fff';
                            wWeight = 800;
                            wGlow = '0 0 6px rgba(255,255,255,0.4)';
                          } else if (isWordActive) {
                            wColor = 'var(--accent-pink)';
                            wWeight = 800;
                            wGlow = '0 0 10px var(--accent-pink)';
                          }

                          return (
                            <span
                              key={wIdx}
                              style={{
                                color: wColor,
                                fontWeight: wWeight,
                                textShadow: wGlow,
                                transition: 'all 0.1s linear',
                                whiteSpace: 'pre',
                                display: 'inline-block'
                              }}
                            >
                              {w.word}
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      line.text
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ═══ Now Playing Bar Panel ═══ */}
      <footer className="now-playing">
        {/* Left: playback controls */}
        <div className="now-playing__left-controls">
          <button
            className={`now-playing__btn now-playing__btn--wide-only ${isShuffle ? 'active' : ''}`}
            onClick={() => {
              setIsShuffle(!isShuffle);
              localStorage.setItem('spice_is_shuffle', (!isShuffle).toString());
            }}
            title="Shuffle"
            aria-label="Shuffle"
          >
            {Icons.shuffle}
          </button>

          <button className="now-playing__btn" onClick={handleReceiverPrev} aria-label="Previous">
            {Icons.prev}
          </button>

          <button
            className="now-playing__btn now-playing__btn--play"
            onClick={toggleReceiverPlayPause}
            aria-label={playerIsPlaying ? 'Pause' : 'Play'}
          >
            {playerIsPlaying ? Icons.pause : Icons.play}
          </button>

          <button className="now-playing__btn" onClick={handleReceiverNext} aria-label="Next">
            {Icons.next}
          </button>

          <button
            className={`now-playing__btn now-playing__btn--wide-only ${repeatMode !== 'none' ? 'active' : ''}`}
            onClick={() => {
              const nextMode = repeatMode === 'none' ? 'all' : repeatMode === 'all' ? 'one' : 'none';
              setRepeatMode(nextMode);
              localStorage.setItem('spice_repeat_mode', nextMode);
            }}
            title={`Repeat Mode: ${repeatMode === 'none' ? 'Off' : repeatMode === 'all' ? 'Repeat All' : 'Repeat One'}`}
          >
            {repeatMode === 'one' ? Icons.repeatOne : Icons.repeat}
          </button>

          <button
            className={`now-playing__like ${likedTracks.has(playerTrack.id) ? 'liked' : ''}`}
            onClick={() => !playerIsPlaceholder && toggleLike(playerTrack)}
            disabled={playerIsPlaceholder}
            aria-label="Like"
          >
            {likedTracks.has(playerTrack.id) ? Icons.heartFilled : Icons.heart}
          </button>
        </div>

        {/* Center: song info & seek slider */}
        <div className="now-playing__center">
          <div className="now-playing__song" onClick={() => { setPlayerViewMode('expanded'); localStorage.setItem('spice_player_view_mode', 'expanded'); }} style={{ cursor: 'pointer' }} title="Expand Player View">
            <img className="now-playing__art" src={playerTrack.artworkUrl || '/icon.svg'} alt={playerTrack.title} />
            <div className="now-playing__info">
              <span className="now-playing__title truncate">{playerTrack.title}</span>
              <span className="now-playing__artist truncate">
                {isControllingRemoteReceiver ? `${receiverLabel} - ` : ''}{playerTrack.artists.map(a => a.name).join(', ')}
              </span>
            </div>

            {/* Animative waveform */}
            <div className={`now-playing__waveform ${!playerIsPlaying ? 'paused' : ''}`}>
              <div className="now-playing__waveform-bar"></div>
              <div className="now-playing__waveform-bar"></div>
              <div className="now-playing__waveform-bar"></div>
              <div className="now-playing__waveform-bar"></div>
              <div className="now-playing__waveform-bar"></div>
            </div>
          </div>

          {renderSongShareButton(playerTrack, 'now-playing__btn now-playing__share')}

          <div className="now-playing__seek">
            <span>{formatTime(playerProgress)}</span>
            <div className="now-playing__seek-track" onClick={handleReceiverSeek}>
              <div
                className="now-playing__progress-fill"
                style={{ width: `${playerDuration > 0 ? (playerProgress / playerDuration) * 100 : 0}%` }}
              ></div>
            </div>
            <span>{formatTime(playerDuration)}</span>
            {!isControllingRemoteReceiver && isLoadingStream && <span className="loader-glow">Resolving stream...</span>}
          </div>
        </div>

        {/* Right: volume & queue controls */}
        <div className="now-playing__right-controls">
          {renderSpiceConnectReceiverSelect('bar')}

          <button
            className={`now-playing__btn ${showBarLyrics ? 'active' : ''}`}
            onClick={() => {
              if (isControllingRemoteReceiver) return;
              setShowBarLyrics(!showBarLyrics);
              setShowQueueDrawer(false);
            }}
            disabled={isControllingRemoteReceiver}
            title={isControllingRemoteReceiver ? 'Lyrics open on this browser only. Switch receiver to this device first.' : 'Real-time Synced Lyrics'}
            aria-label="Real-time Synced Lyrics"
          >
            {Icons.microphone}
          </button>

          <button
            className={`now-playing__btn ${showQueueDrawer ? 'active' : ''}`}
            onClick={() => {
              setShowQueueDrawer(!showQueueDrawer);
              setShowBarLyrics(false);
            }}
            title="Up Next Queue"
            aria-label="Up Next Queue"
          >
            {Icons.list}
          </button>

          <button
            className="now-playing__btn"
            onClick={() => {
              setPlayerViewMode('mini');
              localStorage.setItem('spice_player_view_mode', 'mini');
              setShowBarLyrics(false);
              setShowQueueDrawer(false);
            }}
            title="Switch to Floating Mini Player"
            aria-label="Switch to Floating Mini Player"
          >
            {Icons.miniPlayer}
          </button>

          <div className="now-playing__volume">
            <button className="now-playing__volume-btn" onClick={() => setReceiverVolume(playerVolume === 0 ? 70 : 0)}>
              {playerVolume === 0 ? Icons.volumeMuted : Icons.volume}
            </button>
            <input
              type="range"
              className="now-playing__volume-slider"
              min="0"
              max="100"
              value={playerVolume}
              onChange={(e) => setReceiverVolume(Number(e.target.value))}
              style={{
                background: `linear-gradient(to right, var(--accent-pink) 0%, var(--accent-pink) ${playerVolume}%, hsla(270, 10%, 25%, 0.5) ${playerVolume}%, hsla(270, 10%, 25%, 0.5) 100%)`
              }}
            />
          </div>
        </div>

        {/* Mobile-only Play/Pause button */}
        <button
          className="now-playing__mobile-play"
          onClick={(e) => { e.stopPropagation(); toggleReceiverPlayPause(); }}
          style={{ display: 'none' }}
        >
          {playerIsPlaying ? Icons.pause : Icons.play}
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
              {Icons.miniPlayer} Floating Mini Player
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
              {Icons.close}
            </button>
          </div>

          {/* Central content layout: Grid with artwork + controls, and Optional Playlist Queue/Lyrics */}
          {/* Central content layout: Grid with artwork + controls, and Optional Playlist Queue/Lyrics */}
          <div className="expanded-player__grid">

            {/* Column 1: Massive Spinning Artwork & Titles */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <div
                className={`expanded-player__art-box ${playerIsPlaying ? 'vinyl-spin' : ''}`}
                style={{
                  boxShadow: `0 24px 64px rgba(0,0,0,0.8), 0 0 40px rgba(var(--accent-pink-rgb, 236, 72, 153), 0.25)`
                }}
              >
                <img
                  src={playerTrack.artworkUrl || '/icon.svg'}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>

              <h2 style={{ fontSize: '2rem', fontWeight: 800, margin: '0 0 8px 0', width: '100%', fontFamily: 'Outfit, sans-serif' }} className="truncate">
                {playerTrack.title}
              </h2>
              <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', margin: 0, width: '100%' }} className="truncate">
                {isControllingRemoteReceiver ? `${receiverLabel} - ` : ''}{playerTrack.artists.map(a => a.name).join(', ')}
              </p>
              <div style={{ marginTop: '18px', width: 'min(100%, 320px)' }}>
                {renderSpiceConnectReceiverSelect('expanded')}
              </div>
            </div>

            {/* Column 2: Immersive Tabbed Controller (Controls / Up Next / Lyrics) */}
            <div style={{ display: 'flex', flexDirection: 'column', height: '420px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '24px', padding: '24px', backdropFilter: 'blur(30px)', width: '100%', minWidth: 0 }}>

              {/* Tab headers */}
              <div style={{ display: 'flex', gap: '20px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px', marginBottom: '20px' }}>
                {[
                  { id: 'controls', label: 'Player Controls', icon: Icons.headphones },
                  { id: 'queue', label: 'Up Next Queue', icon: Icons.shuffle },
                  { id: 'lyrics', label: 'Active Lyrics', icon: Icons.microphone }
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
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>{t.icon} {t.label}</span>
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
                        const baseVal = 20 + Math.abs(Math.sin((i + playerProgress) * 0.5)) * 60;
                        const randHeight = playerIsPlaying ? baseVal + Math.abs(Math.sin(i * 12.9898 + playerProgress)) * 20 : 15;
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
                      <div style={{ position: 'relative', height: '8px', width: '100%', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', cursor: 'pointer' }} onClick={handleReceiverSeek}>
                        <div
                          style={{
                            position: 'absolute',
                            left: 0,
                            top: 0,
                            bottom: 0,
                            width: `${playerDuration > 0 ? (playerProgress / playerDuration) * 100 : 0}%`,
                            background: 'var(--accent-pink)',
                            borderRadius: '4px',
                            boxShadow: '0 0 10px var(--accent-pink)'
                          }}
                        />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        <span>{formatTime(playerProgress)}</span>
                        <span>{formatTime(playerDuration)}</span>
                      </div>
                    </div>

                    {/* Huge transport buttons */}
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '32px' }}>
                      <button
                        onClick={() => {
                          setIsShuffle(!isShuffle);
                          localStorage.setItem('spice_is_shuffle', (!isShuffle).toString());
                        }}
                        style={{ background: 'none', border: 'none', color: isShuffle ? 'var(--accent-pink)' : '#fff', opacity: isShuffle ? 1 : 0.4, cursor: 'pointer', outline: 'none', transition: 'all 0.15s ease' }}
                        className="expanded-player__btn"
                        title="Shuffle"
                      >
                        <span style={{ transform: 'scale(1.4)', display: 'inline-block' }}>{Icons.shuffle}</span>
                      </button>

                      <button
                        onClick={handleReceiverPrev}
                        style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', outline: 'none', transition: 'all 0.15s ease' }}
                        className="expanded-player__btn"
                      >
                        <span style={{ transform: 'scale(1.5)', display: 'inline-block' }}>{Icons.prev}</span>
                      </button>

                      <button
                        onClick={toggleReceiverPlayPause}
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
                          {playerIsPlaying ? Icons.pause : Icons.play}
                        </span>
                      </button>

                      <button
                        onClick={handleReceiverNext}
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
                        style={{ background: 'none', border: 'none', color: repeatMode !== 'none' ? 'var(--accent-pink)' : '#fff', opacity: repeatMode !== 'none' ? 1 : 0.4, cursor: 'pointer', outline: 'none', transition: 'all 0.15s ease' }}
                        className="expanded-player__btn"
                        title={`Repeat Mode: ${repeatMode === 'none' ? 'Off' : repeatMode === 'all' ? 'Repeat All' : 'Repeat One'}`}
                      >
                        <span style={{ transform: 'scale(1.4)', display: 'inline-block' }}>{repeatMode === 'one' ? Icons.repeatOne : Icons.repeat}</span>
                      </button>
                    </div>

                    {/* Volume and info footer */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <button
                          className={`now-playing__like ${likedTracks.has(playerTrack.id) ? 'liked' : ''}`}
                          onClick={() => !playerIsPlaceholder && toggleLike(playerTrack)}
                          disabled={playerIsPlaceholder}
                          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '10px', borderRadius: '50%', cursor: playerIsPlaceholder ? 'not-allowed' : 'pointer' }}
                        >
                          <span style={{ display: 'inline-flex', transform: 'scale(1.2)' }}>
                            {likedTracks.has(playerTrack.id) ? Icons.heartFilled : Icons.heart}
                          </span>
                        </button>

                        <button
                          className="expanded-player__round-action"
                          onClick={(event) => shareSongLink(playerTrack, event)}
                          disabled={playerIsPlaceholder}
                          title={`Share "${playerTrack.title}"`}
                          aria-label={`Share ${playerTrack.title}`}
                        >
                          {Icons.share}
                        </button>

                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '180px' }}>
                        <span style={{ opacity: 0.6 }}>{Icons.volume}</span>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={playerVolume}
                          onChange={(e) => setReceiverVolume(Number(e.target.value))}
                          style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--accent-pink)' }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {expandedTab === 'queue' && (
                  <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '310px', paddingRight: '4px' }} className="custom-scrollbar">
                      {playerQueue.length === 0 && (
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.86rem', padding: '12px', textAlign: 'center' }}>
                          {isControllingRemoteReceiver ? `${receiverLabel} has no visible queue yet.` : 'Queue is empty.'}
                        </div>
                      )}
                      {playerQueue.map((song, idx) => {
                        const isActive = idx === playerQueueIndex;
                        return (
                          <div
                            key={`${song.id}-${idx}`}
                            onClick={() => startTrackOnActiveReceiver(song, playerQueue)}
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
                  <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '8px' }}>
                    {/* Karaoke Controls Header */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      background: 'rgba(255, 255, 255, 0.03)',
                      borderRadius: '12px',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                      backdropFilter: 'blur(10px)',
                      marginBottom: '4px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>
                        <span style={{ display: 'inline-flex' }}>{Icons.microphone}</span>
                        <span style={{ letterSpacing: '1px', fontFamily: 'Outfit, sans-serif' }}>KARAOKE MODE</span>
                        {lyricsData && !lyricsData.isSynced && lyricsData.lines.length > 0 && (
                          <span style={{
                            fontSize: '0.6rem',
                            background: 'rgba(236, 72, 153, 0.15)',
                            color: 'var(--accent-pink)',
                            padding: '2px 6px',
                            borderRadius: '20px',
                            fontWeight: 700,
                            letterSpacing: '0.5px'
                          }}>
                            UNSYNCED
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => lyricsData?.isSynced && setIsKaraokeMode(!isKaraokeMode)}
                        style={{
                          background: isKaraokeMode ? 'linear-gradient(135deg, var(--accent-pink), #ec4899)' : 'rgba(255,255,255,0.08)',
                          border: 'none',
                          color: '#fff',
                          padding: '4px 12px',
                          borderRadius: '20px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: lyricsData?.isSynced ? 'pointer' : 'not-allowed',
                          boxShadow: isKaraokeMode ? '0 0 10px rgba(236, 72, 153, 0.4)' : 'none',
                          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                        }}
                      >
                        {isKaraokeMode ? 'ON' : 'OFF'}
                      </button>
                    </div>

                    {/* Scrollable Lyric container */}
                    <div
                      ref={lyricsContainerRef}
                      style={{
                        overflowY: 'auto',
                        flex: 1,
                        maxHeight: '265px',
                        paddingRight: '6px',
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '20px',
                        padding: '12px 0',
                        scrollBehavior: 'smooth'
                      }}
                      className="custom-scrollbar"
                    >
                      {lyricsLoading ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '150px', gap: '12px', color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>
                          <div style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            border: '2px solid rgba(255,255,255,0.1)',
                            borderTopColor: 'var(--accent-pink)',
                            animation: 'spin 1s linear infinite'
                          }} />
                          <span style={{ fontFamily: 'Outfit, sans-serif' }}>Tuning sync wavelengths...</span>
                        </div>
                      ) : !lyricsData || lyricsData.lines.length === 0 ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '150px', color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem', fontFamily: 'Outfit, sans-serif' }}>
                          No lyrics found for this track.
                        </div>
                      ) : (
                        lyricsData.lines.map((line, idx) => {
                          const isActive = idx === activeLineIdx;
                          const isPast = idx < activeLineIdx;
                          const isChorus = line.text.includes('[Chorus]');
                          const isHeader = line.text.startsWith('[') && line.text.endsWith(']');

                          return (
                            <div
                              key={idx}
                              data-active={isActive}
                              onClick={() => {
                                if (!lyricsData.isSynced) return;
                                setProgress(line.time);
                                if (streamProtocol === 'embed' && isYouTubeTrack(currentTrack) && ytPlayerRef.current && typeof ytPlayerRef.current.seekTo === 'function') {
                                  ytPlayerRef.current.seekTo(line.time, true);
                                }
                                if (audioRef.current) {
                                  audioRef.current.currentTime = line.time;
                                }
                              }}
                              style={{
                                fontSize: isChorus ? '1.15rem' : '1rem',
                                fontWeight: (isChorus || isHeader) ? 800 : (isActive ? 700 : 500),
                                color: isHeader ? 'var(--accent-pink)' : isChorus ? '#fff' : (isActive ? '#fff' : 'rgba(255,255,255,0.4)'),
                                fontFamily: 'Outfit, sans-serif',
                                lineHeight: 1.4,
                                textShadow: isActive
                                  ? (isHeader ? '0 0 10px rgba(236,72,153,0.4)' : '0 0 12px rgba(255,255,255,0.3)')
                                  : 'none',
                                cursor: lyricsData.isSynced ? 'pointer' : 'default',
                                padding: '6px 12px',
                                borderRadius: '8px',
                                transform: isActive ? 'scale(1.04)' : 'scale(1)',
                                background: isActive ? 'rgba(255, 255, 255, 0.03)' : 'transparent',
                                border: isActive ? '1px solid rgba(255,255,255,0.03)' : '1px solid transparent',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                opacity: isActive ? 1 : (isPast ? 0.35 : 0.6)
                              }}
                            >
                              {lyricsData.isSynced && isKaraokeMode && line.words.length > 0 && !isHeader ? (
                                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center' }}>
                                  {line.words.map((w, wIdx) => {
                                    const isWordActive = progress >= w.start && progress < (w.start + w.duration);
                                    const isWordPassed = progress >= (w.start + w.duration);

                                    let wColor = isActive ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.3)';
                                    let wGlow = 'none';
                                    let wWeight = isActive ? 700 : 500;

                                    if (isWordPassed) {
                                      wColor = '#fff';
                                      wWeight = 800;
                                      wGlow = '0 0 8px rgba(255,255,255,0.4)';
                                    } else if (isWordActive) {
                                      wColor = 'var(--accent-pink)';
                                      wWeight = 800;
                                      wGlow = '0 0 12px var(--accent-pink)';
                                    }

                                    return (
                                      <span
                                        key={wIdx}
                                        style={{
                                          color: wColor,
                                          fontWeight: wWeight,
                                          textShadow: wGlow,
                                          transition: 'all 0.1s linear',
                                          whiteSpace: 'pre',
                                          display: 'inline-block'
                                        }}
                                      >
                                        {w.word}
                                      </span>
                                    );
                                  })}
                                </div>
                              ) : (
                                line.text
                              )}
                            </div>
                          );
                        })
                      )}
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
            <span>PWA v1.0.42</span>
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
            height: showMiniLyrics ? '160px' : '108px',
            background: 'rgba(10, 10, 10, 0.88)',
            backgroundImage: `radial-gradient(circle at 10% 10%, rgba(var(--accent-pink-rgb, 236, 72, 153), 0.12), transparent 70%)`,
            border: '1px solid var(--border-color)',
            borderRadius: '24px',
            backdropFilter: 'blur(30px)',
            WebkitBackdropFilter: 'blur(30px)',
            boxShadow: '0 16px 48px rgba(0, 0, 0, 0.7), 0 0 20px rgba(var(--accent-pink-rgb, 236, 72, 153), 0.2)',
            zIndex: 99999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '14px',
            gap: '8px',
            fontFamily: 'Outfit, sans-serif',
            color: '#fff',
            cursor: isDraggingMini ? 'grabbing' : 'grab',
            userSelect: 'none',
            touchAction: 'none',
            transition: 'height 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        >
          <div style={{ display: 'flex', width: '100%', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
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
              onClick={toggleReceiverPlayPause}
              title={playerIsPlaying ? 'Pause' : 'Play'}
            >
              <img
                src={playerTrack.artworkUrl || '/icon.svg'}
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
                <span style={{ display: 'inline-flex' }}>
                  {playerIsPlaying ? Icons.pause : Icons.play}
                </span>
              </div>
            </div>

            {/* Details & Controls Column */}
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {/* Top Row: Song Details & Compact Actions */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#fff', lineHeight: 1.2 }} className="truncate">
                    {playerTrack.title}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }} className="truncate">
                    {isControllingRemoteReceiver ? `${receiverLabel} - ` : ''}{playerTrack.artists.map(a => a.name).join(', ')}
                  </div>
                  {renderSpiceConnectReceiverSelect('mini')}
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    onClick={() => !playerIsPlaceholder && toggleLike(playerTrack)}
                    disabled={playerIsPlaceholder}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: likedTracks.has(playerTrack.id) ? 'var(--accent-pink)' : 'rgba(255,255,255,0.4)',
                      cursor: playerIsPlaceholder ? 'not-allowed' : 'pointer',
                      outline: 'none',
                      padding: '4px',
                      fontSize: '0.95rem',
                      transition: 'all 0.15s ease'
                    }}
                    title={likedTracks.has(playerTrack.id) ? 'Unlike' : 'Like'}
                  >
                    {likedTracks.has(playerTrack.id) ? Icons.heartFilled : Icons.heart}
                  </button>

                  <button
                    onClick={(event) => shareSongLink(playerTrack, event)}
                    disabled={playerIsPlaceholder}
                    className="mini-player__action-btn"
                    title={`Share "${playerTrack.title}"`}
                    aria-label={`Share ${playerTrack.title}`}
                  >
                    {Icons.share}
                  </button>

                  <button
                    onClick={() => setReceiverVolume(playerVolume === 0 ? 70 : 0)}
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
                    title={playerVolume === 0 ? 'Unmute' : 'Mute'}
                  >
                    {playerVolume === 0 ? Icons.volumeMuted : Icons.volume}
                  </button>
                </div>
              </div>

              {/* Bottom Row: Transport controls & view switches */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    onClick={handleReceiverPrev}
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
                    {Icons.prev}
                  </button>

                  <button
                    onClick={toggleReceiverPlayPause}
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
                    <span style={{ display: 'inline-flex' }}>
                      {playerIsPlaying ? Icons.pause : Icons.play}
                    </span>
                  </button>

                  <button
                    onClick={handleReceiverNext}
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
                    {Icons.next}
                  </button>
                </div>

                {/* View Switches */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    onClick={() => !isControllingRemoteReceiver && setShowMiniLyrics(!showMiniLyrics)}
                    disabled={isControllingRemoteReceiver}
                    style={{
                      background: showMiniLyrics ? 'var(--accent-pink)' : 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#fff',
                      width: '28px',
                      height: '28px',
                      borderRadius: '8px',
                      cursor: isControllingRemoteReceiver ? 'not-allowed' : 'pointer',
                      opacity: isControllingRemoteReceiver ? 0.35 : 1,
                      outline: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.8rem',
                      transition: 'all 0.15s ease',
                      boxShadow: showMiniLyrics ? '0 0 8px rgba(236, 72, 153, 0.4)' : 'none'
                    }}
                    title="Toggle Lyrics View"
                  >
                    {Icons.microphone}
                  </button>

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
                    {Icons.expand}
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
                    {Icons.close}
                  </button>
                </div>
              </div>
            </div>

          </div>

          {/* Mini Player Synced Lyrics Strip */}
          {showMiniLyrics && (
            <div style={{
              width: '100%',
              borderTop: '1px solid rgba(255,255,255,0.06)',
              paddingTop: '8px',
              marginTop: '4px',
              textAlign: 'center',
              minHeight: '34px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'Outfit, sans-serif',
              fontSize: '0.82rem',
              fontWeight: 600,
              color: 'var(--accent-pink)',
              textShadow: '0 0 8px rgba(236,72,153,0.3)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              paddingLeft: '4px',
              paddingRight: '4px',
              zIndex: 1,
              userSelect: 'text',
              cursor: 'default'
            }}>
              {lyricsLoading ? (
                <span style={{ color: 'rgba(255,255,255,0.4)' }}>Tuning...</span>
              ) : activeLineIdx >= 0 && lyricsData ? (
                <span className="animate-in" key={activeLineIdx} style={{ animationDuration: '0.3s' }}>
                  {lyricsData.lines[activeLineIdx].text}
                </span>
              ) : (
                <span style={{ color: 'rgba(255,255,255,0.3)' }}>
                  {lyricsData && !lyricsData.isSynced && lyricsData.lines.length > 0 ? 'Lyrics are not time-synced' : '(Instrumental)'}
                </span>
              )}
            </div>
          )}

          {/* Interactive Seek Progress strip at the very bottom */}
          <div
            onClick={handleReceiverSeek}
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
                width: `${playerDuration > 0 ? (playerProgress / playerDuration) * 100 : 0}%`,
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
          { id: 'home', label: 'Home', icon: Icons.home },
          { id: 'search', label: 'Search', icon: Icons.search },
          { id: 'library', label: 'Library', icon: Icons.library },
          { id: 'settings', label: 'Settings', icon: Icons.settings }
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
