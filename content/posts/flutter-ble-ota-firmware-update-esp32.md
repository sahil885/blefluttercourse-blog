---
title: "Flutter BLE OTA Firmware Update for ESP32: A Complete Developer Guide"
date: "2026-05-27"
excerpt: "Learn how to build a Flutter BLE OTA firmware update for ESP32 using flutter_blue_plus — chunked writes, MTU, progress tracking, and the right GATT architecture."
tags: ["Flutter", "BLE", "flutter_blue_plus", "ESP32", "OTA", "firmware update", "IoT"]
---

> **TL;DR:** OTA (Over-The-Air) firmware updates over BLE let your Flutter app push new firmware to an ESP32 wirelessly. The core idea: negotiate a good MTU, split the binary into chunks, write them sequentially to an OTA Data characteristic, and use a separate OTA Control characteristic to coordinate state. This article explains the architecture, shows you the Flutter-side approach with `flutter_blue_plus`, and highlights the pitfalls that will burn you if you're not careful.

---

## Why BLE OTA for ESP32 Matters

If you've ever shipped an ESP32-based IoT product to a customer — or even just deployed a device somewhere inconvenient — you already know the pain: a bug shows up in production, and your only option is to physically access the device, plug in a USB cable, and reflash it.

That's a non-starter the moment you have more than a handful of devices in the field.

BLE OTA (Over-The-Air) firmware updates solve this by letting your Flutter mobile app act as the update delivery mechanism. The user opens the app, the app downloads the new `.bin` file, connects to the ESP32 over BLE, and transfers the firmware wirelessly. The ESP32 validates and applies the update, then reboots into the new firmware — all without a cable in sight.

This sounds straightforward. In practice, it's one of the trickier BLE workflows to implement correctly because it sits at the intersection of several moving parts: BLE MTU limits, write-without-response vs write-with-response, ESP32 partition table configuration, and robust error handling on both sides of the connection.

Let's break it down layer by layer.

---

## The GATT Architecture You Need

Before writing a single line of Flutter code, you need to understand the BLE service structure your ESP32 firmware needs to expose. A typical custom OTA service looks like this:

**OTA Service** (custom 128-bit UUID, e.g. `fb1e4001-54ae-4a28-9f74-dfccb248601d`)

- **OTA Control Characteristic** (e.g. `fb1e4002-54ae-4a28-9f74-dfccb248601d`)
  - Properties: Write, Notify
  - Purpose: App writes commands (`0x01` = start OTA, `0x04` = end OTA); ESP32 notifies status back
  
- **OTA Data Characteristic** (e.g. `fb1e4003-54ae-4a28-9f74-dfccb248601d`)
  - Properties: Write Without Response (or Write)
  - Purpose: App streams firmware binary chunks here

The separation between Control and Data is important. The Control characteristic is the handshake channel — you tell the ESP32 "I'm about to send firmware", it prepares the OTA partition, then tells you "ready". Only then do you start writing data chunks. When you're done, you write an "end" command to Control and the ESP32 validates the binary and reboots.

> **Note:** The exact UUIDs don't matter — what matters is that your Flutter app and your ESP32 firmware agree on them. Use a UUID generator (e.g. `python3 -c "import uuid; print(uuid.uuid4())"`) and hardcode them in both places.

---

## The Flutter Side: flutter_blue_plus Approach

Assuming you've already connected to the device and discovered services (see our guide on [reading and writing BLE characteristics in Flutter](https://blog.blefluttercourse.com/blog/flutter-ble-read-write-characteristics)), here's the high-level flow your Flutter code needs to execute.

### Step 1 — Negotiate MTU First

This is the most commonly skipped step, and it causes mysterious failures. BLE's default ATT MTU is 23 bytes, giving you only 20 bytes of usable payload per write. For a firmware binary that might be 500KB–2MB, that's an enormous number of packets and extremely slow transfer.

Before doing anything OTA-related, request a larger MTU:

```dart
// Request MTU — do this after connect, before OTA starts
final mtu = await device.requestMtu(512);
debugPrint('Negotiated MTU: $mtu');
// Effective payload = mtu - 3 bytes ATT overhead
final chunkSize = mtu - 3;
```

iOS handles MTU negotiation slightly differently (it negotiates automatically when you call `requestMtu`, but the final value is OS-controlled). Android gives you more explicit control. In practice, plan for chunk sizes in the 244–509 byte range on modern hardware — but always use the returned value, not an assumption.

For a deeper dive into this, see our post on [MTU negotiation and large data transfer in flutter_blue_plus](https://blog.blefluttercourse.com/blog/flutter-ble-mtu-negotiation-large-data-transfer).

### Step 2 — Set Up Notifications on the Control Characteristic

You need to listen for status notifications from the ESP32 before you start writing:

```dart
// Enable notifications on the OTA Control characteristic
await otaControlChar.setNotifyValue(true);

// Listen to notifications
final sub = otaControlChar.onValueReceived.listen((value) {
  debugPrint('OTA Control notification: $value');
  // Handle ESP32 status codes here
  // e.g. [0x01] = ready, [0x02] = error, [0x03] = done
});
```

This is the feedback loop. When you write "start OTA" to the control characteristic, the ESP32 should notify back that it's prepared its OTA partition and is ready to receive data. Without this handshake, you risk writing data before the ESP32 has erased and prepared its flash partition — which will silently corrupt the update.

### Step 3 — Send the Start Command

```dart
// Command byte 0x01 = initiate OTA
await otaControlChar.write([0x01], withoutResponse: false);

// Wait for the "ready" notification from ESP32
// (use a Completer or StreamSubscription to await this)
```

### Step 4 — Stream Firmware Chunks to the Data Characteristic

This is where the heavy lifting happens. You load the firmware binary (from local storage or a URL), split it into chunks matching your negotiated MTU, and write them sequentially:

```dart
final firmwareBytes = await File(firmwarePath).readAsBytes();
final totalChunks = (firmwareBytes.length / chunkSize).ceil();

for (int i = 0; i < totalChunks; i++) {
  final start = i * chunkSize;
  final end = (start + chunkSize).clamp(0, firmwareBytes.length);
  final chunk = firmwareBytes.sublist(start, end);

  // Write Without Response is faster but less reliable on congested links
  await otaDataChar.write(chunk, withoutResponse: true);

  // Report progress
  final progress = ((i + 1) / totalChunks * 100).round();
  onProgress(progress); // e.g. update a StreamController<int>
  
  // Optional small delay to avoid overwhelming the BLE stack
  // await Future.delayed(const Duration(milliseconds: 10));
}
```

A few critical details here:
- **Write Without Response** is faster (no ACK round-trip per packet) but you can lose packets on congested links or weak RSSI. For robust implementations, you need flow control or to switch to Write With Response and accept the slower speed.
- The chunk loop needs proper error handling — if any write fails, you should send an abort command to the control characteristic and restart cleanly.
- iOS has a hidden "write queue depth" limit. Blasting writes without any back-pressure will cause the OS to queue packets and eventually drop them silently. Production implementations add back-pressure logic here.

### Step 5 — Send the End Command and Wait for Reboot

```dart
// Signal end of transfer
await otaControlChar.write([0x04], withoutResponse: false);

// ESP32 will validate the firmware, then notify status
// On success, it will reboot — the BLE connection will drop
// Listen for device disconnect as your confirmation signal
```

> 🚀 **Want the complete, production-hardened implementation?** The code above shows the core concept — but a real OTA system needs write throttling, checksum verification, automatic retry on failure, connection drop recovery, and a proper state machine on both the Flutter and ESP32 sides. [The BLE Flutter Course](https://blefluttercourse.com/) covers the full end-to-end OTA system, including the ESP32 Arduino/IDF firmware and the complete Flutter implementation with progress UI.

---

## The ESP32 Side: What Your Firmware Must Do

On the ESP32, you need to implement a custom GATT server that:

1. Exposes the OTA Service with the Control and Data characteristics
2. On receiving "start OTA" on the Control characteristic, calls `esp_ota_begin()` (ESP-IDF) or the equivalent to prepare the OTA partition
3. Accumulates incoming data chunks and writes them to the OTA partition via `esp_ota_write()`
4. On receiving "end OTA", calls `esp_ota_end()` and `esp_ota_set_boot_partition()`, then reboots

The ESP32's dual-partition OTA scheme means it alternates between two firmware slots (ota_0 and ota_1). Your `partitions.csv` needs at minimum:

```
# Name,   Type, SubType, Offset,   Size
nvs,      data, nvs,     0x9000,   0x5000
otadata,  data, ota,     0xe000,   0x2000
app0,     app,  ota_0,   0x10000,  0x140000
app1,     app,  ota_1,   0x150000, 0x140000
```

Each OTA partition needs to be large enough for your firmware binary. If you're using the Arduino IDE, the "Minimal SPIFFS" or "Default 4MB with spiffs" partition scheme already supports OTA.

---

## Platform Differences: iOS vs Android

BLE OTA behaves differently on the two platforms in ways that will surprise you if you're not prepared.

**Android** gives you direct MTU control and generally allows higher write throughput. The main gotcha is that `writeCharacteristic` on older Android versions (API < 33) is not safe to call concurrently — you must wait for each write to complete before issuing the next. `flutter_blue_plus` handles much of this, but your chunk loop needs to properly `await` each write.

**iOS** controls MTU negotiation at the OS level — you can request 512 bytes but the OS may grant less (typically 185 bytes for older hardware, up to 517 bytes on iOS 15+ with compatible peripherals). More critically, iOS will throttle write-without-response calls if you exceed the in-flight packet limit. If your OTA transfer stalls or hangs on iOS but works fine on Android, write throttling is almost certainly the culprit.

Both platforms will disconnect the device when the ESP32 reboots at the end of OTA. Make sure your Flutter app handles the disconnect gracefully — ideally by automatically attempting to reconnect and verify the new firmware version. See our guide on [Flutter BLE auto-reconnect](https://blog.blefluttercourse.com/blog/flutter-ble-auto-reconnect) for reconnection patterns.

---

## Common Pitfalls and Gotchas

**1. Not waiting for the "ready" notification before sending data**
The most common failure mode. Write data before the ESP32 has prepared its OTA partition, and you'll get silent corruption or a failed OTA with no clear error.

**2. Assuming the chunk size is fixed**
Always derive chunk size from the negotiated MTU at runtime. Hardcoding 20 bytes will work but is extremely slow (hours for a 1MB binary). Hardcoding 512 bytes without checking the negotiated MTU will cause writes to be silently truncated on iOS.

**3. No checksum validation**
The BLE transport itself doesn't guarantee data integrity beyond individual packet checksums. A comprehensive OTA system computes a CRC32 or SHA256 of the firmware binary in Flutter, sends it alongside the data, and verifies it on the ESP32 before calling `esp_ota_end()`.

**4. No fallback partition**
If your new firmware is buggy and crashes on boot, you need the ESP32 to roll back to the previous firmware. ESP-IDF supports this with `esp_ota_mark_app_valid_cancel_rollback()` — your app firmware should call this on successful startup to "commit" the new firmware. If it crashes before calling this, the bootloader rolls back automatically.

**5. Forgetting to unsubscribe from notifications after OTA**
The device will reboot and disconnect. Cancel your notification subscriptions before or immediately after sending the end command, otherwise you'll get stream errors propagating through your app.

**6. iOS background mode**
OTA updates can take several minutes. If the user backgrounds the app mid-transfer on iOS, the BLE connection will be suspended. You'll need to use BLE background mode entitlements and handle `willRestoreState` to resume gracefully. See our guide on [Flutter BLE background mode](https://blog.blefluttercourse.com/blog/flutter-ble-background-mode-ios-android).

---

## Related Guides

These posts are essential reading if you're building a full OTA system:

- [Getting Started with BLE in Flutter](https://blog.blefluttercourse.com/blog/getting-started-ble-flutter) — fundamentals before diving into OTA
- [MTU Negotiation and Large Data Transfer in Flutter BLE](https://blog.blefluttercourse.com/blog/flutter-ble-mtu-negotiation-large-data-transfer) — critical prerequisite for OTA
- [Flutter BLE Auto-Reconnect](https://blog.blefluttercourse.com/blog/flutter-ble-auto-reconnect) — handle the post-OTA reboot disconnect
- [Reading and Writing BLE Characteristics in Flutter](https://blog.blefluttercourse.com/blog/flutter-ble-read-write-characteristics) — the write mechanics OTA depends on
- [BLE Background Mode: iOS and Android](https://blog.blefluttercourse.com/blog/flutter-ble-background-mode-ios-android) — keep OTA alive when the user backgrounds your app
- [BLE GATT Profiles Explained](https://blog.blefluttercourse.com/blog/ble-gatt-profiles-explained) — understand the service/characteristic architecture
- [ESP32 vs Arduino for Flutter BLE Projects](https://blog.blefluttercourse.com/blog/esp32-vs-arduino-flutter-ble) — choosing the right hardware platform

---

## FAQ

**Q: Can I use the `flutter_ota` package instead of building this from scratch?**

Yes. The `flutter_ota` package on pub.dev wraps much of this logic and is designed specifically for ESP32 NimBLE-based OTA. It's a reasonable starting point for prototyping. However, it has limited customisation options, and if your ESP32 firmware uses a different GATT service structure or OTA protocol, you'll need to build your own implementation on top of `flutter_blue_plus` directly. Understanding the underlying mechanics (as covered in this article) is essential before using any wrapper package.

**Q: How long does a BLE OTA update take?**

It depends on firmware size, negotiated MTU, and write mode. With a 512-byte effective MTU and write-without-response, a 1MB firmware can transfer in 2–5 minutes on Android. On iOS with a lower MTU and necessary throttling, the same transfer can take 8–15 minutes. Optimising this requires careful profiling on both platforms.

**Q: What happens if the BLE connection drops mid-OTA?**

Without recovery logic, a dropped connection mid-OTA leaves the ESP32 in an incomplete state. The OTA partition will be invalid and `esp_ota_end()` will fail. Good implementations track the last successfully written byte offset and support resuming from where they left off — though this requires ESP32 firmware support as well. At minimum, always implement a "cancel OTA" command that instructs the ESP32 to abandon the update and remain on the current firmware.

**Q: Do I need a custom ESP32 firmware or can I use an off-the-shelf one?**

For custom GATT-based OTA as described in this article, you need a compatible ESP32 firmware that implements the OTA GATT service. Nordic's DFU protocol (used with nRF devices) is a different, standardised approach — not applicable here. If your hardware team controls the ESP32 firmware, this gives you full flexibility. If you're working with third-party hardware, check what OTA protocol it implements and build your Flutter side to match.

**Q: How do I verify the firmware version after OTA?**

Expose a "firmware version" characteristic on the ESP32 (commonly under the standard Device Information Service, characteristic UUID `0x2A26` for Firmware Revision String). After reconnecting post-reboot, read this characteristic and compare it to the version you just flashed. If they match, OTA succeeded.

---

## Summary

Flutter BLE OTA firmware updates for ESP32 are entirely achievable, but they require careful attention to the full stack: GATT service design, MTU negotiation, chunked writes with proper flow control, checksum validation, and graceful handling of the post-OTA disconnect and reboot cycle. Platform differences between iOS and Android add another layer of complexity that surprises most developers the first time they test on both.

The concepts covered here will get you started with a working prototype. But shipping OTA updates in a production product — with retry logic, rollback support, background mode handling, and a reliable state machine on both sides — is a substantially deeper challenge.

If you're building a real Flutter + ESP32 product and want to get OTA right from day one, [the BLE Flutter Course](https://blefluttercourse.com/) walks you through the complete production implementation: ESP32 firmware, Flutter app architecture, OTA state machine, and the edge cases that will bite you in production. Join hundreds of developers who've shipped BLE-enabled Flutter apps with confidence.
