// Which offer each post makes, and the BLE Starter box copy matched to the post.
// Posts not listed here get DEFAULT_OFFER (a general BLE Starter box).

export type PostOffer =
  | { kind: 'guide' }
  | { kind: 'starter'; lead: string; pitch: string }

const STARTER_SITE = 'https://blestarter.com/'

// Builds a tracked link to blestarter.com. `content` is the post slug or page area,
// `term` is where on the page the link sits, `anchor` is the section to open.
export function starterUrl(content: string, term: string, anchor: 'join' | 'inside' | '' = ''): string {
  const params = new URLSearchParams({
    utm_source: 'blog',
    utm_medium: 'referral',
    utm_campaign: 'ble_starter',
    utm_content: content,
    utm_term: term,
  })
  return `${STARTER_SITE}?${params.toString()}${anchor ? `#${anchor}` : ''}`
}

const LICENCE = 'flutter_blue_plus 2.x needs a paid licence.'
const COMMERCIAL = 'Shipping this commercially?'

function matched(feature: string): PostOffer {
  return { kind: 'starter', lead: COMMERCIAL, pitch: `${LICENCE} ${feature}` }
}

const GUIDE: PostOffer = { kind: 'guide' }

const FLUTTER_STACK_PITCH =
  "BLE Starter gives you a production-ready BLE layer for iOS and Android from one codebase, built on BSD-licensed libraries, so there's no library licence to buy."

const LICENCE_POST_PITCH =
  "BLE Starter is a production-ready Flutter BLE kit built on universal_ble and flutter_reactive_ble, both BSD-licensed, so there's no library licence to buy at any company size."

// Background mode and pairing aren't kit features, so these posts get a plain licence note.
const LICENCE_NOTE: PostOffer = {
  kind: 'starter',
  lead: COMMERCIAL,
  pitch: 'flutter_blue_plus 2.x needs a paid licence, even during development. BLE Starter is a Flutter BLE starter kit built on BSD-licensed libraries instead.',
}

export const DEFAULT_OFFER: PostOffer = {
  kind: 'starter',
  lead: 'Building a BLE app?',
  pitch:
    'BLE Starter is a production-ready Flutter BLE starter kit with permissions, scanning, auto-reconnect, data, OTA updates and tests, built on BSD-licensed libraries with no library licence to buy.',
}

const OFFERS: Record<string, PostOffer> = {
  // Beginner posts keep the free guide: these readers are still learning.
  'getting-started-ble-flutter': GUIDE,
  'how-long-to-learn-flutter-ble': GUIDE,
  'flutter-ble-project-ideas': GUIDE,
  'best-flutter-ble-course-2026': GUIDE,
  'ble-gatt-profiles-explained': GUIDE,
  'ble-vs-classic-bluetooth-flutter': GUIDE,

  // Posts that solve a problem one of the kit's modules already handles.
  'flutter-ble-permissions-android-ios': matched(
    'BLE Starter has these permission flows ready-made for Android 12+ and iOS, with denied and Bluetooth-off screens, without a library licence.',
  ),
  'flutter-ble-scanning-guide': matched(
    'BLE Starter includes a scanner with service UUID, name and signal-strength filters and battery-aware scan modes, without a library licence.',
  ),
  'flutter-ble-read-write-characteristics': matched(
    'BLE Starter gives you typed read, write and notify calls, plus MTU negotiation and chunked writes, without a library licence.',
  ),
  'flutter-ble-notifications-vs-indications': matched(
    "BLE Starter's GATT data layer gives you typed read, write and notify calls, plus MTU negotiation and chunked writes, without a library licence.",
  ),
  'flutter-ble-keeps-disconnecting': matched(
    "BLE Starter's connection manager handles status 133, timeouts and auto-reconnect with exponential backoff, without a library licence.",
  ),
  'flutter-ble-auto-reconnect': matched(
    "BLE Starter's connection manager is a ready-made state machine with auto-reconnect and exponential backoff, without a library licence.",
  ),
  'flutter-ble-mtu-negotiation-large-data-transfer': matched(
    'BLE Starter handles MTU negotiation and chunked writes for big payloads, without a library licence.',
  ),
  'flutter-ble-multiple-devices': matched(
    "BLE Starter's device registry keeps several connections alive and in sync with your UI, without a library licence.",
  ),
  'flutter-ble-ota-firmware-update-esp32': matched(
    'BLE Starter includes ESP32 OTA updates over BLE with a progress screen and the matching ESP32 firmware sketch, without a library licence.',
  ),
  'testing-flutter-ble-apps': matched(
    'BLE Starter comes with a mock adapter and unit tests for testing without hardware, and needs no library licence.',
  ),
  'debugging-flutter-ble-nrf-connect': matched(
    "BLE Starter includes an in-app log viewer you can export from a customer's phone, plus a mock adapter and unit tests, without a library licence.",
  ),
  'flutter-ble-state-management-riverpod-bloc': matched(
    'BLE Starter gives you the whole BLE layer already wired together as plain Flutter code you own: permissions, scanning, connections and data, without a library licence.',
  ),
  'ble-uuid-custom-service-flutter': matched(
    'With BLE Starter you add your service and characteristic UUIDs to one config file, and scanning, connections and data pick them up, without a library licence.',
  ),
  'flutter-ble-heart-rate-monitor': matched(
    'BLE Starter gives you the production layer under an app like this: scanning, auto-reconnect and typed notify calls, without a library licence.',
  ),
  'build-complete-flutter-ble-app': matched(
    'BLE Starter has the production version of these pieces already working together: permissions, scanning, auto-reconnect, GATT data, OTA and tests, without a library licence.',
  ),

  // "Which tech should I use?" posts.
  'flutter-vs-react-native-ble': { kind: 'starter', lead: 'Going with Flutter?', pitch: FLUTTER_STACK_PITCH },
  'flutter-ble-vs-native-android-kotlin': { kind: 'starter', lead: 'Choosing Flutter?', pitch: FLUTTER_STACK_PITCH },
  'ble-vs-wifi-flutter-iot': {
    kind: 'starter',
    lead: 'Going with BLE?',
    pitch:
      'BLE Starter gives your Flutter app a production-ready BLE layer, from permissions and scanning to reconnects and OTA updates, with no library licence to buy.',
  },
  'esp32-vs-arduino-flutter-ble': {
    kind: 'starter',
    lead: 'Building on ESP32?',
    pitch:
      'BLE Starter includes ESP32 OTA updates over BLE with the matching firmware sketch, plus scanning, reconnects and data, with no library licence to buy.',
  },

  // The two posts about the flutter_blue_plus licence.
  'flutter-blue-vs-flutter-blue-plus': { kind: 'starter', lead: 'Shipping a commercial app?', pitch: LICENCE_POST_PITCH },
  'flutter-ble-packages-comparison': { kind: 'starter', lead: 'Shipping a commercial app?', pitch: LICENCE_POST_PITCH },

  'flutter-ble-background-mode-ios-android': LICENCE_NOTE,
  'flutter-ble-bonding-pairing-security': LICENCE_NOTE,
}

export function getPostOffer(slug: string): PostOffer {
  return OFFERS[slug] ?? DEFAULT_OFFER
}
