---
title: "Flutter BLE Notifications vs Indications: setNotifyValue Explained (flutter_blue_plus)"
date: "2026-06-24"
excerpt: "BLE notifications vs indications in Flutter: how setNotifyValue works in flutter_blue_plus, when to force indications, and which one to pick for your app."
tags: ["Flutter", "BLE", "flutter_blue_plus", "GATT", "Notifications", "Indications"]
---

> **TL;DR:** Notifications are fast, fire-and-forget pushes from a BLE peripheral. Indications are slower but acknowledged at the ATT layer, so the peripheral knows the data actually arrived. In `flutter_blue_plus`, you enable both with `setNotifyValue(true)` — and if a characteristic supports both, you get **notifications by default**. Reach for `forceIndications: true` (Android) only when guaranteed delivery matters more than throughput.

You call `await characteristic.setNotifyValue(true)`, data starts flowing, and everything looks fine — until it isn't. The same code that streams sensor data perfectly on your Pixel goes silent on an iPhone. Your firmware engineer swears the peripheral is sending `INDICATE`, but your `onValueReceived` stream never fires. Or you're pushing accelerometer samples at 50 Hz and packets are clearly going missing.

Almost every one of these "works on one device, not the other" bugs traces back to a misunderstanding of the difference between **notifications** and **indications** — two GATT mechanisms that look identical in the `flutter_blue_plus` API but behave very differently on the wire.

This guide explains what's actually happening underneath `setNotifyValue`, how to choose the right mechanism, and the platform-specific gotchas that bite Flutter BLE developers most often.

## Notify and indicate: both are server-initiated pushes

In BLE's GATT layer, the **peripheral** (server) holds the data and the **central** (your Flutter app, the client) consumes it. There are three ways to get a characteristic's value to the central:

- **Read** — the central pulls the value on demand.
- **Notify** — the peripheral pushes the value whenever it changes, *without* waiting for acknowledgment.
- **Indicate** — the peripheral pushes the value whenever it changes, *and waits* for the central to confirm receipt.

Both notify and indicate are controlled by a special descriptor attached to the characteristic: the **Client Characteristic Configuration Descriptor (CCCD)**, UUID `0x2902`. The central enables pushing by writing two bytes to this descriptor:

- Write `0x0001` → enable **notifications** (bit 0)
- Write `0x0002` → enable **indications** (bit 1)

If you've ever debugged this in nRF Connect, the CCCD write is exactly what you see happen when you tap the "subscribe" arrow next to a characteristic. (If you haven't, our [guide to debugging Flutter BLE with nRF Connect](https://blog.blefluttercourse.com/blog/debugging-flutter-ble-nrf-connect) walks through it.)

## The one difference that matters: acknowledgment

Here's the entire distinction in one sentence: **indications are acknowledged at the ATT layer, notifications are not.**

When the peripheral sends a **notification**, it fires the packet and immediately moves on. It can send another, and another, back-to-back. There's no confirmation, which makes notifications fast and low-overhead — but if a packet is dropped, *neither side knows*. There's no retransmission.

When the peripheral sends an **indication**, it must wait for an ATT confirmation from the central before it's allowed to send the next one. Only **one indication can be outstanding at a time**. That round trip guarantees the data reached the central's BLE stack, but it caps throughput hard — every single value costs a full request/response cycle.

| | Notifications | Indications |
|---|---|---|
| ATT acknowledgment | No | Yes (client confirms) |
| Outstanding at once | Many (back-to-back) | Exactly one |
| Throughput | High | Low |
| Delivery guarantee | None | Confirmed to BLE stack |
| CCCD value | `0x0001` | `0x0002` |
| Best for | Streaming sensor data | Infrequent critical events |

One important nuance: an indication confirms delivery to the central's **Bluetooth stack**, not to your Dart code. It is a transport-level guarantee, not an application-level one. If you need true end-to-end acknowledgment (your app logic processed the value), you still have to build that yourself on top of either mechanism.

## How flutter_blue_plus exposes both

This is where most of the confusion starts. `flutter_blue_plus` does **not** give you separate `enableNotifications()` and `enableIndications()` methods. Both are handled by a single call:

```dart
// Subscribe to the value stream FIRST...
final sub = characteristic.onValueReceived.listen((value) {
  // value is a List<int> — your raw bytes
  print('Received: $value');
});

// ...then enable the CCCD. This writes 0x0001 or 0x0002 for you.
await characteristic.setNotifyValue(true);
```

So which does `setNotifyValue(true)` actually enable? It inspects the characteristic's properties and decides:

- If the characteristic supports **only notify**, it writes `0x0001`.
- If it supports **only indicate**, it writes `0x0002`.
- If it supports **both**, it defaults to **notifications** — matching how Apple's CoreBluetooth behaves on iOS.

That last rule is the source of a very common bug: a developer reads a tutorial that says "use `setNotifyValue(true)` to enable indications," wires it up against a characteristic that advertises both, and ends up silently enabling notifications instead. To force indications on Android, pass the flag explicitly:

```dart
// Android-only: forces the CCCD to 0x0002 even if notify is also supported.
await characteristic.setNotifyValue(true, forceIndications: true);
```

You can always check what a characteristic actually supports before deciding:

```dart
if (characteristic.properties.notify) { /* supports notifications */ }
if (characteristic.properties.indicate) { /* supports indications */ }
```

The data itself arrives on `onValueReceived` (which fires on reads and pushes) or on `lastValueStream` (which fires on reads, writes, *and* pushes). For pure notify/indicate handling, `onValueReceived` is usually the cleaner choice. For more on the underlying read/write model these streams sit on top of, see our [read & write characteristics guide](https://blog.blefluttercourse.com/blog/flutter-ble-read-write-characteristics).

> **Building a real product on BLE notifications?** A robust notification layer has to survive reconnects, dedupe subscriptions, retry transient CCCD failures, and reassemble multi-packet payloads — none of which fits in a blog snippet. The **[BLE Flutter Course](https://blefluttercourse.com/)** ships a complete, production-tested notification manager you can drop into your app today.

## Choosing the right one

The decision is almost always about **how often** the data changes and **how badly** you can tolerate a dropped packet.

**Use notifications when** you're streaming frequently and occasional loss is acceptable or handled at the application layer: heart-rate monitors, IMU/accelerometer data, continuous glucose readings, real-time telemetry. The throughput of indications simply can't keep up with a high-frequency stream, and the standard BLE profiles (like Heart Rate, `0x180D`) use notifications for exactly this reason.

**Use indications when** events are infrequent but must not be lost: a configuration change acknowledgment, a battery-critical alert, a state transition, or a command result. The Service Changed characteristic in the Generic Attribute service is the canonical example — it's defined to use indications precisely because the central *must* see it.

If your data is high-frequency *and* must never be lost, BLE notifications alone won't save you — you'll need an application-level sequence number and retransmission protocol layered on top, often combined with a larger MTU to reduce packet count. Our [MTU negotiation and large data transfer guide](https://blog.blefluttercourse.com/blog/flutter-ble-mtu-negotiation-large-data-transfer) covers that side of the problem.

## Platform differences: iOS vs Android

This trips up cross-platform teams constantly:

- **iOS (CoreBluetooth):** The OS decides whether to use notify or indicate based on the characteristic's properties, and **you cannot force indications**. If a characteristic supports both, iOS uses notifications. `forceIndications` is effectively ignored.
- **Android:** `flutter_blue_plus` writes the CCCD descriptor itself, so `forceIndications: true` genuinely writes `0x0002` and gives you indications even when notify is also available.

The practical takeaway: if your peripheral firmware exposes a characteristic as *both* notify and indicate, your two platforms may end up using *different* transport mechanisms for the same characteristic. The fix is on the firmware side — expose the characteristic with a single intended property so behavior is deterministic across platforms. If you're also wrestling with the permission setup that gates all of this, our [Android & iOS permissions guide](https://blog.blefluttercourse.com/blog/flutter-ble-permissions-android-ios) is the companion read.

## Common pitfalls and gotchas

**Listening *after* `setNotifyValue` instead of before.** If you enable the CCCD first and attach your listener second, you can miss the burst of packets a chatty peripheral sends the instant notifications turn on. Always subscribe to `onValueReceived` first, then call `setNotifyValue(true)`.

**Forgetting to `await`.** `setNotifyValue` returns a `Future` that completes when the CCCD write is confirmed. Fire-and-forget calls race against your next read/write and produce flaky behavior.

**`code: 5, notifications were not updated` on Android.** Android's GATT stack occasionally fails the CCCD write for no good reason — especially right after connecting. The standard mitigation is to catch the error and retry once or twice; on some devices, calling `createBond()` after connecting also clears it up.

**Assuming you got indications when you got notifications.** Because `setNotifyValue(true)` defaults to notify when both are supported, double-check with nRF Connect or your firmware logs that the CCCD value is actually `0x0002` if you specifically need indications.

**Leaking subscriptions across reconnects.** Every reconnect that re-subscribes without cancelling the old stream stacks up duplicate listeners, so you get the same value delivered N times. Tie the subscription's lifecycle to the connection with `device.cancelWhenDisconnected(sub)`. This matters most in apps with [auto-reconnect logic](https://blog.blefluttercourse.com/blog/flutter-ble-auto-reconnect).

**Expecting indication throughput to match notifications.** It won't, and it can't — the round-trip ACK is the whole point. If you benchmark indications and they feel "slow," that's working as designed.

## Related Guides

- [Read & Write BLE Characteristics in Flutter](https://blog.blefluttercourse.com/blog/flutter-ble-read-write-characteristics)
- [BLE GATT Profiles Explained](https://blog.blefluttercourse.com/blog/ble-gatt-profiles-explained)
- [Flutter BLE Auto-Reconnect](https://blog.blefluttercourse.com/blog/flutter-ble-auto-reconnect)
- [MTU Negotiation & Large Data Transfer](https://blog.blefluttercourse.com/blog/flutter-ble-mtu-negotiation-large-data-transfer)
- [Debugging Flutter BLE with nRF Connect](https://blog.blefluttercourse.com/blog/debugging-flutter-ble-nrf-connect)
- [Build a Complete Flutter BLE App](https://blog.blefluttercourse.com/blog/build-complete-flutter-ble-app)
- [Getting Started with BLE in Flutter](https://blog.blefluttercourse.com/blog/getting-started-ble-flutter)

## FAQ

**Is `setNotifyValue(true)` for notifications or indications?**
Both. It writes the CCCD to enable whichever the characteristic supports. If a characteristic supports both notify and indicate, it defaults to notifications. Use `forceIndications: true` on Android to force indications.

**Why are my indications not working on iOS?**
On iOS, CoreBluetooth chooses notify vs indicate automatically and prefers notifications when a characteristic supports both. You cannot force indications from Dart on iOS. If you need indications specifically, the characteristic's firmware should expose *only* the indicate property.

**Are indications guaranteed to be delivered to my app?**
No. The ATT confirmation guarantees delivery to the central's Bluetooth stack, not to your Dart code. For true end-to-end reliability, add your own application-level acknowledgment on top.

**Which is faster, notifications or indications?**
Notifications, by a wide margin. They're sent back-to-back with no acknowledgment, while indications allow only one outstanding packet at a time and wait for a confirmation between each.

**Do I need to write to the CCCD descriptor manually?**
No. `flutter_blue_plus` handles the `0x2902` descriptor write for you inside `setNotifyValue`. Manual descriptor writes are rarely necessary and easy to get wrong.

## Summary

Notifications and indications are the same idea — the peripheral pushing data to your app — separated by one decision: whether each packet is acknowledged. Notifications are fast and lossy; indications are reliable and slow. In `flutter_blue_plus`, both live behind `setNotifyValue(true)`, which defaults to notifications when a characteristic supports both, with `forceIndications` available on Android. Subscribe before you enable, mind the iOS/Android split, and clean up your subscriptions on disconnect.

Getting this right in a demo is easy. Getting it right in a shipping product — across reconnects, flaky Android stacks, multi-packet payloads, and both platforms — is where most BLE apps stall. The **[BLE Flutter Course](https://blefluttercourse.com/)** gives you the complete, production-ready notification and connection architecture so you can stop fighting the transport and start building features.
