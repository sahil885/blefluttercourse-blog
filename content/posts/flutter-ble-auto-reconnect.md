---
title: "Flutter BLE Auto-Reconnect: How to Handle Disconnections Properly"
date: "2026-05-22"
excerpt: "BLE devices disconnect constantly — screen locks, range drops, firmware resets. Here's what you need to understand about reconnection in Flutter, and why getting it right is harder than it looks."
tags: ["Flutter", "BLE", "flutter_blue_plus", "reconnect", "state management"]
---

> **TL;DR:** flutter_blue_plus doesn't reconnect for you. You need to listen to `device.connectionState`, detect disconnects, and call `device.connect()` again. The basic pattern is a few lines. The production-ready version — with exponential backoff, platform differences, re-subscription logic, and state management — is significantly more involved.

# Flutter BLE Auto-Reconnect: How to Handle Disconnections Properly

BLE connections drop. A user's phone screen locks. The device resets. Someone walks out of range. This isn't a bug — it's the nature of the protocol.

The problem is that most tutorials show you how to *connect* to a BLE device, not what to do when it disconnects unexpectedly. That gap is where production apps fall apart.

---

## Why Reconnection Is Non-Trivial

flutter_blue_plus exposes `device.connectionState` as a stream. Listening to it is straightforward:

```dart
device.connectionState.listen((state) {
  if (state == BluetoothConnectionState.disconnected) {
    // what now?
  }
});
```

The naive fix is obvious: just call `device.connect()` again. And for a demo, that works. But in a real app, you immediately run into questions:

- What if the device isn't back in range yet? How long do you wait before retrying?
- How many times do you retry before giving up?
- What if the user *intentionally* disconnected — should you still reconnect?
- After you reconnect, are your characteristic subscriptions still active?
- How does this behave differently on iOS vs Android?

Each of these is a separate problem, and each one that you get wrong shows up as a frustrating bug for your users.

---

## The Basic Pattern

Here's the simplest version that handles an unintentional disconnect:

```dart
bool _shouldReconnect = true;

void listenForDisconnect(BluetoothDevice device) {
  device.connectionState.listen((state) {
    if (state == BluetoothConnectionState.disconnected && _shouldReconnect) {
      _attemptReconnect(device);
    }
  });
}

Future<void> _attemptReconnect(BluetoothDevice device) async {
  await Future.delayed(const Duration(seconds: 2)); // Don't retry immediately
  try {
    await device.connect(timeout: const Duration(seconds: 15));
  } catch (e) {
    // Connection failed — try again
    _attemptReconnect(device);
  }
}

// Call this before intentional disconnect
void disconnect(BluetoothDevice device) {
  _shouldReconnect = false;
  device.disconnect();
}
```

This handles the most basic case. But notice what's already missing: there's no backoff (if the device is offline, this retries in a tight loop), no retry limit, and no platform-specific handling.

> **On Android**, `autoConnect: true` in `device.connect()` asks the OS to reconnect when the device comes back in range — no polling required. On iOS, this parameter is ignored and you handle reconnection entirely yourself.

---

## The Part Most Tutorials Skip

Once you reconnect, your app isn't back to normal. Service discovery results from the previous connection are no longer valid. If you were subscribed to notifications, those subscriptions are gone — you need to re-discover services and re-enable notifications every time you reconnect.

This is one of the most common causes of "my app stops working after a reconnect" bugs:

```dart
// After every successful reconnect — not optional
final services = await device.discoverServices();
// Re-find your characteristics and re-enable setNotifyValue(true)
```

A production reconnect system needs to re-run your entire post-connection setup, not just re-call `connect()`.

---

## What a Production Implementation Needs

A reconnect manager that's genuinely ready for production needs to handle:

- **Exponential backoff** — don't hammer the BLE stack with instant retries
- **Retry limits** — know when to give up and surface an error to the user
- **Jitter** — prevents multiple devices from all retrying at the same moment
- **Platform-aware logic** — `autoConnect` on Android vs. manual polling on iOS
- **State machine** — `connecting`, `connected`, `reconnecting`, `failed` are distinct states your UI needs to reflect
- **Full re-initialisation after reconnect** — services, characteristics, notification subscriptions
- **Widget lifecycle safety** — reconnect callbacks shouldn't fire after the screen is disposed

Building this correctly, and integrating it cleanly into Riverpod or BLoC, is exactly the kind of thing that takes an afternoon to get wrong and a day to debug.

> The BLE Flutter Course covers a complete, production-ready reconnect architecture — including the state machine, platform differences, and how to wire it into a clean app architecture with real hardware.
> **[See what's in the course →](https://blefluttercourse.com)**

---

## Common Mistakes to Avoid

**Reconnecting synchronously inside the callback** — the BLE stack needs a moment to clean up after a disconnect. Always add at least a short delay before retrying.

**Not cancelling subscriptions on dispose** — if your widget is gone and the reconnect callback fires, you'll call `setState` on a dead widget. Keep a reference to your subscription and cancel it in `dispose()`.

**Forgetting to re-discover services** — see above. This one catches almost everyone.

**Not handling the "intentional disconnect" case** — always set a flag before you call `device.disconnect()` so your reconnect logic knows not to fire.

---

## Related Guides

- 🔍 **[Flutter BLE Scanning Guide](https://blog.blefluttercourse.com/blog/flutter-ble-scanning-guide)** — How to find a device after it disconnects
- 📖 **[Flutter BLE Read & Write Characteristics](https://blog.blefluttercourse.com/blog/flutter-ble-read-write-characteristics)** — What to re-initialise after reconnecting
- 🏗️ **[Build a Complete Flutter BLE App](https://blog.blefluttercourse.com/blog/build-complete-flutter-ble-app)** — Architecture that handles disconnects from the start
- 🔰 **[Getting Started with BLE in Flutter](https://blog.blefluttercourse.com/blog/getting-started-ble-flutter)** — BLE connection fundamentals

---

## Frequently Asked Questions

### Why doesn't flutter_blue_plus handle reconnection automatically?

Because the right behaviour when a device disconnects is entirely application-specific. Should you retry immediately? Wait? Scan for the device first? Ask the user? flutter_blue_plus gives you the tools; you decide the logic.

### What does autoConnect: true do on Android?

It tells the Android Bluetooth stack to connect to the device whenever it comes back in range, without your app actively polling. It's slower for initial connections but handles devices that come and go without you writing retry loops. iOS ignores this parameter.

### My app reconnects but then stops receiving notifications. What's wrong?

Your characteristic notifications weren't re-enabled after reconnecting. Every time you reconnect, you need to call `discoverServices()` and then `setNotifyValue(true)` on any characteristics you want to subscribe to. The previous session's subscriptions don't survive a disconnect.

### How do I show the user that reconnection is in progress?

You need a proper connection state model that includes a `reconnecting` state, not just `connected` / `disconnected`. Track your retry attempt count and expose it to the UI so users know the app is working, not frozen.

---

## Summary

The basic reconnect loop in Flutter BLE is a handful of lines. A production-ready reconnect system — with proper backoff, state management, platform handling, and full re-initialisation — is a meaningful engineering task. Getting it right is one of the things that separates apps that work in demos from apps that hold up in the real world.

The **[free disconnection guide](https://blog.blefluttercourse.com/free-guide)** covers why BLE apps disconnect. The **[BLE Flutter Course](https://blefluttercourse.com/)** covers how to handle it properly in a production codebase.

👉 **[Explore the BLE Flutter Course →](https://blefluttercourse.com/)**
