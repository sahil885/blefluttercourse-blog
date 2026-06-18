---
title: "Flutter BLE MTU Negotiation: Sending Large Data with flutter_blue_plus"
date: "2026-05-22"
excerpt: "Sending more than 20 bytes over BLE in Flutter? You'll hit MTU limits fast. Here's what MTU is, how to negotiate a larger one, and why large data transfers are more complex than they appear."
tags: ["Flutter", "BLE", "flutter_blue_plus", "MTU", "data transfer"]
---

> **TL;DR:** The default BLE MTU leaves you just 20 bytes of usable payload per write. On Android you can request a higher MTU with `device.requestMtu(512)`. On iOS it's negotiated automatically. For anything larger than one packet, you'll need to chunk your data — and the way you do that in production is more nuanced than most tutorials show.

# Flutter BLE MTU Negotiation: Sending Large Data with flutter_blue_plus

You get scanning working. You connect, read a sensor value, toggle an LED. Everything looks great — until you try to send something longer than a short string and the write silently fails, truncates, or throws a cryptic error.

The culprit is almost always MTU.

---

> **Free guide:** Struggling with dropped connections? Grab *The 7 BLE Mistakes That Make Flutter Apps Disconnect* — production-ready fixes you can apply today. [**Download the free guide →**](https://blog.blefluttercourse.com/free-guide)

## What MTU Is (and Why It Catches Everyone)

**MTU** (Maximum Transmission Unit) is the largest number of bytes that can travel in a single BLE packet. The default ATT MTU is 23 bytes — but 3 bytes are consumed by the protocol header, leaving you **20 bytes of usable payload**.

That's not much. A UUID string is 36 characters. A firmware chunk is thousands of bytes. Even a small JSON config can blow past 20 bytes.

What makes this especially tricky is the failure mode: on many devices, writing more than the MTU doesn't throw a clear exception. The data just gets silently **truncated**. Your write "succeeds," the peripheral receives 20 bytes, and you spend an hour wondering why your device isn't responding correctly.

---

## Negotiating a Larger MTU

### On Android

After connecting, you can explicitly request a higher MTU:

```dart
await device.connect(timeout: const Duration(seconds: 15));

// Request larger MTU — must happen after connect, before writing
await device.requestMtu(512);

// Check what was actually agreed
final mtu = await device.mtu.first;
print('Negotiated MTU: $mtu'); // May be less than 512
print('Usable payload: ${mtu - 3} bytes');
```

This is a *request*, not a guarantee. The peripheral responds with the MTU it supports, and both sides use the lower of the two values. If your ESP32 firmware only supports MTU 128, that's what you'll get regardless of what you request.

### On iOS

iOS negotiates MTU automatically — you have no control over the requested value. After connecting, just read what was agreed:

```dart
final mtu = await device.mtu.first;
// Typically 135–512 bytes depending on device and iOS version
```

> **Important:** Never hardcode `chunkSize = 20`. Always derive it from `await device.mtu.first - 3`. A device with a negotiated MTU of 247 bytes is unnecessarily slow if you're artificially limiting yourself to 20-byte chunks.

---

## Sending Data Larger Than the MTU

Once you've negotiated MTU, you have two options for sending data that's larger than one packet.

### Option 1: allowLongWrite

flutter_blue_plus has a built-in flag that uses the ATT Long Write procedure to split data automatically:

```dart
await characteristic.write(
  largeData,
  allowLongWrite: true,
  withoutResponse: false, // Required for allowLongWrite
);
```

This is the simplest approach and works for occasional large writes. The limitations: your peripheral firmware must support Prepare Write operations, there are no progress callbacks, and it can be slow for very large payloads.

### Option 2: Manual Chunking

For anything where you need progress feedback — firmware updates, file transfers, large config blobs — you'll want to split the data yourself:

```dart
final mtu = await device.mtu.first;
final chunkSize = mtu - 3;
int offset = 0;

while (offset < data.length) {
  final end = (offset + chunkSize).clamp(0, data.length);
  await characteristic.write(data.sublist(offset, end));
  offset = end;
  // Update a progress indicator here
}
```

This gives you full control: progress tracking, retry logic per chunk, variable chunk sizes, custom flow control.

---

## Where It Gets Complex

The basic chunking loop above works for small payloads on a reliable connection. In production, you'll quickly run into:

- **Flow control** — writing faster than the BLE connection can handle causes queue overflow and dropped packets, especially with `withoutResponse: true`
- **Error recovery** — what happens when a chunk fails halfway through a 200KB firmware upload?
- **Reassembly on the peripheral** — your firmware needs to reconstruct the original payload from chunks, handle out-of-order delivery, and validate the complete transfer
- **iOS vs Android throughput differences** — the same chunking code behaves very differently in terms of speed and reliability across platforms
- **MTU and notifications** — receiving large data *back* from a peripheral via notifications has its own chunking and reassembly problem

Handling all of this correctly — particularly for OTA firmware updates — is one of the more technically demanding parts of BLE development. It requires coordinating the Flutter side and the firmware side in ways that go well beyond the write loop.

> The BLE Flutter Course covers large data transfers end-to-end: MTU negotiation, chunked writes with flow control, OTA firmware updates on ESP32, and the firmware-side implementation that makes it work reliably.
> **[See what's covered in the course →](https://blefluttercourse.com)**

---

## Quick Reference: iOS vs Android

| | Android | iOS |
|---|---|---|
| Request MTU | `device.requestMtu(512)` | Not possible — auto only |
| Typical negotiated MTU | Up to 517 bytes | 135–512 bytes |
| `allowLongWrite` | ✅ Supported | ✅ Supported |
| Manual chunking | ✅ Works well | ✅ Works well |

---

## Related Guides

- 📖 **[Flutter BLE Read & Write Characteristics](https://blog.blefluttercourse.com/blog/flutter-ble-read-write-characteristics)** — Characteristic write operations
- 🔬 **[BLE GATT Profiles Explained](https://blog.blefluttercourse.com/blog/ble-gatt-profiles-explained)** — Understanding the protocol behind writes
- 🤖 **[ESP32 vs Arduino for Flutter BLE](https://blog.blefluttercourse.com/blog/esp32-vs-arduino-flutter-ble)** — Firmware side of the MTU equation
- 🏗️ **[Build a Complete Flutter BLE App](https://blog.blefluttercourse.com/blog/build-complete-flutter-ble-app)** — Full architecture including data handling

---

## Frequently Asked Questions

### Why is my write being silently truncated?

Because the data is larger than `MTU - 3` bytes and you're not using `allowLongWrite` or chunking. Call `await device.mtu.first` to check your current MTU, compare it to your data length, and add chunking if needed.

### I called requestMtu(512) but only got 247. Is that a problem?

Not necessarily — 247 bytes is a common negotiated MTU and gives you 244 bytes of usable payload per packet. That's a significant improvement over the default 20 bytes. If the peripheral only supports 247, there's nothing your Flutter code can do to increase it further.

### Can I use withoutResponse: true for faster transfers?

Yes, and it's significantly faster — but with no acknowledgement from the peripheral, dropped packets go undetected. Use `withoutResponse: true` for streaming data where occasional loss is acceptable (live readings). Use `withoutResponse: false` for anything where data integrity matters (firmware, config files).

### Does MTU affect notification payloads too?

Yes. Notifications sent by the peripheral are also limited to `MTU - 3` bytes. If your device sends large notifications, you'll need to handle reassembly in Flutter — accumulate chunks in a buffer until you've received the full payload.

---

## Summary

MTU is the most common surprise when moving beyond basic BLE operations. On Android, always call `requestMtu()` after connecting. On iOS, read the auto-negotiated value. Derive your chunk size from `mtu - 3` — never hardcode 20.

The basic chunking loop is straightforward. Building a robust large-data transfer system — with flow control, progress tracking, error recovery, and reliable OTA updates — is what the **[BLE Flutter Course](https://blefluttercourse.com/)** covers in depth.

👉 **[Explore the BLE Flutter Course →](https://blefluttercourse.com/)**
