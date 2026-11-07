// Which offer each post makes, and the course box copy matched to the post.
// Posts not listed here get DEFAULT_OFFER (a general course box).

export type PostOffer =
  | { kind: 'guide' }
  | { kind: 'course'; lead: string; pitch: string }

// The course pre-order details shown across the blog. Change them here when the
// price or launch date changes.
export const COURSE_NAME = 'Flutter BLE Mastery'
export const COURSE_PRICE = '$297'
export const COURSE_FULL_PRICE = '$497'
export const COURSE_LAUNCH = 'early 2027'
export const COURSE_PREORDER_NOTE = `Pre-order price ${COURSE_PRICE} (normally ${COURSE_FULL_PRICE}). Out ${COURSE_LAUNCH}.`

const COURSE_SITE = 'https://blefluttercourse.com/'

// Builds a tracked link to the course page. `content` is the post slug or page area,
// `term` is where on the page the link sits, `anchor` is the section to open.
export function courseUrl(content: string, term: string, anchor: 'pricing' | 'curriculum' | '' = ''): string {
  const params = new URLSearchParams({
    utm_source: 'blog',
    utm_medium: 'referral',
    utm_campaign: 'course_preorder',
    utm_content: content,
    utm_term: term,
  })
  return `${COURSE_SITE}?${params.toString()}${anchor ? `#${anchor}` : ''}`
}

function matched(pitch: string): PostOffer {
  return { kind: 'course', lead: 'Want to go deeper?', pitch }
}

const GUIDE: PostOffer = { kind: 'guide' }

const FULL_COURSE_PITCH = `${COURSE_NAME} takes you from BLE fundamentals to production: scanning, reliable connections, GATT communication, a clean app architecture and OTA firmware updates for ESP32.`

const PATTERNS_PITCH = `${COURSE_NAME} covers the patterns that make or break a BLE app in production: stable connections, auto-reconnect, GATT communication and OTA firmware updates.`

export const DEFAULT_OFFER: PostOffer = { kind: 'course', lead: 'Building a BLE app?', pitch: FULL_COURSE_PITCH }

const OFFERS: Record<string, PostOffer> = {
  // Beginner posts keep the free guide: these readers are still learning.
  'getting-started-ble-flutter': GUIDE,
  'flutter-ble-project-ideas': GUIDE,
  'ble-gatt-profiles-explained': GUIDE,
  'ble-vs-classic-bluetooth-flutter': GUIDE,

  // Readers comparing courses or planning how to learn.
  'best-flutter-ble-course-2026': {
    kind: 'course',
    lead: 'Looking for a Flutter BLE course?',
    pitch: `${COURSE_NAME} takes you from BLE fundamentals to production with projects on real ESP32 hardware: a scanner, a stable device screen, ESP32 control, a production architecture and an OTA firmware updater.`,
  },
  'how-long-to-learn-flutter-ble': {
    kind: 'course',
    lead: 'Want a structured path?',
    pitch: `${COURSE_NAME} takes you from BLE fundamentals to a production-ready app in order, with hands-on ESP32 projects and an OTA firmware updater as the capstone.`,
  },

  // Posts whose topic the course teaches in depth.
  'flutter-ble-permissions-android-ios': matched(
    `In ${COURSE_NAME} you set up permissions on Android and iOS, handle runtime requests and build a working BLE scanner.`,
  ),
  'flutter-ble-scanning-guide': matched(
    `In ${COURSE_NAME} you build a working BLE scanner, with cross-platform permissions and signal-strength (RSSI) filtering.`,
  ),
  'flutter-ble-read-write-characteristics': matched(
    `${COURSE_NAME} covers reading values, writing with and without response, notifications and error handling, and you use them to control an ESP32.`,
  ),
  'flutter-ble-notifications-vs-indications': matched(
    `${COURSE_NAME} covers notifications without memory leaks, plus reads, writes and error handling, with an ESP32 project to practise on.`,
  ),
  'flutter-ble-keeps-disconnecting': matched(
    `${COURSE_NAME} has a whole module on connection management: reliable connections, auto-reconnect with exponential backoff and the edge cases that cause drops.`,
  ),
  'flutter-ble-auto-reconnect': matched(
    `${COURSE_NAME} covers auto-reconnect with exponential backoff and the edge cases around it, and you build a device screen that stays stable on a flaky connection.`,
  ),
  'flutter-ble-mtu-negotiation-large-data-transfer': matched(
    `The ${COURSE_NAME} capstone covers MTU negotiation and long writes, then puts them to work in an OTA firmware updater.`,
  ),
  'flutter-ble-multiple-devices': matched(
    `${COURSE_NAME} covers reliable connection management and an app architecture that keeps your UI in sync with your devices.`,
  ),
  'flutter-ble-ota-firmware-update-esp32': matched(
    `The ${COURSE_NAME} capstone is a complete OTA firmware updater for ESP32, with MTU negotiation, long writes and a progress UI.`,
  ),
  'debugging-flutter-ble-nrf-connect': matched(
    `${COURSE_NAME} covers production logging and a clean BLoC or Riverpod architecture, so problems in the field are easier to track down.`,
  ),
  'flutter-ble-state-management-riverpod-bloc': matched(
    `${COURSE_NAME} shows you how to structure a BLE app with BLoC or Riverpod and keep your UI state in sync with your devices.`,
  ),
  'ble-uuid-custom-service-flutter': matched(
    `${COURSE_NAME} covers the GATT hierarchy from the ground up, then has you talk to your own ESP32: switch an LED and read sensor data.`,
  ),
  'flutter-ble-heart-rate-monitor': matched(
    `${COURSE_NAME} takes you from scanning and stable connections to GATT notifications, with projects on real ESP32 hardware.`,
  ),
  'build-complete-flutter-ble-app': matched(
    `${COURSE_NAME} walks you through the whole build in depth: a scanner, a stable device screen, ESP32 control, a production architecture and an OTA firmware updater.`,
  ),
  'flutter-ble-bonding-pairing-security': matched(
    `The ${COURSE_NAME} capstone covers pairing, bonding and security, along with MTU negotiation and OTA firmware updates.`,
  ),

  // "Which tech should I use?" posts.
  'flutter-vs-react-native-ble': { kind: 'course', lead: 'Going with Flutter?', pitch: FULL_COURSE_PITCH },
  'flutter-ble-vs-native-android-kotlin': { kind: 'course', lead: 'Choosing Flutter?', pitch: FULL_COURSE_PITCH },
  'ble-vs-wifi-flutter-iot': { kind: 'course', lead: 'Going with BLE?', pitch: FULL_COURSE_PITCH },
  'esp32-vs-arduino-flutter-ble': {
    kind: 'course',
    lead: 'Building on ESP32?',
    pitch: `In ${COURSE_NAME} you control an ESP32 from Flutter, then build an OTA firmware updater for it.`,
  },

  // The flutter_blue_plus licence posts and the migration guide.
  'flutter-blue-vs-flutter-blue-plus': { kind: 'course', lead: 'Building a BLE app?', pitch: PATTERNS_PITCH },
  'flutter-ble-packages-comparison': { kind: 'course', lead: 'Building a BLE app?', pitch: PATTERNS_PITCH },
  'migrate-flutter-blue-plus-to-universal-ble': { kind: 'course', lead: 'Building a BLE app?', pitch: PATTERNS_PITCH },

  // testing-flutter-ble-apps and flutter-ble-background-mode-ios-android get DEFAULT_OFFER:
  // the course doesn't have a section on either topic.
}

export function getPostOffer(slug: string): PostOffer {
  return OFFERS[slug] ?? DEFAULT_OFFER
}
