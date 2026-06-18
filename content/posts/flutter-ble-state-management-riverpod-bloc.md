---
title: "Flutter BLE State Management: Riverpod vs BLoC with flutter_blue_plus"
date: "2026-06-01"
excerpt: "Learn how to manage BLE connection state, scan results, and characteristic data in Flutter using Riverpod and BLoC with flutter_blue_plus."
tags: ["Flutter", "BLE", "flutter_blue_plus", "Riverpod", "BLoC", "State Management", "Clean Architecture"]
---

> **TL;DR:** `setState` breaks down fast in BLE apps because scan results, connection state, and characteristic data all need to be shared across many widgets. Riverpod's `StreamProvider` and BLoC's stream-driven events are both excellent fits for the asynchronous, multi-source nature of flutter_blue_plus. This post shows you exactly how to wire them up — and where each approach wins.

> **Free guide:** Struggling with dropped connections? Grab *The 7 BLE Mistakes That Make Flutter Apps Disconnect* — production-ready fixes you can apply today. [**Download the free guide →**](https://blog.blefluttercourse.com/free-guide)

## Why `setState` Destroys BLE Apps

You start building a Flutter BLE app and everything looks clean. A `StatefulWidget` holds the connected device, `setState` updates the UI when scanning completes, and life is good.

Then the scope grows.

Your `ScanScreen` discovers devices. Your `DeviceScreen` manages the connection. Your `ControlScreen` reads and writes characteristics. Your `DashboardScreen` renders live sensor data. Suddenly you're passing a `BluetoothDevice` down four widget layers, calling `setState` inside `StreamSubscription` callbacks, and chasing bugs where the connection drops but the UI still shows "Connected."

BLE is inherently multi-stream: `FlutterBluePlus.scanResults` emits continuously during a scan, `device.connectionState` fires asynchronously on any disconnect or reconnect, and characteristic `.lastValueStream` updates every time the peripheral sends a notification. Managing three independent async sources with `setState` on a single widget means at minimum two of them will be wrong at any given moment.

The fix is to lift all BLE state out of individual widgets and into a shared, reactive layer — either Riverpod's provider graph or a BLoC.

---

## The BLE State You Actually Need to Manage

Before choosing an architecture, map out exactly what needs to be reactive:

1. **Adapter state** — Is Bluetooth on, off, or unavailable? (`FlutterBluePlus.adapterState`)
2. **Scan state** — Are we scanning, and what devices have been found? (`FlutterBluePlus.scanResults`, `FlutterBluePlus.isScanning`)
3. **Connection state** — Is the target device connecting, connected, or disconnected? (`device.connectionState`)
4. **Service/characteristic discovery** — Has `device.discoverServices()` completed?
5. **Characteristic values** — The latest value from a notifying characteristic (`characteristic.lastValueStream`)

Each of these is a `Stream`. Your state management solution just needs to expose them correctly.

---

## Approach 1: Riverpod with `StreamProvider`

Riverpod is an excellent fit for flutter_blue_plus because `StreamProvider` wraps any Dart `Stream` directly and exposes it as an `AsyncValue<T>` — handling loading, error, and data states automatically.

### Setup

```yaml
# pubspec.yaml
dependencies:
  flutter_blue_plus: ^1.32.0
  flutter_riverpod: ^2.5.1
  riverpod_annotation: ^2.3.4
```

Wrap your app:

```dart
void main() {
  runApp(const ProviderScope(child: MyApp()));
}
```

### Adapter State Provider

```dart
// providers/ble_providers.dart

@riverpod
Stream<BluetoothAdapterState> adapterState(AdapterStateRef ref) {
  return FlutterBluePlus.adapterState;
}
```

Usage in a widget:

```dart
class BluetoothGate extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final adapterState = ref.watch(adapterStateProvider);
    return adapterState.when(
      data: (state) => state == BluetoothAdapterState.on
          ? const ScanScreen()
          : const BluetoothOffScreen(),
      loading: () => const CircularProgressIndicator(),
      error: (e, _) => Text('Error: $e'),
    );
  }
}
```

### Scan Results Provider

```dart
@riverpod
Stream<List<ScanResult>> scanResults(ScanResultsRef ref) {
  // Auto-dispose stops the stream (and scanning) when no widget is watching
  ref.onDispose(() => FlutterBluePlus.stopScan());
  return FlutterBluePlus.scanResults;
}

@riverpod
Stream<bool> isScanning(IsScanningRef ref) {
  return FlutterBluePlus.isScanning;
}
```

### Connection State Provider

The connection state is per-device, so use a family provider:

```dart
@riverpod
Stream<BluetoothConnectionState> deviceConnectionState(
  DeviceConnectionStateRef ref,
  BluetoothDevice device,
) {
  return device.connectionState;
}
```

In your `DeviceScreen`:

```dart
final connState = ref.watch(deviceConnectionStateProvider(device));
connState.when(
  data: (state) => Text(state == BluetoothConnectionState.connected
      ? 'Connected'
      : 'Disconnected'),
  loading: () => const CircularProgressIndicator(),
  error: (e, _) => Text('Error: $e'),
);
```

### Why `autoDispose` Matters Here

Without `autoDispose`, Riverpod holds onto the scan results stream even when the scan screen is gone. Add `.autoDispose` to every BLE provider, or use the `@riverpod` annotation (which applies `autoDispose` by default). This prevents battery drain from scans running in the background and stale streams delivering data to destroyed widgets.

> **Want the complete production-ready Riverpod architecture** — including characteristic read/write providers, service discovery state, and the reconnection logic that wires it all together? It's all covered inside the [BLE Flutter Course](https://blefluttercourse.com/).

---

## Approach 2: BLoC for BLE

If your team already uses BLoC, or if you need more explicit control over the event/state lifecycle (particularly useful for complex reconnection flows), BLoC maps naturally to BLE's event-driven model.

### Dependencies

```yaml
dependencies:
  flutter_blue_plus: ^1.32.0
  flutter_bloc: ^8.1.5
  equatable: ^2.0.5
```

### Define Events and States

```dart
// ble/ble_event.dart
abstract class BleEvent extends Equatable {
  const BleEvent();
}

class BleScanStarted extends BleEvent {
  const BleScanStarted();
  @override List<Object?> get props => [];
}

class BleScanStopped extends BleEvent {
  const BleScanStopped();
  @override List<Object?> get props => [];
}

class BleDeviceSelected extends BleEvent {
  final BluetoothDevice device;
  const BleDeviceSelected(this.device);
  @override List<Object?> get props => [device];
}

class BleDisconnectRequested extends BleEvent {
  const BleDisconnectRequested();
  @override List<Object?> get props => [];
}
```

```dart
// ble/ble_state.dart
abstract class BleState extends Equatable {
  const BleState();
}

class BleInitial extends BleState {
  const BleInitial();
  @override List<Object?> get props => [];
}

class BleScanning extends BleState {
  final List<ScanResult> results;
  const BleScanning({this.results = const []});
  @override List<Object?> get props => [results];
}

class BleConnecting extends BleState {
  final BluetoothDevice device;
  const BleConnecting(this.device);
  @override List<Object?> get props => [device];
}

class BleConnected extends BleState {
  final BluetoothDevice device;
  final List<BluetoothService> services;
  const BleConnected({required this.device, this.services = const []});
  @override List<Object?> get props => [device, services];
}

class BleDisconnected extends BleState {
  const BleDisconnected();
  @override List<Object?> get props => [];
}

class BleError extends BleState {
  final String message;
  const BleError(this.message);
  @override List<Object?> get props => [message];
}
```

### The BLoC

```dart
// ble/ble_bloc.dart
class BleBloc extends Bloc<BleEvent, BleState> {
  StreamSubscription<List<ScanResult>>? _scanSubscription;
  StreamSubscription<BluetoothConnectionState>? _connectionSubscription;
  BluetoothDevice? _connectedDevice;

  BleBloc() : super(const BleInitial()) {
    on<BleScanStarted>(_onScanStarted);
    on<BleScanStopped>(_onScanStopped);
    on<BleDeviceSelected>(_onDeviceSelected);
    on<BleDisconnectRequested>(_onDisconnectRequested);
  }

  Future<void> _onScanStarted(
    BleScanStarted event,
    Emitter<BleState> emit,
  ) async {
    emit(const BleScanning());
    await FlutterBluePlus.startScan(timeout: const Duration(seconds: 10));

    _scanSubscription = FlutterBluePlus.scanResults.listen((results) {
      // Emit updated scan results as they arrive
      if (state is BleScanning) {
        emit(BleScanning(results: results));
      }
    });
  }

  Future<void> _onDeviceSelected(
    BleDeviceSelected event,
    Emitter<BleState> emit,
  ) async {
    await FlutterBluePlus.stopScan();
    await _scanSubscription?.cancel();

    _connectedDevice = event.device;
    emit(BleConnecting(event.device));

    try {
      await event.device.connect(timeout: const Duration(seconds: 15));

      _connectionSubscription = event.device.connectionState.listen((state) {
        if (state == BluetoothConnectionState.disconnected) {
          add(const BleDisconnectRequested());
        }
      });

      final services = await event.device.discoverServices();
      emit(BleConnected(device: event.device, services: services));
    } catch (e) {
      emit(BleError('Connection failed: $e'));
    }
  }

  // ... disconnect and cleanup handlers
}
```

### Providing the BLoC

```dart
BlocProvider(
  create: (_) => BleBloc(),
  child: const ScanScreen(),
)
```

Then in any descendant widget:

```dart
BlocBuilder<BleBloc, BleState>(
  builder: (context, state) {
    if (state is BleScanning) {
      return DeviceList(results: state.results);
    }
    if (state is BleConnected) {
      return DeviceControlPanel(device: state.device, services: state.services);
    }
    // ...
  },
)
```

---

## Riverpod vs BLoC: Which Should You Choose?

For most new Flutter BLE projects in 2026, **Riverpod is the better starting point**. The reasons:

- `StreamProvider` wraps flutter_blue_plus streams with zero boilerplate
- `autoDispose` prevents the "forgot to cancel the subscription" bug class entirely
- Provider families let you create per-device providers cleanly
- No `BuildContext` required to read state from non-widget code (e.g., repositories)

**Choose BLoC if:**
- Your team already has BLoC conventions and tooling in place
- You need very explicit event tracing (BLoC's event logging is excellent for debugging)
- You're building complex reconnection state machines where the event/state formalism helps

In practice, many production apps use a hybrid: Riverpod for exposing the flutter_blue_plus streams, and a `StateNotifier` (Riverpod's equivalent of BLoC) for the connection lifecycle state machine.

---

## Common Pitfalls and Gotchas

**1. Not cancelling subscriptions on disconnect**

When a device disconnects, always cancel characteristic notification subscriptions before attempting reconnect. Leaving stale subscriptions active causes duplicate callbacks and inconsistent state.

**2. Emitting state inside `BlocBuilder` callbacks**

Never call `context.read<BleBloc>().add(...)` from within a `BlocBuilder` build method. Use `BlocListener` for side effects that trigger new events.

**3. Blocking the event handler with `await` on BLE operations**

Long-running BLE operations (especially `discoverServices()`) will block subsequent events if you `await` them inside an event handler without using `emit.forEach` or separating them properly. In flutter_bloc 8+, prefer `on<Event>` with `transformer: sequential()` for BLE connection flows.

**4. Forgetting to handle Bluetooth adapter state**

If the user turns off Bluetooth mid-session, `device.connectionState` will fire a disconnect, but your provider/BLoC also needs to react to `FlutterBluePlus.adapterState`. Build a listener for adapter state changes at the top of your provider graph.

**5. iOS background behaviour differs from Android**

On iOS, BLE streams may pause when the app goes to the background unless you've configured background modes in `Info.plist`. Don't assume stream delivery is guaranteed in the background without proper configuration — see our [BLE background mode guide](https://blog.blefluttercourse.com/blog/flutter-ble-background-mode-ios-android) for details.

---

## Related Guides

If you're building a complete BLE app, these posts will fill in the rest:

- [Getting Started with BLE in Flutter](https://blog.blefluttercourse.com/blog/getting-started-ble-flutter) — foundational concepts before diving into architecture
- [Flutter BLE Scanning Guide](https://blog.blefluttercourse.com/blog/flutter-ble-scanning-guide) — filtering, timeouts, and scan modes
- [Flutter BLE Read & Write Characteristics](https://blog.blefluttercourse.com/blog/flutter-ble-read-write-characteristics) — the operations your state machine needs to drive
- [Flutter BLE Auto-Reconnect](https://blog.blefluttercourse.com/blog/flutter-ble-auto-reconnect) — keeping the connection alive
- [BLE GATT Profiles Explained](https://blog.blefluttercourse.com/blog/ble-gatt-profiles-explained) — understanding the service/characteristic model that state management wraps
- [Flutter BLE Permissions: Android & iOS](https://blog.blefluttercourse.com/blog/flutter-ble-permissions-android-ios) — permissions are async state too
- [Build a Complete Flutter BLE App](https://blog.blefluttercourse.com/blog/build-complete-flutter-ble-app) — end-to-end walkthrough

---

## FAQ

**Q: Can I use Provider (the original package) instead of Riverpod?**

You can, but Provider doesn't natively expose streams as first-class reactive values. You'd need `StreamBuilder` widgets or `StreamProvider` from the `provider` package, which lacks Riverpod's `autoDispose`, family, and compile-time safety. For new projects, use Riverpod.

**Q: Should each characteristic have its own provider/BLoC?**

For Riverpod, yes — use a family provider keyed on the `BluetoothCharacteristic` UUID. For BLoC, you can use a single `BleBloc` with `BleCharacteristicUpdated` events carrying the UUID and value, or separate `CharacteristicCubit` instances per characteristic. The right answer depends on how many characteristics you're managing simultaneously.

**Q: My `StreamProvider` for scan results rebuilds the whole device list on every scan packet. Is that a problem?**

It can be. Use `select` to filter rebuilds, or debounce the scan results stream before exposing it from the provider. A 500ms debounce dramatically reduces rebuilds during active scanning without noticeable UX lag.

**Q: How do I test BLE state with Riverpod/BLoC?**

With Riverpod, override providers in a test `ProviderContainer` to inject a mock `Stream<ScanResult>`. With BLoC, use `blocTest` from `bloc_test` and inject a mock flutter_blue_plus instance via constructor injection. Never test against the real Bluetooth stack in unit tests.

**Q: Should connection logic live in the BLoC/provider or in a repository layer?**

In a clean architecture, the repository owns the actual `device.connect()` call and exposes a `Stream<ConnectionState>`. The BLoC or provider reacts to that stream. This makes the state layer testable without a real Bluetooth adapter.

---

## Summary

BLE apps and `setState` don't mix. The moment your app has more than one screen touching the same device, you need a shared reactive layer.

- **Riverpod** gives you `StreamProvider` that wraps flutter_blue_plus streams directly, `autoDispose` that prevents stale subscriptions, and family providers for per-device and per-characteristic state — all with minimal boilerplate.
- **BLoC** gives you explicit event/state modelling, excellent DevTools tracing, and a well-understood pattern for large teams.

Both are solid choices. What matters is choosing one and being consistent — a half-Riverpod, half-setState codebase is worse than either approach alone.

> **Ready to build a production BLE app with clean architecture from the ground up?** The [BLE Flutter Course](https://blefluttercourse.com/) walks you through a complete Riverpod + flutter_blue_plus project — scanning, connecting, service discovery, characteristic reads/writes, notifications, and reconnection — all in a layered, testable architecture. [Start learning today →](https://blefluttercourse.com/)
