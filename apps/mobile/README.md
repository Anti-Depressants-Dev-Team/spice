# Spice Mobile

Native Android preview for Spice Music, built with Jetpack Compose and Media3.

## Current Features

- Native Home, Search, Library, and Settings screens
- Live discovery data from music.spice-app.xyz
- Full-length SoundCloud sources are prioritized, with automatic SoundCloud fallback when a selected YouTube direct stream is unavailable
- Local liked tracks, listening history, and quality preference
- Media3/ExoPlayer playback service with Android media session and notification
- Lock-screen controls, audio focus, headset/Bluetooth commands, noisy-output pause, and background playback
- Full player sheet with seek, play/pause, like, and stop controls
- Debug-only local audio test for validating the native media stack without the network

The app intentionally does not embed the website or use its YouTube iframe fallback. Native background playback requires a direct HTTPS audio URL.

## Commands

Run from the repository root:

~~~powershell
npm run mobile:build
npm run mobile:test
npm run mobile:android:debug
npm run mobile:android:check
~~~

The debug APK is written to:

~~~text
apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk
~~~

mobile:android:check runs Android lint, JVM unit tests, and a debug APK assembly.

## Prerequisites

- JDK 21
- Android SDK with compile SDK 36
- An Android 7.0 or newer device

The build script detects common Windows JDK and Android SDK locations. The Android application ID is xyz.spiceapp.mobile.

## Playback API

Discovery currently reads:

~~~text
GET https://music.spice-app.xyz/api/yt/search?q={query}&limit={limit}
GET https://music.spice-app.xyz/api/sc/search?q={query}&limit={limit}
~~~

A track is playable only when one of these endpoints returns at least one direct HTTPS stream:

~~~text
GET /api/yt/track/{trackId}
GET /api/sc/track/{trackId}?quality={high|medium|low}
~~~

YouTube direct resolution can still fail because the provider does not expose an app-owned audio URL. The Android client therefore prefers full-length SoundCloud results and retries provider-approved SoundCloud alternatives. Tracks exposed only as 30-second previews are excluded by the backend. The hosted website's YouTube iframe remains excluded because Android cannot reliably keep iframe playback alive in a foreground media service.

## Release Status

The debug APK is installable and plays full-length SoundCloud sources through the native media stack. A public release remains blocked on:

1. Adding an account-linked licensed provider for exact mainstream originals that SoundCloud does not expose as full tracks.
2. Adding Spice account authentication and cloud playlist sync.
3. Verifying background playback on physical devices.
4. Creating a release keystore, privacy disclosures, and signed AAB.
5. Confirming provider terms permit the selected native playback transport.
