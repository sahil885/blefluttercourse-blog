---
title: "Flutter BLE Bonding, Pairing & Security: createBond, Encrypted Characteristics, and Platform Gotchas"
date: "2026-06-10"
excerpt: "Learn how flutter BLE pairing and bonding work with flutter_blue_plus createBond, encrypted characteristics, and how to handle security errors on Android and iOS."
tags: ["Flutter", "BLE", "flutter_blue_plus", "Security", "Bonding", "Pairing", "Android", "iOS"]
---

> **TL;DR:** Pairing is the temporary key exchange; bonding is storing those keys so devices stay trusted across reconnections. On Android you can trigger it explicitly with `device.createBond()` in flutter_blue_plus. On iOS there is no bonding API at all — you trigger it implicitly by reading or writing an encrypted characteristic. Most "random" GATT errors 5, 8, 15, and 137 are security errors in disguise.

If you've ever shipped a Flutter BLE app and started seeing mysterious `GATT_INSUFFICIENT_AUTHENTICATION` errors, characteristics that read fine on one phone but throw on another, or devices that silently stop reconnecting after a firmware re-flash — congratulations, you've met BLE security. It's the layer most tutorials skip, and it's the layer that breaks apps in production.

The confusion usually starts with terminology. Developers use "pairing" and "bonding" interchangeably, but the BLE spec treats them as two distinct things, and your code needs to treat them differently too. Add the fact that Android exposes an explicit bonding API while iOS hides the entire process behind CoreBluetooth, and you have a perfect recipe for platform-specific bugs.

This guide walks through how BLE security actually works, how to handle pairing and bonding in flutter_blue_plus, and the gotchas that bite real apps.

> **Free guide:** Struggling with dropped connections? Grab *The 7 BLE Mistakes That Make Flutter Apps Disconnect* — production-ready fixes you can apply today. [**Download the free guide →**](https://blog.blefluttercourse.com/free-guide)

## Pairing vs Bonding: They're Not the Same Thing

**Pairing** is the process of exchanging temporary security keys to encrypt the current connection. It happens once, at connection time, and the keys are thrown away when the link drops.

**Bonding** is pairing plus persistence: the exchanged long-term keys (LTKs) are stored on both devices, so the next time they connect, encryption is re-established silently — no dialog, no key exchange, no user interaction.

In practice, almost every product wants bonding, not just pairing. A heart rate strap that asks the user to re-pair on every connection is a return waiting to happen. If you're building a device-companion app, bonding is what makes the relationship feel permanent.

There's a third concept worth knowing: the **pairing method**. During pairing, the two devices negotiate how the user confirms the exchange:

- **Just Works** — no user interaction; encrypted but not authenticated (no MITM protection)
- **Passkey Entry** — a 6-digit PIN displayed on one device, typed on the other
- **Numeric Comparison** — both devices show a number; the user confirms they match (LE Secure Connections only)
- **Out of Band** — keys exchanged over another channel, like NFC

Which method gets used is decided by the *peripheral's* IO capabilities and security requirements — your Flutter app doesn't choose it. If your ESP32 firmware advertises "no input, no output," you'll get Just Works whether you like it or not. Security is designed on the firmware side and *handled* on the app side. We cover the firmware half in our guide to [ESP32 vs Arduino for Flutter BLE](https://blog.blefluttercourse.com/blog/esp32-vs-arduino-flutter-ble).

## Bonding on Android with createBond()

Android exposes bonding directly, and flutter_blue_plus wraps it cleanly:

```dart
// Explicitly bond after connecting
await device.connect();
await device.createBond();
```

Calling `createBond()` triggers the system pairing dialog (or a silent Just Works exchange, depending on the peripheral). You can also watch the bond state as a stream:

```dart
device.bondState.listen((state) {
  // BluetoothBondState.none, .bonding, .bonded
  print('Bond state: $state');
});
```

And remove a stale bond programmatically:

```dart
await device.removeBond();
```

Two practical notes. First, you don't always have to call `createBond()` yourself — if you read or write a characteristic that requires encryption, Android will start bonding automatically. But triggering it explicitly right after `connect()` makes the flow predictable and avoids a class of mid-operation failures. Second, on Android 6 and 7, an operation that triggers bonding will *fail first* with `GATT_INSUFFICIENT_AUTHENTICATION` while bonding starts in the background — you're expected to catch the error, wait for `bondState` to reach `bonded`, and retry the operation yourself.

## iOS: There Is No createBond

CoreBluetooth gives you no pairing API, no bond state, and no way to ask "is this device bonded?" Apple's model is entirely implicit: when your app touches a characteristic that the peripheral protects with encryption, iOS initiates pairing on its own and shows whatever dialog the negotiated method requires — or none at all for Just Works.

This means the *cross-platform pattern* for triggering bonding is:

```dart
Future<void> ensureBonded(BluetoothDevice device,
    BluetoothCharacteristic encryptedChar) async {
  if (Platform.isAndroid) {
    await device.createBond();
  } else {
    // iOS: reading an encrypted characteristic triggers pairing
    await encryptedChar.read();
  }
}
```

Apple's own accessory guidelines recommend exactly this — a dedicated encrypted characteristic whose only job is to trigger the pairing flow when read. If your firmware doesn't have one, add one. (This pattern, with full retry handling, reconnection awareness, and the firmware side of the equation, is one of the modules in [the BLE Flutter Course](https://blefluttercourse.com/).)

On iOS you'll also see security failures surface as error codes 5 (insufficient authentication) and 15 (insufficient encryption) when pairing was declined or the bond is broken.

## Decoding the Security Errors

These GATT status codes are the ones that almost always mean "security problem," not "BLE is flaky":

| Code | Name | What it actually means |
|------|------|------------------------|
| 5 | GATT_INSUFFICIENT_AUTHENTICATION | Characteristic requires an authenticated (bonded) link |
| 8 | GATT_INSUFFICIENT_AUTHORIZATION / timeout | Often a broken bond on reconnect |
| 15 | GATT_INSUFFICIENT_ENCRYPTION | Link isn't encrypted; pairing needed |
| 137 | GATT_AUTH_FAIL | Authentication failed — usually stale keys |

The single most common production failure is the **stale bond**: the user re-flashes the peripheral (or the firmware wipes its bond store), the phone still holds old keys, and every reconnect fails with 137 or a pairing rejection. The fix is to detect the failure and remove the bond:

```dart
try {
  await characteristic.read();
} on FlutterBluePlusException catch (e) {
  if (isAuthFailure(e)) {
    await device.removeBond();   // Android only
    await device.createBond();   // re-pair fresh
    // then retry the read...
  }
}
```

On iOS you can't remove a bond programmatically — the user has to go to Settings → Bluetooth → Forget This Device. Your app should detect the condition and *tell them that*, because nothing else will.

> **Want the complete, production-grade security layer?** The [BLE Flutter Course](https://blefluttercourse.com/) includes the full bonding state machine — automatic stale-bond detection, platform-aware retry logic, encrypted characteristic handling on ESP32 firmware, and the exact UX flow for guiding users through re-pairing on iOS. It's the code this article only sketches.

## Common Pitfalls

**Treating pairing as guaranteed.** Users can decline the pairing dialog. Your read will fail with an authentication error and your app needs a real answer for that, not a spinner.

**Forgetting Android 6/7 behavior.** On older Android, the triggering operation fails *while bonding succeeds in the background*. If you don't retry after `bondState` hits `bonded`, your app looks broken on exactly the devices your QA team doesn't have.

**Not handling re-flashed peripherals.** During development you'll re-flash your ESP32 constantly, wiping its keys while your phone keeps the old bond. If reconnects suddenly fail after a flash, remove the bond (or forget the device on iOS) before assuming your code regressed.

**Bonding before you need to.** If your device has no encrypted characteristics, don't call `createBond()` "just in case." Every pairing dialog is UX friction, and unnecessary bonds are one more thing to go stale.

**Assuming encryption equals security.** Just Works pairing encrypts the link but doesn't authenticate it — a MITM attacker during the initial pairing can intercept keys. For genuinely sensitive data, require Passkey or Numeric Comparison in firmware, and consider application-layer encryption on top.

## Related Guides

- [Reading and Writing BLE Characteristics in Flutter](https://blog.blefluttercourse.com/blog/flutter-ble-read-write-characteristics)
- [BLE GATT Profiles Explained](https://blog.blefluttercourse.com/blog/ble-gatt-profiles-explained)
- [Flutter BLE Auto-Reconnect](https://blog.blefluttercourse.com/blog/flutter-ble-auto-reconnect)
- [Flutter BLE Permissions on Android and iOS](https://blog.blefluttercourse.com/blog/flutter-ble-permissions-android-ios)
- [Build a Complete Flutter BLE App](https://blog.blefluttercourse.com/blog/build-complete-flutter-ble-app)
- [Getting Started with BLE in Flutter](https://blog.blefluttercourse.com/blog/getting-started-ble-flutter)

## FAQ

**What's the difference between pairing and bonding in BLE?**
Pairing is the temporary exchange of encryption keys for the current connection. Bonding stores those keys permanently so future connections re-encrypt automatically without user interaction.

**How do I trigger pairing in flutter_blue_plus?**
On Android, call `device.createBond()` after connecting. On iOS there's no API — read or write a characteristic that requires encryption and the OS starts pairing automatically.

**Why do I get GATT error 5 or 137 when reading a characteristic?**
Error 5 means the characteristic requires an authenticated link and you aren't bonded yet. Error 137 usually means stale bond keys — remove the bond and re-pair.

**Can I remove a bond programmatically on iOS?**
No. iOS bonds can only be removed by the user in Settings → Bluetooth → Forget This Device. Detect the auth failure in your app and guide the user there.

**Does my Flutter app choose the pairing method (Just Works vs Passkey)?**
No. The pairing method is negotiated based on the peripheral's IO capabilities and security requirements, which are set in firmware. The app only handles the resulting flow.

## Summary

BLE security comes down to a handful of rules: know the difference between pairing and bonding, use `createBond()` on Android and encrypted-characteristic reads on iOS, treat GATT errors 5/8/15/137 as security signals rather than random flakiness, and always have a recovery path for stale bonds — including telling iOS users to forget the device manually.

Sketches get you through a demo; production needs the full state machine. The [BLE Flutter Course](https://blefluttercourse.com/) ships the complete implementation — bonding, encrypted characteristics, ESP32 firmware security config, and the reconnect logic that ties it all together. If your app talks to real hardware in real users' hands, it's the fastest way to get security right.
