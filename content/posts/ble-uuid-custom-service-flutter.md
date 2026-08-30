---
title: "BLE UUIDs in Flutter: Custom Services, 16-bit vs 128-bit, and the Guid Class Explained"
date: "2026-08-30"
excerpt: "Understand BLE UUIDs in Flutter: how 16-bit and 128-bit UUIDs relate, how to design custom service UUIDs, and how flutter_blue_plus handles Guid matching."
tags: ["Flutter", "BLE", "flutter_blue_plus", "UUID", "GATT", "Custom Service"]
---

> **TL;DR:** Every BLE service and characteristic is identified by a 128-bit UUID. Standard Bluetooth SIG profiles use a 16-bit shorthand that expands into a fixed base UUID; your own hardware uses fully random 128-bit UUIDs. In `flutter_blue_plus`, mismatches between the 16-bit and 128-bit forms — plus uppercase strings — are the number one reason `discoverServices()` "can't find" a service that is clearly there.

If you have ever connected to a BLE peripheral in Flutter, iterated the result of `discoverServices()`, and found that the service you *know* is on the device simply isn't in the list — or is there under a UUID you don't recognise — you have run into the UUID matching problem. It is one of the most common and most confusing issues in BLE development, and it trips up beginners and experienced developers alike.

The confusion comes from a single design decision baked into the Bluetooth spec: services can be identified by either a short 16-bit UUID or a full 128-bit UUID, and the two are actually the *same value* viewed at different zoom levels. Once you internalise how that relationship works, a whole category of "why can't I find my service" bugs disappears. This guide walks through exactly how BLE UUIDs work, how to design UUIDs for your own custom hardware, and how `flutter_blue_plus` represents and compares them with its `Guid` class.

## What a BLE UUID actually is

A UUID (Universally Unique Identifier) is a 128-bit number — 16 bytes — used to name things in the BLE world so that two unrelated devices don't accidentally use the same identifier for different purposes. In BLE, UUIDs name three kinds of things: **services** (a logical group of related data, like "Heart Rate"), **characteristics** (an individual data point inside a service, like "Heart Rate Measurement"), and **descriptors** (metadata attached to a characteristic).

The full 128-bit form is written as eight groups of hex digits:

```
0000180d-0000-1000-8000-00805f9b34fb
```

That specific value is the Heart Rate service. But you will almost always see it written as `0x180D`. That short form is not a different UUID — it is the same UUID, compressed.

## The 16-bit shorthand and the Bluetooth Base UUID

The Bluetooth SIG reserves a range of UUIDs for standardised profiles: Battery Service, Device Information, Heart Rate, and so on. Rather than force everyone to type 32 hex characters for these common services, the spec defines a **Bluetooth Base UUID**:

```
0000xxxx-0000-1000-8000-00805f9b34fb
```

Any 16-bit UUID is expanded into a full 128-bit UUID by slotting its four hex digits into the `xxxx` position of that base pattern. So:

- `0x180D` (Heart Rate) becomes `0000180d-0000-1000-8000-00805f9b34fb`
- `0x180F` (Battery) becomes `0000180f-0000-1000-8000-00805f9b34fb`
- `0x2A37` (Heart Rate Measurement characteristic) becomes `00002a37-0000-1000-8000-00805f9b34fb`

This is the crux of the matching problem. A peripheral might advertise or expose a service as `180F`, but internally your Flutter plugin, or the underlying OS, may hand it back to you as the fully expanded 128-bit string — or vice versa. If your comparison logic does a naive string equality check between `"180f"` and `"0000180f-0000-1000-8000-00805f9b34fb"`, it fails, even though both refer to the identical service.

```dart
// These two describe the SAME service.
final short = Guid('180F');
final long  = Guid('0000180f-0000-1000-8000-00805f9b34fb');
// A robust comparison must treat them as equal.
```

The `Guid` class in `flutter_blue_plus` exists precisely to normalise this. When you construct a `Guid` from a 16-bit string, it expands it against the base UUID so equality checks behave correctly. The lesson: **compare `Guid` objects, not raw strings.**

## Designing UUIDs for your own custom hardware

The 16-bit space belongs to the Bluetooth SIG. You do **not** get to invent your own 16-bit UUIDs — that range is reserved, and picking a value out of it risks colliding with a standard profile and confusing every BLE stack on the planet. When you build your own peripheral (an ESP32, an nRF chip, a custom sensor), your services and characteristics must use **fully random 128-bit UUIDs**.

Generate them with any UUID v4 tool — `uuidgen` on the command line, an online generator, or a one-liner in Dart or Python. A good practice is to pick one random base for your product and then vary a couple of bytes per characteristic, so your whole GATT profile reads as a coherent family:

```
Service:          6e400001-b5a3-f393-e0a9-e50e24dcca9e
TX characteristic: 6e400002-b5a3-f393-e0a9-e50e24dcca9e
RX characteristic: 6e400003-b5a3-f393-e0a9-e50e24dcca9e
```

(That example is Nordic's UART service — a widely-copied pattern.) The exact same 128-bit string must be flashed into your firmware's GATT table and used in your Flutter app. There is no expansion or shorthand for custom UUIDs; what the firmware declares is what Flutter must match, character for character.

> **Building real hardware and a real app together?** Designing a clean custom GATT profile, wiring it into firmware, and matching it reliably from Flutter across both platforms is exactly the kind of end-to-end workflow the [BLE Flutter Course](https://blefluttercourse.com/) walks you through — with the complete, production-tested implementation rather than isolated snippets.

## Finding and filtering by UUID in flutter_blue_plus

There are two places UUIDs show up in a typical Flutter BLE flow: **scanning** (filtering advertisements) and **discovery** (walking the GATT table after connecting).

To scan only for devices advertising a particular service, pass a `Guid` list to `withServices`:

```dart
FlutterBluePlus.startScan(
  withServices: [Guid('180D')], // only Heart Rate peripherals
  timeout: const Duration(seconds: 10),
);
```

An important caveat: this filter only works if the peripheral actually puts that service UUID in its **advertising packet** (the "complete list of service UUIDs" field). Many custom devices advertise a name but not their service UUIDs, in which case a service filter returns nothing. If your filtered scan comes up empty, scan without the filter first and inspect what the device actually advertises. Our [BLE scanning guide](https://blog.blefluttercourse.com/blog/flutter-ble-scanning-guide) covers advertisement data in depth.

After connecting, discover the GATT table and match by `Guid`:

```dart
final services = await device.discoverServices();
for (final service in services) {
  if (service.uuid == Guid('6e400001-b5a3-f393-e0a9-e50e24dcca9e')) {
    for (final c in service.characteristics) {
      // match your characteristic Guids here
    }
  }
}
```

Remember that `discoverServices()` must be called **after every connection** (and reconnection) — the results are not cached across connections. From there you can read, write, and subscribe; see [reading and writing characteristics](https://blog.blefluttercourse.com/blog/flutter-ble-read-write-characteristics) for the next step.

## Common pitfalls and gotchas

**Uppercase UUID strings.** This is the classic silent failure. Several BLE stacks — including the Flutter plugins — expect lowercase hex. A `Guid` built from `"6E400001-..."` may not match a service the OS reports in lowercase. **Always store and compare your UUIDs in lowercase.**

**Comparing raw strings instead of `Guid` objects.** `"180f" != "0000180f-0000-1000-8000-00805f9b34fb"` as strings, but the two `Guid`s are equal. Never hand-roll string equality for UUIDs — construct `Guid`s and compare those.

**Assuming the short form for custom services.** Only Bluetooth SIG–assigned UUIDs have a 16-bit shorthand. Your custom `6e40...` service has no short form; trying to abbreviate it will never match.

**Filtering a scan on a service the device doesn't advertise.** The GATT table can contain a service that the advertising packet never mentions. Scan filters operate on the advertisement, not the GATT table, so a service that's only discoverable after connection can't be used as a scan filter.

**iOS vs Android reporting differences.** iOS (CoreBluetooth) and Android sometimes hand back standard UUIDs in different forms — one expanded, one short. Because you're comparing normalised `Guid`s, this is a non-issue *if* you follow the rules above; if you're string-matching, it will manifest as "works on Android, fails on iOS." Platform-permission differences matter too — see [BLE permissions on Android and iOS](https://blog.blefluttercourse.com/blog/flutter-ble-permissions-android-ios).

## Related Guides

- [GATT profiles explained](https://blog.blefluttercourse.com/blog/ble-gatt-profiles-explained)
- [Flutter BLE scanning guide](https://blog.blefluttercourse.com/blog/flutter-ble-scanning-guide)
- [Reading and writing BLE characteristics in Flutter](https://blog.blefluttercourse.com/blog/flutter-ble-read-write-characteristics)
- [Build a complete Flutter BLE app](https://blog.blefluttercourse.com/blog/build-complete-flutter-ble-app)
- [Getting started with BLE in Flutter](https://blog.blefluttercourse.com/blog/getting-started-ble-flutter)
- [ESP32 vs Arduino for Flutter BLE](https://blog.blefluttercourse.com/blog/esp32-vs-arduino-flutter-ble)

## FAQ

**What's the difference between a 16-bit and a 128-bit BLE UUID?**
They're two representations of the same idea. A 16-bit UUID is a shorthand reserved for Bluetooth SIG–standardised profiles; it expands into a full 128-bit UUID by inserting its four hex digits into the Bluetooth Base UUID (`0000xxxx-0000-1000-8000-00805f9b34fb`). Custom devices must use full random 128-bit UUIDs with no short form.

**Why can't flutter_blue_plus find my service after connecting?**
The three usual causes are: an uppercase UUID string (use lowercase), comparing raw strings instead of `Guid` objects, or the service genuinely not being present because you're matching the wrong UUID. Print out every `service.uuid` from `discoverServices()` and compare against what your firmware declares.

**Can I make up my own 16-bit UUID for my custom sensor?**
No. The 16-bit range is reserved by the Bluetooth SIG. Generate a random 128-bit UUID (UUID v4) instead, and use the identical string in both firmware and your Flutter app.

**Do I need to call discoverServices() every time I connect?**
Yes. GATT discovery results are tied to a connection and are not cached across reconnections. Call `discoverServices()` after every successful connect before you try to read, write, or subscribe.

**How do I filter a scan by a custom service UUID?**
Pass the service `Guid` to `withServices` in `startScan` — but this only works if the peripheral includes that UUID in its advertising packet. If it doesn't advertise the UUID, you must connect first and match during discovery.

## Summary

BLE UUIDs feel fiddly until the model clicks: one 128-bit number underneath, a 16-bit convenience form on top for standard profiles, and fully random 128-bit values for anything you build yourself. Keep every UUID lowercase, always compare `Guid` objects rather than strings, remember that scan filters read the advertisement while discovery reads the GATT table, and re-run `discoverServices()` on each connection. Do those five things and the "my service disappeared" bug stops happening.

When you're ready to design a custom GATT profile end-to-end — firmware and Flutter app matched, tested, and production-ready — the [BLE Flutter Course](https://blefluttercourse.com/) gives you the complete implementation, not just the concepts.
