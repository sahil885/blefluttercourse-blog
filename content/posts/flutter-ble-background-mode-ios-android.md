---
title: "Flutter BLE Background Mode: What's Actually Possible on iOS and Android"
date: "2026-05-22"
excerpt: "Need your Flutter BLE app to stay connected when the screen locks? Here's what iOS and Android actually allow in the background — and the setup you need to make it work."
tags: ["Flutter", "BLE", "iOS", "Android", "background", "foreground service"]
---

> **TL;DR:** flutter_blue_plus alone does not keep your app alive in the background. On iOS, you need to declare `bluetooth-central` in Info.plist. On Android, you need a Foreground Service with a persistent notification. Both platforms have hard limits on what background BLE can do — this guide explains what's actually possible and what isn't.

# Flutter BLE Background Mode: What's Actually Possible on iOS and Android

Most BLE apps work perfectly in the foreground. Then a user locks their phone, and the connection drops. Or they put the app in the background for two minutes and everything stops working.

Background BLE is one of the most misunderstood topics in Flutter development. Developers often assume it's a single flag to enable. It's not — the setup is platform-specific, the constraints are real, and the approach differs significantly between iOS and Android.

---

## What "Background BLE" Actually Means

There are three different things developers usually mean when they say "background BLE," and each has different platform support:

| Scenario | iOS | Android |
|---|---|---|
| Stay connected while backgrounded | ✅ | ✅ |
| Receive notifications while backgrounded | ✅ With setup | ✅ With foreground service |
| Scan for new devices in background | ⚠️ Filtered only | ✅ With foreground service |
| Full BLE while app is terminated | ❌ | ❌ |

The most common real-world need — "keep the connection alive while the user's phone is in their pocket" — is achievable on both platforms. Everything beyond that requires more work and has more constraints.

---

## iOS: Background Mode Setup

### What You Need to Add

In `ios/Runner/Info.plist`, declare the Bluetooth background mode:

```xml
<key>UIBackgroundModes</key>
<array>
  <string>bluetooth-central</string>
</array>

<key>NSBluetoothAlwaysUsageDescription</key>
<string>This app uses Bluetooth to stay connected with your device in the background.</string>
```

Without this, iOS disconnects BLE connections and stops delivering scan results within a few seconds of the app backgrounding. With it, existing connections are maintained and you can receive characteristic notifications while backgrounded.

### What iOS Actually Allows

With `bluetooth-central` declared, you can:

- **Maintain active connections** — the connection stays open
- **Receive notifications** from connected peripherals
- **Scan for specific service UUIDs** — but not unfiltered scans

What iOS does not allow:
- Unfiltered background scanning — `startScan()` without a `withServices` filter is silently ignored in the background
- Full BLE operations if the app is terminated (not just backgrounded)

```dart
// iOS background scanning — the withServices filter is not optional
await FlutterBluePlus.startScan(
  withServices: [Guid('YOUR_SERVICE_UUID')],
);
```

If you omit the service UUID filter when backgrounded on iOS, no results are delivered and no error is thrown. This is one of the most common background BLE bugs and it fails completely silently.

### iOS State Restoration

For apps that need to reconnect to known devices even after being terminated by the OS, iOS offers Core Bluetooth state restoration — where iOS can relaunch your app in the background to handle a Bluetooth event. This requires native iOS code and goes beyond what flutter_blue_plus configures for you out of the box.

> **This is one of the areas the BLE Flutter Course covers in depth** — including how to implement state restoration, what iOS's background execution time limits are, and how to structure a Flutter app that handles the full iOS BLE lifecycle correctly.
> **[See the full course curriculum →](https://blefluttercourse.com)**

---

## Android: Foreground Service

Android allows significantly more background BLE activity than iOS, but to keep your process alive when backgrounded, you need a **Foreground Service** — which means a persistent notification that the user can see.

Without a foreground service, Android will eventually kill your app's process in the background to reclaim memory, dropping your BLE connection with it.

### The Manifest Setup

```xml
<!-- In AndroidManifest.xml -->
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />

<!-- Android 14+ requires this specific type for BLE services -->
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_CONNECTED_DEVICE" />
```

```xml
<!-- Inside your <application> tag -->
<service
  android:name="com.yourapp.BleService"
  android:foregroundServiceType="connectedDevice"
  android:exported="false" />
```

> **Android 14 gotcha:** If you declare a foreground service without `foregroundServiceType="connectedDevice"`, it will be rejected at runtime on Android 14+ devices. This is a recent change that breaks apps that haven't updated their manifests.

### What the Service Needs to Do

The foreground service needs to:

1. Show a persistent notification (required by Android — not optional)
2. Keep the BLE connection alive
3. Handle reconnection if the connection drops
4. Communicate back to your Flutter UI

The `flutter_foreground_task` package is the most common way to manage this from Dart. The setup involves configuring the notification, writing a task handler class, and wiring it to your BLE logic — but the details of doing this cleanly in a Flutter architecture take real care to get right.

### Android Background Scanning Restrictions

Android has tightened background scan limits significantly over the years. Without a foreground service running, background scan results are throttled heavily — on modern Android, you may receive only a handful of results before the OS stops delivering them. With a foreground service, scanning behaves normally.

If background scanning is part of your use case (finding and connecting to new devices while backgrounded), you need the foreground service approach. See the [Flutter BLE Scanning Guide](https://blog.blefluttercourse.com/blog/flutter-ble-scanning-guide) for scan mode options.

---

## Testing Background Behaviour

**iOS:** Connect to your device, press Home (don't swipe the app away), and verify the connection persists by checking your peripheral's indicators. Test on a real device — the iOS simulator doesn't accurately replicate background BLE behaviour.

**Android:** Start the foreground service, connect, then lock the screen or press Home. Check Android Studio's Logcat for BLE events from your service. Watch for battery-saver modes on aggressive OEMs (Samsung, Xiaomi, Huawei) that can kill foreground services despite the OS documentation saying otherwise.

---

## What Most Apps Actually Need

If your use case is "stay connected while the user's phone is in their pocket," you need:

- **iOS:** The `bluetooth-central` background mode in Info.plist — this is often enough
- **Android:** A foreground service with a notification

If your use case is "automatically find and connect to a device in the background," the complexity goes up significantly on both platforms, and the constraints become more relevant.

> The BLE Flutter Course covers the complete background BLE implementation for both platforms — including state restoration on iOS, foreground service architecture in Flutter, and how to handle the edge cases that show up in production.
> **[Explore the course →](https://blefluttercourse.com)**

---

## Related Guides

- 🔒 **[Flutter BLE Permissions: Android & iOS](https://blog.blefluttercourse.com/blog/flutter-ble-permissions-android-ios)** — Full permissions setup needed alongside background mode
- 🔍 **[Flutter BLE Scanning Guide](https://blog.blefluttercourse.com/blog/flutter-ble-scanning-guide)** — Scan modes and battery-efficient patterns
- 🔄 **[Flutter BLE Auto-Reconnect](https://blog.blefluttercourse.com/blog/flutter-ble-auto-reconnect)** — Handling disconnects that happen while backgrounded
- 🏗️ **[Build a Complete Flutter BLE App](https://blog.blefluttercourse.com/blog/build-complete-flutter-ble-app)** — Full app architecture

---

## Frequently Asked Questions

### Can flutter_blue_plus run in the background on its own?

No. flutter_blue_plus provides the BLE API but doesn't manage process lifecycle. On iOS you need to declare the background mode in Info.plist. On Android you need a Foreground Service. Without these, the OS suspends or kills your app when it backgrounds, dropping any BLE connections.

### Does iOS allow background BLE scanning without a service UUID filter?

No. Unfiltered background scans are silently ignored on iOS. You must pass a specific service UUID in `withServices` for scan results to be delivered in the background. This fails with no error, which is why it catches people off guard.

### My Android app's BLE connection drops in the background even with a foreground service. Why?

Most likely cause: aggressive battery optimisation on the device's OEM skin. Samsung, Xiaomi, and Huawei devices have their own battery management layers that can kill foreground services despite Android's guarantee that they should survive. Users may need to exclude your app from battery optimisation. This is a known pain point for background BLE on Android.

### Do I need special App Store approval for background BLE on iOS?

No special entitlement is required from Apple. The `bluetooth-central` UIBackgroundMode is a standard mode available to all apps. Apple reviewers will check that your stated purpose in `NSBluetoothAlwaysUsageDescription` is accurate and matches how your app actually uses Bluetooth.

---

## Summary

Background BLE in Flutter requires platform-specific configuration beyond flutter_blue_plus. On iOS, declare `bluetooth-central` and always use service UUID filters for background scanning. On Android, implement a Foreground Service — it's the only reliable way to maintain BLE operations when the app isn't in the foreground.

Both platforms have real constraints. Knowing what's possible — and what isn't — saves a lot of debugging time.

For a complete implementation guide including real-world edge cases and production architecture, the **[BLE Flutter Course](https://blefluttercourse.com/)** covers background BLE on both platforms with working code.

👉 **[Explore the BLE Flutter Course →](https://blefluttercourse.com/)**
