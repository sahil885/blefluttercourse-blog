---
title: "Flutter BLE Keeps Disconnecting: Status Codes 133, 19 & 8 Explained (flutter_blue_plus)"
date: "2026-09-04"
excerpt: "Why your Flutter BLE connection keeps dropping: how to read disconnectReason, what status codes 133, 19, 8, 61 and 62 mean, and the fix for each."
tags: ["Flutter", "BLE", "flutter_blue_plus", "disconnect", "GATT 133", "debugging"]
faqs:
  - question: "What does GATT error 133 mean in Flutter BLE?"
    answer: "Status 133 (0x85) is GATT_ERROR, Android's generic catch-all. It is not one bug — it usually means you connected while a scan was still running, you leaked GATT client slots by never calling disconnect(), the device is out of range, or the GATT cache is stale. Stop the scan before connecting, always call disconnect() even after a failed connect, and retry once with a short delay."
  - question: "Why does my BLE device disconnect after exactly 30 seconds?"
    answer: "A fixed, repeatable interval almost always means the peripheral is hanging up on purpose, not that the link failed. Check disconnectReason — if the code is 19 (remote user terminated connection) the firmware closed the link, usually via an idle timeout. The fix is in firmware, or in sending periodic keep-alive traffic from the app."
  - question: "How do I find out why my Flutter BLE device disconnected?"
    answer: "Read device.disconnectReason immediately after the connectionState stream emits disconnected. It gives you the platform, a numeric code, and a description. On Android the code is an HCI or GATT status; on iOS it is a CBError. Without it you are guessing."
  - question: "What is status code 19 in Android BLE?"
    answer: "19 (0x13) is REMOTE_USER_TERMINATED_CONNECTION. The peripheral deliberately closed the connection — commonly an idle timeout in firmware, a low battery cutoff, or the device entering sleep. It is not a bug in your Flutter code."
  - question: "Why does my BLE connection drop only after I reflash the firmware?"
    answer: "You have a stale bond. The phone still holds encryption keys from the old firmware build, and the new build cannot decrypt with them, so the link drops with code 61 (MIC failure) on Android or a pairing error on iOS. Call removeBond() on Android, or forget the device in iOS Bluetooth settings, then pair again."
  - question: "Does autoConnect fix random disconnects?"
    answer: "No. autoConnect: true asks Android to reconnect whenever the device reappears, which helps with devices that come and go, but it does not stop the disconnects and it is significantly slower to establish a link. iOS ignores the parameter entirely. Fix the cause first, then decide whether autoConnect suits your reconnection strategy."
---

> **TL;DR:** Almost every "random" BLE disconnect has a specific, readable cause. `flutter_blue_plus` exposes it as `device.disconnectReason` — a platform, a numeric code, and a description. Read that code before you change a single line. Status **8** means the link timed out, **19** means the peripheral hung up on you, **61** means a stale bond, **62** means the connection never properly formed, and **133** is Android's catch-all for "something went wrong." Each one has a different fix, and guessing between them is why this bug eats weeks.

Your app connects. Data flows. Then, somewhere between forty seconds and four minutes later, the connection is gone. No crash, no exception, no pattern you can pin down. You add a reconnect loop, and now it disconnects *and* reconnects forever. You search, and every result is a three-year-old GitHub issue where six people describe six different problems and nobody posts a resolution.

The reason that search goes nowhere is that "BLE keeps disconnecting" isn't one problem. It's at least seven, and they look identical from inside your Dart code. The good news is that the Bluetooth stack tells you which one you have — most developers just never look.

This guide shows you where to look, what each code means, and the specific fix for each cause.

## Stop guessing: read disconnectReason first

`flutter_blue_plus` records why the last disconnect happened on the device object itself. The moment `connectionState` emits `disconnected`, `device.disconnectReason` holds a `DisconnectReason` with three fields: `platform`, `code`, and `description`.

```dart
import 'package:flutter/foundation.dart';
import 'package:flutter_blue_plus/flutter_blue_plus.dart';

void watchConnection(BluetoothDevice device) {
  device.connectionState.listen((state) {
    if (state == BluetoothConnectionState.disconnected) {
      final reason = device.disconnectReason;
      debugPrint(
        'BLE disconnect'
        ' | platform: ${reason?.platform}'
        ' | code: ${reason?.code}'
        ' | description: ${reason?.description}',
      );
    }
  });
}
```

Add that before you change anything else. Then turn on the plugin's own logging so you can see the native traffic around the drop:

```dart
FlutterBluePlus.setLogLevel(LogLevel.verbose);
```

Now reproduce the disconnect. You will get a number. Everything below is organised by that number.

One note if you are on a recent release: `connect()` in `flutter_blue_plus` 2.x takes a **required `license` argument** (`License.nonprofit` for personal, educational and nonprofit use, `License.commercial` otherwise). If you are following an older tutorial and getting a compile error on `connect()`, that is why.

```dart
await device.connect(
  license: License.nonprofit,
  timeout: const Duration(seconds: 20),
  mtu: null,           // request MTU explicitly later instead
  autoConnect: false,
);
```

## What the Android status codes actually mean

On Android, `reason.code` is either an HCI controller error code or one of Android's own GATT codes. These are the ones you will actually meet during a disconnect:

| Code | Hex | Name | What it really means |
| --- | --- | --- | --- |
| 8 | 0x08 | Connection timeout | The link supervision timeout expired. Out of range, peripheral stalled, or interference. |
| 19 | 0x13 | Remote user terminated | The peripheral chose to disconnect. Firmware decision, not yours. |
| 21 | 0x15 | Remote device powered off | The peripheral shut down or went to sleep. |
| 22 | 0x16 | Local host terminated | Your side closed it — your own `disconnect()`, or Android killing it. |
| 34 | 0x22 | LMP response timeout | The peripheral stopped answering link-layer requests. Usually firmware. |
| 59 | 0x3B | Connection interval unacceptable | The peripheral rejected the connection parameters. |
| 61 | 0x3D | Terminated due to MIC failure | Encryption mismatch — almost always a **stale bond**. |
| 62 | 0x3E | Connection failed to be established | The link never fully formed. Timing or advertising problem. |
| 133 | 0x85 | `GATT_ERROR` | Android's catch-all. Means "something failed" and nothing more. |

Two things worth internalising. First, **133 is not a diagnosis** — it is Android admitting it doesn't want to tell you. Second, codes 19 and 21 mean the problem is on the *other side of the radio*, and no amount of Dart will fix them.

## What iOS tells you instead

iOS never gives you HCI codes. CoreBluetooth reports a `CBError`, and `flutter_blue_plus` surfaces it with `platform` set to the Apple platform plus a human-readable `description`. The ones that matter for disconnects:

- **Connection timeout** — the iOS equivalent of Android's code 8.
- **Peripheral disconnected** — the generic drop; CoreBluetooth won't tell you who initiated it.
- **Peer removed pairing information** — the iOS version of a stale bond.
- **Encryption timed out** — pairing/bonding failed to complete in time.

Because iOS is deliberately vaguer, cross-check the same reproduction on an Android device when you can. Android's code will often identify a cause that iOS is hiding from you.

## Cause 1 — The link timed out (code 8)

Every BLE connection has a *supervision timeout*: if neither side hears from the other for that long, the link is declared dead. The peripheral, not your app, chooses that value along with the connection interval.

Code 8 means that timeout expired. Real causes, in rough order of frequency:

- The device genuinely went out of range, or the user put the phone in a pocket with their body between the two radios.
- The peripheral firmware stalled — a blocking operation, a flash write, or a watchdog reset — and stopped sending packets.
- Radio interference, most commonly from 2.4 GHz Wi-Fi on the same channels.
- Connection parameters that are too aggressive for the hardware.

On Android you can ask for a more responsive link, which shortens the interval and makes a stalled connection recover faster:

```dart
await device.requestConnectionPriority(
  connectionPriorityRequest: ConnectionPriority.high,
);
```

Use `ConnectionPriority.high` while transferring, then drop back to `balanced` — high priority meaningfully increases battery drain on both devices. Note this is a *request*: the peripheral can refuse it, and if it does you will see code 59.

If code 8 appears at a consistent distance, it's range. If it appears while the device is sitting on your desk, it's firmware.

## Cause 2 — The peripheral hung up (code 19 or 21)

Code 19 means the peripheral sent a disconnect request. It decided to end the connection.

This is the cause behind almost every "it disconnects after exactly N seconds" report. A fixed, repeatable interval is the signature of a timer, and the timer is in the firmware. Common reasons:

- An **idle timeout** — many peripherals drop a central that hasn't read or written anything for 30 or 60 seconds, to save power.
- A **battery cutoff** — the device disconnects below a voltage threshold.
- The device only permits one central at a time and something else connected.
- The firmware finished what it considered its job — a sensor sent its reading and slept.

There is no Dart fix for this. Either change the firmware, or give the peripheral traffic to keep it awake — a periodic read of any characteristic is usually enough. Confirm the behaviour first with a generic BLE client so you know it's not your app; our [guide to debugging Flutter BLE with nRF Connect](https://blog.blefluttercourse.com/blog/debugging-flutter-ble-nrf-connect) walks through exactly that comparison.

Code 21 is the same story with a clearer cause: the device powered off or went to sleep.

## Cause 3 — A stale bond (code 61, or pairing errors on iOS)

This one has a signature so specific it's worth memorising: **everything worked until you reflashed the firmware**, and now the connection drops moments after it forms.

Code 61 is a MIC failure — a message integrity check failure. In plain terms, the two sides are bonded and encrypting, but the keys no longer match. The phone stored keys from your previous firmware build; the new build generated new ones. Neither side can decrypt the other, so the link dies.

The phone will happily keep the bad bond forever. You have to clear it:

```dart
// Android only
await device.removeBond();
await device.clearGattCache();
```

On iOS there is no equivalent API — the user must forget the device in **Settings → Bluetooth**, which is worth knowing before a customer hits it in the field. If you're changing a GATT layout between firmware builds, also implement the Service Changed characteristic so iOS invalidates its cached service table; `flutter_blue_plus` surfaces that via the `onServicesReset` stream.

For the wider picture on bonding, see our [BLE bonding, pairing and security guide](https://blog.blefluttercourse.com/blog/flutter-ble-bonding-pairing-security).

## Cause 4 — Android status 133, the catch-all

133 deserves its reputation. It is Android's generic failure bucket, and it has at least four distinct causes hiding inside it.

**You connected while a scan was running.** This is the single most common trigger. The Android BLE stack handles a scan and a connection attempt at the same time poorly. Always stop the scan and let it settle:

```dart
await FlutterBluePlus.stopScan();
await Future.delayed(const Duration(milliseconds: 200));
await device.connect(license: License.nonprofit);
```

**You leaked GATT client slots.** Android allows a limited number of concurrent GATT clients per app, and a failed `connect()` still consumes one. If you never release them, you get a handful of successful connections after a fresh install and then permanent 133s until the app restarts — which is exactly why "it works after I reboot" shows up so often in bug reports. Always release the client, even when connecting failed:

```dart
try {
  await device.connect(
    license: License.nonprofit,
    timeout: const Duration(seconds: 20),
  );
} catch (e) {
  await device.disconnect();   // release the GATT client even on failure
  rethrow;
}
```

**The GATT cache is stale.** Android caches the service table per bonded device. If the peripheral's GATT layout changed, call `clearGattCache()` and reconnect.

**It's simply out of range or asleep.** Android reports an unreachable device as 133 rather than something honest, so rule this out before you go looking for exotic causes.

A pragmatic rule: treat a single 133 as noise and retry once after a short delay. Treat repeated 133s as one of the causes above — most often the scan overlap or the leaked clients.

## Cause 5 — The connection never formed (code 62)

Code 62 — connection failed to be established — means the connection procedure started and never completed. The device answered your connection request and then went quiet during setup.

Usual causes are a peripheral advertising too slowly for the connection window, a device that stopped advertising between your scan result and your connect call, or a device already connected to another central. If your scan results are stale by the time the user taps, that gap is worth closing; our [scanning guide](https://blog.blefluttercourse.com/blog/flutter-ble-scanning-guide) covers keeping results fresh.

## Cause 6 — Android suspended your app

If disconnects correlate with the screen locking or the app going to the background, this isn't a BLE problem at all. Doze mode and aggressive OEM battery management (Xiaomi, Huawei, Samsung and OnePlus are the usual offenders) will suspend your process and tear down its connections.

The fix is a foreground service with a persistent notification, plus the right background modes on iOS. That is a genuinely involved topic, and we cover it properly in the [background BLE guide for iOS and Android](https://blog.blefluttercourse.com/blog/flutter-ble-background-mode-ios-android).

The tell: it never happens while you're actively watching the screen during development, and it happens constantly to real users.

## Cause 7 — It isn't disconnecting at all

Worth ruling out, because it wastes so much time: sometimes the connection is fine and your *state* is wrong.

If you re-subscribe to `connectionState` or to characteristic notifications on every reconnect without cancelling the previous subscription, you accumulate duplicate listeners. Each one fires on every event. The symptoms look like chaos — values arriving several times, a reconnect loop firing three times per disconnect, UI flickering between states — and it reads as "unstable connection."

`flutter_blue_plus` gives you a purpose-built tool for this. Tie every characteristic subscription to the connection's lifetime:

```dart
final sub = characteristic.onValueReceived.listen(handleValue);
device.cancelWhenDisconnected(sub);
```

Then set `FlutterBluePlus.setLogLevel(LogLevel.verbose)` and count the disconnect events. If one physical disconnect produces three log lines, your problem is subscription hygiene, not the radio.

## A connection wrapper that tells you what happened

Putting it together: connect cleanly, always release the GATT client, log the reason on every drop, and back off between retries instead of hammering the stack.

```dart
import 'dart:async';
import 'dart:math';
import 'package:flutter/foundation.dart';
import 'package:flutter_blue_plus/flutter_blue_plus.dart';

class BleConnection {
  BleConnection(this.device);

  final BluetoothDevice device;
  StreamSubscription<BluetoothConnectionState>? _stateSub;
  bool _userInitiatedDisconnect = false;
  int _attempt = 0;

  static const int _maxAttempts = 6;

  Future<void> start() async {
    _userInitiatedDisconnect = false;
    _stateSub = device.connectionState.listen(_onStateChange);
    await _connect();
  }

  Future<void> _connect() async {
    try {
      await FlutterBluePlus.stopScan();
      await Future.delayed(const Duration(milliseconds: 200));
      await device.connect(
        license: License.nonprofit,
        timeout: const Duration(seconds: 20),
        mtu: null,
      );
      _attempt = 0;
      await _afterConnect();
    } catch (e) {
      debugPrint('BLE connect failed: $e');
      // Release the GATT client even when the connect attempt failed.
      try {
        await device.disconnect();
      } catch (_) {}
      _scheduleRetry();
    }
  }

  // Everything here must run again after every single reconnect.
  Future<void> _afterConnect() async {
    await device.discoverServices();
    // Re-find your characteristics and re-enable setNotifyValue(true) here.
  }

  void _onStateChange(BluetoothConnectionState state) {
    if (state != BluetoothConnectionState.disconnected) return;

    final reason = device.disconnectReason;
    debugPrint(
      'BLE disconnect | code: ${reason?.code}'
      ' | ${reason?.description}'
      ' | ${reason?.platform}',
    );

    if (_userInitiatedDisconnect) return;
    _scheduleRetry();
  }

  void _scheduleRetry() {
    if (_attempt >= _maxAttempts) {
      debugPrint('BLE: giving up after $_attempt attempts');
      return;
    }
    final backoff = (500 * pow(2, _attempt)).clamp(500, 30000).toInt();
    final jitter = Random().nextInt(400);
    _attempt++;
    Future.delayed(Duration(milliseconds: backoff + jitter), _connect);
  }

  Future<void> stop() async {
    _userInitiatedDisconnect = true;
    await _stateSub?.cancel();
    _stateSub = null;
    await device.disconnect();
  }
}
```

Two details that are easy to miss. `_userInitiatedDisconnect` stops your reconnect logic from fighting a deliberate disconnect — without it, calling `stop()` triggers an immediate reconnect. And `_afterConnect()` must re-run your entire post-connection setup, because service discovery results and notification subscriptions do not survive a disconnect. That single omission is the cause of most "it reconnects but stops receiving data" reports; the [auto-reconnect guide](https://blog.blefluttercourse.com/blog/flutter-ble-auto-reconnect) goes deeper on the reconnection side.

## A ten-minute debug checklist

Work through this in order before changing architecture:

1. Log `disconnectReason` on every disconnect. Get the number.
2. Turn on `LogLevel.verbose` and count the disconnect events — one physical drop should produce one event.
3. Reproduce with nRF Connect. If it disconnects there too, the problem is the peripheral.
4. Note whether the timing is *consistent*. A fixed interval means firmware; random timing means the link.
5. Test with the device on the desk versus across the room, to separate range from everything else.
6. Confirm you call `stopScan()` before `connect()`.
7. Confirm you call `disconnect()` after a failed connect.
8. If the firmware changed recently, clear the bond and the GATT cache.
9. Check whether it only happens when the screen locks — that's a background problem, not a BLE one.
10. Compare Android and iOS. Android's code will often name what iOS hides.

Most disconnects are identified by step 4.

## Related Guides

- [Flutter BLE auto-reconnect: handling disconnections properly](https://blog.blefluttercourse.com/blog/flutter-ble-auto-reconnect)
- [Debugging Flutter BLE with nRF Connect](https://blog.blefluttercourse.com/blog/debugging-flutter-ble-nrf-connect)
- [Background BLE on iOS and Android](https://blog.blefluttercourse.com/blog/flutter-ble-background-mode-ios-android)
- [BLE bonding, pairing and security in Flutter](https://blog.blefluttercourse.com/blog/flutter-ble-bonding-pairing-security)
- [Flutter BLE scanning guide](https://blog.blefluttercourse.com/blog/flutter-ble-scanning-guide)
- [Flutter BLE permissions for Android and iOS](https://blog.blefluttercourse.com/blog/flutter-ble-permissions-android-ios)

## FAQ

**What does GATT error 133 mean in Flutter BLE?**
Status 133 (0x85) is `GATT_ERROR`, Android's generic catch-all. It is not one bug — it usually means you connected while a scan was still running, you leaked GATT client slots by never calling `disconnect()`, the device is out of range, or the GATT cache is stale. Stop the scan before connecting, always call `disconnect()` even after a failed connect, and retry once with a short delay.

**Why does my BLE device disconnect after exactly 30 seconds?**
A fixed, repeatable interval almost always means the peripheral is hanging up on purpose, not that the link failed. Check `disconnectReason` — if the code is 19 the firmware closed the link, usually via an idle timeout. The fix is in firmware, or in sending periodic keep-alive traffic from the app.

**How do I find out why my Flutter BLE device disconnected?**
Read `device.disconnectReason` immediately after the `connectionState` stream emits `disconnected`. It gives you the platform, a numeric code, and a description. On Android the code is an HCI or GATT status; on iOS it is a `CBError`. Without it you are guessing.

**What is status code 19 in Android BLE?**
19 (0x13) is `REMOTE_USER_TERMINATED_CONNECTION`. The peripheral deliberately closed the connection — commonly an idle timeout in firmware, a low battery cutoff, or the device entering sleep. It is not a bug in your Flutter code.

**Why does my BLE connection drop only after I reflash the firmware?**
You have a stale bond. The phone still holds encryption keys from the old firmware build, and the new build cannot decrypt with them, so the link drops with code 61 on Android or a pairing error on iOS. Call `removeBond()` on Android, or forget the device in iOS Bluetooth settings, then pair again.

**Does autoConnect fix random disconnects?**
No. `autoConnect: true` asks Android to reconnect whenever the device reappears, which helps with devices that come and go, but it does not stop the disconnects and it is significantly slower to establish a link. iOS ignores the parameter entirely. Fix the cause first, then decide whether `autoConnect` suits your reconnection strategy.

## Summary

"BLE keeps disconnecting" is never one bug, which is why generic advice never fixes it. The disconnect reason is sitting right there on the device object, and reading it collapses a week of guesswork into a single decision: code 8 is the link, 19 and 21 are the peripheral, 61 is a stale bond, 62 is a failed handshake, and 133 means check your scan overlap and your GATT client hygiene first.

Log the reason, note whether the timing is consistent, and compare against a generic BLE client. Those three steps identify the cause of nearly every disconnect before you touch your architecture.

If you want the deeper version of this — the seven disconnect causes with production-ready fixes laid out end to end — grab the [free guide, *Why Your BLE App Keeps Disconnecting*](https://blog.blefluttercourse.com/free-guide). And when you're ready to build the whole connection layer properly, with a real state machine, reconnection strategy and platform handling that survives contact with actual users, the [BLE Flutter Course](https://blefluttercourse.com/) gives you the complete implementation rather than the concepts.
