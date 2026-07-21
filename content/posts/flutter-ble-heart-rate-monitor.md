---
title: "Flutter BLE Heart Rate Monitor: Reading the 0x180D Service with flutter_blue_plus"
date: "2026-07-21"
excerpt: "Build a Flutter BLE heart rate monitor with flutter_blue_plus. Parse the 0x180D service, decode flags, RR-intervals and sensor contact correctly."
tags: ["Flutter", "BLE", "flutter_blue_plus", "Heart Rate", "GATT", "HRV"]
---

> **TL;DR:** The Heart Rate Service (`0x180D`) is a standardised SIG profile, so any compliant chest strap works with the same code. The catch is the Heart Rate Measurement characteristic (`0x2A37`) has a *variable-length* payload — the BPM can be 8 or 16 bits, and Energy Expended and RR-intervals appear only in some packets. Parse it with a moving offset, never fixed indices.

Most Flutter developers building their first heart rate app do the same thing: they subscribe to `0x2A37`, read `value[1]`, and ship it. It works perfectly on their test strap. Then a user with a different brand reports readings of 3 BPM, or the numbers randomly jump to nonsense during a workout.

The bug is almost never the BLE stack. It's that the Heart Rate Measurement characteristic isn't a fixed struct — it's a self-describing packet whose layout changes from notification to notification. A strap that sends Energy Expended every 10th packet will shift every field after it by two bytes in those packets only. If you hardcoded offsets, one in ten readings is garbage.

The good news: because heart rate is a Bluetooth SIG *adopted* profile, you don't need per-vendor reverse engineering. Get the parser right once and Polar, Garmin, Wahoo, Coospo, and every generic strap on AliExpress all work. This guide covers the service structure, the exact flags layout, and the parsing pattern that survives real hardware.

## The Heart Rate Service structure

The service is compact — one mandatory characteristic and two optional ones.

| UUID | Name | Properties | Required |
|---|---|---|---|
| `0x180D` | Heart Rate Service | — | — |
| `0x2A37` | Heart Rate Measurement | Notify | Mandatory |
| `0x2A38` | Body Sensor Location | Read | Optional |
| `0x2A39` | Heart Rate Control Point | Write | Optional |

A few things worth internalising:

**`0x2A37` is notify-only.** There is no read property. If you try to `read()` it you'll get a GATT error. Heart rate is a stream, not a value you poll — the strap pushes roughly one notification per second.

**Short UUIDs are shorthand.** `0x180D` is really `0000180d-0000-1000-8000-00805f9b34fb`. flutter_blue_plus lets you write `Guid("180D")` and expands it for you, but if you're comparing UUIDs manually, normalise case and length first. This trips people up constantly — see our guide on [BLE GATT profiles explained](https://blog.blefluttercourse.com/blog/ble-gatt-profiles-explained) for how the 16-bit/128-bit relationship works.

**`0x2A39` exists to reset Energy Expended.** Write a single byte `0x01` to it and the strap zeroes its accumulated energy counter. That's its only defined use.

## Scanning for heart rate straps

Filter by service UUID at scan time rather than connecting to everything and checking afterwards. It's dramatically more power-efficient and, on iOS, it's effectively required if you ever want background scanning to work.

```dart
import 'package:flutter_blue_plus/flutter_blue_plus.dart';

final hrService = Guid("180D");

Future<void> scanForStraps() async {
  await FlutterBluePlus.adapterState
      .where((s) => s == BluetoothAdapterState.on)
      .first;

  await FlutterBluePlus.startScan(
    withServices: [hrService],
    timeout: const Duration(seconds: 15),
  );
}

// Listen separately so you don't rebuild the stream on every scan.
final sub = FlutterBluePlus.onScanResults.listen((results) {
  for (final r in results) {
    debugPrint('${r.device.platformName} rssi=${r.rssi}');
  }
});
```

One caveat: `withServices` only matches UUIDs present in the *advertisement* packet. A minority of straps advertise a bare name and only expose `0x180D` in the scan response, so they won't appear. If a device is visible in nRF Connect but not your filtered scan, that's the reason — drop the filter to confirm. Our [Flutter BLE scanning guide](https://blog.blefluttercourse.com/blog/flutter-ble-scanning-guide) covers the filtering trade-offs in depth, and you'll want [runtime permissions](https://blog.blefluttercourse.com/blog/flutter-ble-permissions-android-ios) sorted first or the scan silently returns nothing on Android 12+.

## Subscribing to measurements

Connect, discover, find the characteristic, enable notifications. The order matters — `setNotifyValue` before service discovery completes will throw.

```dart
Future<StreamSubscription<List<int>>> subscribe(BluetoothDevice device) async {
  await device.connect();
  final services = await device.discoverServices();

  final service = services.firstWhere((s) => s.uuid == hrService);
  final hrm = service.characteristics
      .firstWhere((c) => c.uuid == Guid("2A37"));

  final sub = hrm.onValueReceived.listen((value) {
    final reading = parseHeartRate(value);
    debugPrint('${reading.bpm} bpm');
  });

  // Auto-cancels on disconnect — prevents duplicate listeners on reconnect.
  device.cancelWhenDisconnected(sub);

  await hrm.setNotifyValue(true);
  return sub;
}
```

`cancelWhenDisconnected` is the line people skip and then spend an afternoon debugging. Without it, every reconnect stacks another listener on the same characteristic, and by the fourth reconnect your UI updates four times per notification. If your straps drop out mid-session — and they will, sweat degrades signal quality noticeably — pair this with a proper [auto-reconnect strategy](https://blog.blefluttercourse.com/blog/flutter-ble-auto-reconnect).

## Decoding the flags byte

This is where the real work is. Byte 0 is always the flags field:

| Bit | Meaning |
|---|---|
| 0 | Value format: `0` = UINT8 BPM, `1` = UINT16 BPM |
| 1 | Sensor contact detected |
| 2 | Sensor contact *supported* |
| 3 | Energy Expended field present |
| 4 | RR-interval field(s) present |
| 5–7 | Reserved |

Bits 1 and 2 are a pair, and reading bit 1 alone is a classic mistake. If bit 2 is `0`, the sensor doesn't support contact detection at all and bit 1 is meaningless — but it will still read as `0`, so a naive check reports "strap not touching skin" forever on hardware that simply never implemented the feature. Only trust bit 1 when bit 2 is set.

```dart
class HeartRateReading {
  final int bpm;
  final bool? contactDetected;   // null = not supported
  final int? energyExpendedKj;
  final List<double> rrIntervals; // seconds
  HeartRateReading(this.bpm, this.contactDetected,
      this.energyExpendedKj, this.rrIntervals);
}

HeartRateReading parseHeartRate(List<int> data) {
  final bytes = Uint8List.fromList(data);
  final bd = ByteData.sublistView(bytes);

  final flags = bytes[0];
  final is16Bit         = (flags & 0x01) != 0;
  final contactDetected = (flags & 0x02) != 0;
  final contactSupported= (flags & 0x04) != 0;
  final hasEnergy       = (flags & 0x08) != 0;
  final hasRr           = (flags & 0x10) != 0;

  var offset = 1; // walk forward — never hardcode indices

  final bpm = is16Bit
      ? bd.getUint16(offset, Endian.little)
      : bytes[offset];
  offset += is16Bit ? 2 : 1;

  int? energy;
  if (hasEnergy) {
    energy = bd.getUint16(offset, Endian.little);
    offset += 2;
  }

  final rr = <double>[];
  if (hasRr) {
    while (offset + 1 < bytes.length) {
      rr.add(bd.getUint16(offset, Endian.little) / 1024.0);
      offset += 2;
    }
  }

  return HeartRateReading(
    bpm,
    contactSupported ? contactDetected : null,
    energy,
    rr,
  );
}
```

Note the field order is fixed by the spec — flags, BPM, energy, RR — but each field's *presence* is conditional. That's exactly why the moving `offset` matters. All multi-byte fields are little-endian.

> **Want the production version?** The parser above is the core, but a shippable heart rate app needs a lot more: a reconnect state machine that survives backgrounding, RR-interval buffering for real HRV metrics (RMSSD, SDNN), dropped-packet detection, and a tested repository layer you can mock. The **[BLE Flutter Course](https://blefluttercourse.com/)** walks through the complete implementation, module by module, with the full source.

## RR-intervals and HRV

RR-intervals are the interesting part of the payload — they're the time between consecutive R-waves in the ECG, in units of 1/1024 second. Divide by 1024 to get seconds.

Three things that surprise people:

**You get a variable number per notification.** Zero, one, two, sometimes more. The strap batches whatever it measured since the last packet. A resting athlete at 45 BPM produces fewer R-waves per second than someone at 170 BPM, so packet contents vary with effort.

**You cannot derive them from BPM.** `60000 / bpm` gives you the *average* interval. HRV is defined by the *variation* between consecutive beats — averaging destroys the exact signal you're measuring. If your app claims to compute HRV from the BPM field, it isn't computing HRV.

**You must accumulate every interval.** Dropping a notification loses beats permanently. For anything clinical or training-adjacent, buffer all intervals into a continuous series and only then compute RMSSD or SDNN over a window.

Also worth knowing: at a 23-byte default ATT MTU, a packet with UINT8 BPM and no Energy Expended fits at most 9 RR-intervals. That's plenty for one-second notifications, but if you're building anything that batches, read up on [MTU negotiation](https://blog.blefluttercourse.com/blog/flutter-ble-mtu-negotiation-large-data-transfer).

## Body Sensor Location

Optional, readable, one byte, useful for UI polish:

```dart
const locations = ['Other', 'Chest', 'Wrist', 'Finger',
                   'Hand', 'Ear Lobe', 'Foot'];

final loc = service.characteristics
    .where((c) => c.uuid == Guid("2A38")).firstOrNull;
final name = loc == null
    ? 'Unknown'
    : locations[(await loc.read()).first];
```

Guard the index — a non-compliant device returning `9` will throw a range error.

## Common pitfalls

**Hardcoding `value[1]` as the BPM.** Correct only when bit 0 is clear. Straps that report above 255 BPM, or that simply choose UINT16 encoding, will break it — and some report UINT16 always.

**Assuming Energy Expended is in every packet.** It typically appears every few seconds, not every notification. Fixed offsets after it corrupt RR-intervals in exactly those packets, which is why the bug looks intermittent.

**Treating kilojoules as calories.** Energy Expended is kJ per the spec. Multiply by 0.239 for kcal.

**Not awaiting `setNotifyValue`.** It performs a real CCCD descriptor write. Fire-and-forget means you sometimes attach a listener to a characteristic that never got enabled — and it fails silently.

**Expecting a stable device ID on iOS.** iOS never exposes the MAC address; you get a system-generated UUID that differs across iPhones for the same strap. Persisting it to "remember my device" works per-install only. On Android you get the MAC and it's stable.

**Testing against a smartwatch.** Most consumer smartwatches deliberately don't expose `0x180D` to third-party apps, routing health data through proprietary services and their own SDK instead. Test with a dedicated chest strap; a watch that "doesn't work" is usually working as designed.

## Related guides

- [Getting started with BLE in Flutter](https://blog.blefluttercourse.com/blog/getting-started-ble-flutter)
- [BLE GATT profiles explained](https://blog.blefluttercourse.com/blog/ble-gatt-profiles-explained)
- [Notifications vs indications in Flutter BLE](https://blog.blefluttercourse.com/blog/flutter-ble-notifications-vs-indications)
- [Reading and writing characteristics](https://blog.blefluttercourse.com/blog/flutter-ble-read-write-characteristics)
- [Flutter BLE scanning guide](https://blog.blefluttercourse.com/blog/flutter-ble-scanning-guide)
- [BLE permissions on Android and iOS](https://blog.blefluttercourse.com/blog/flutter-ble-permissions-android-ios)
- [Debugging Flutter BLE with nRF Connect](https://blog.blefluttercourse.com/blog/debugging-flutter-ble-nrf-connect)
- [Build a complete Flutter BLE app](https://blog.blefluttercourse.com/blog/build-complete-flutter-ble-app)

## FAQ

**Do I need a different parser for each brand of heart rate strap?**
No. `0x180D` is a Bluetooth SIG adopted profile, so any compliant strap uses the identical packet format. One correct parser handles all of them. Vendor SDKs are only needed for proprietary extras like raw ECG or per-brand training metrics.

**Why does my heart rate read as 0 or a tiny number?**
Almost always a flags-byte bug — you're reading a byte that isn't the BPM. Check bit 0 to determine whether the value is 8 or 16 bits before reading it. A secondary cause is genuine loss of skin contact; check bits 1 and 2 together.

**Can I get RR-intervals from a smartwatch instead of a chest strap?**
Rarely. Most watches don't expose `0x180D` at all, and those that do usually omit RR-intervals. Optical wrist sensors are also less accurate beat-to-beat than an electrical chest strap, so HRV from a watch is unreliable even when available.

**Does heart rate monitoring work when the app is backgrounded?**
Yes, with platform configuration — a `bluetooth-central` background mode on iOS and a foreground service on Android. It is not automatic and both platforms will suspend your subscription otherwise. See our [BLE background mode guide](https://blog.blefluttercourse.com/blog/flutter-ble-background-mode-ios-android).

**How often do straps send notifications?**
Roughly once per second for most hardware, governed by the connection interval. You don't control it directly, and you shouldn't assume an exact cadence — timestamp readings on arrival rather than counting packets.

## Summary

The Heart Rate Service is one of the friendliest BLE profiles to work with, precisely because it's standardised — no reverse engineering, no vendor SDKs, no guessing at byte layouts. What it does demand is respect for the variable-length payload. Decode the flags byte, walk the buffer with a moving offset, check sensor-contact bits in pairs, and treat RR-intervals as a stream you accumulate rather than a value you sample.

Get those four things right and your app works with every compliant strap on the market, first try.

If you want the complete production implementation — reconnect handling, HRV computation, background operation, and a fully testable architecture around it — that's exactly what the **[BLE Flutter Course](https://blefluttercourse.com/)** is built to teach. It takes you from a working parser to an app you'd actually ship.
