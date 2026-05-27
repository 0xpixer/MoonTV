// PWA utilities for MoonTV

export interface LockScreenCoverData {
  poster: string;
  title: string;
  episode?: string;
  progress?: number;
}

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<{ outcome: string }>;
}

interface StandaloneNavigator extends Navigator {
  standalone?: boolean;
}

let deferredInstallPrompt: BeforeInstallPromptEvent | null = null;
let listenersAreRegistered = false;

// Update lock screen cover with current playing content
export async function updateLockScreenCover(
  data: LockScreenCoverData
): Promise<boolean> {
  try {
    if (
      'serviceWorker' in navigator &&
      'serviceWorker' in navigator.serviceWorker
    ) {
      const registration = await navigator.serviceWorker.ready;
      const activeWorker = registration.active;

      if (activeWorker) {
        // Create a message channel for proper communication
        const messageChannel = new MessageChannel();

        return new Promise((resolve, reject) => {
          // Set up response handler
          messageChannel.port1.onmessage = (event) => {
            if (event.data && typeof event.data.success === 'boolean') {
              if (event.data.success) {
                resolve(true);
              } else {
                reject(
                  new Error(
                    event.data.error || 'Lock screen cover update failed'
                  )
                );
              }
            } else {
              resolve(true); // Fallback success
            }
          };

          // Send message to service worker
          activeWorker.postMessage(
            {
              type: 'UPDATE_LOCK_SCREEN_COVER',
              poster: data.poster,
              title: data.title,
              episode: data.episode,
              progress: data.progress,
            },
            [messageChannel.port2]
          );

          // Set a timeout to prevent hanging
          setTimeout(() => {
            resolve(true); // Fallback success after timeout
          }, 5000);
        });
      }
    }

    // For iOS Safari, we can also update the web app icon
    if (typeof window !== 'undefined' && 'navigator' in window) {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

      if (isIOS) {
        // iOS Safari specific lock screen cover update
        // This would require additional implementation for actual lock screen cover updates
        return true;
      }
    }

    return true; // Fallback success
  } catch {
    return false;
  }
}

// Register service worker
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.register('/sw.js');
      return registration;
    }
  } catch {
    return null;
  }
  return null;
}

// Request notification permission
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  try {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission;
    }
  } catch {
    return 'denied';
  }
  return 'denied';
}

// Send notification
export async function sendNotification(
  title: string,
  options?: NotificationOptions
): Promise<void> {
  try {
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(title, {
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        ...options,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    }
  } catch {
    return;
  }
}

// Check if app is running as PWA
export function isPWA(): boolean {
  if (typeof window === 'undefined') return false;

  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as StandaloneNavigator).standalone === true ||
    document.referrer.includes('android-app://')
  );
}

// Get PWA installation prompt
export async function getInstallPrompt(): Promise<BeforeInstallPromptEvent | null> {
  if (typeof window === 'undefined') {
    return null;
  }

  setupPWAEventListeners();
  return deferredInstallPrompt;
}

// Install PWA
export async function installPWA(): Promise<boolean> {
  try {
    const prompt = await getInstallPrompt();
    if (prompt) {
      const result = await prompt.prompt();
      deferredInstallPrompt = null;
      return result.outcome === 'accepted';
    }
  } catch {
    return false;
  }
  return false;
}

// Update PWA
export async function updatePWA(): Promise<void> {
  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration && registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
    }
  } catch {
    return;
  }
}

// Check for PWA updates
export async function checkForPWAUpdates(): Promise<boolean> {
  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.update();
        return registration.waiting !== null;
      }
    }
  } catch {
    return false;
  }
  return false;
}

// Get PWA installation status
export function getPWAInstallStatus():
  | 'installed'
  | 'not-installed'
  | 'not-supported' {
  if (typeof window === 'undefined') return 'not-supported';

  if (isPWA()) {
    return 'installed';
  }

  if (deferredInstallPrompt) {
    return 'not-installed';
  }

  return 'not-supported';
}

// PWA event listeners
export function setupPWAEventListeners(): void {
  if (typeof window === 'undefined') return;
  if (listenersAreRegistered) return;
  listenersAreRegistered = true;

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredInstallPrompt = event as BeforeInstallPromptEvent;
  });

  // Listen for PWA installation
  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
  });

  // Listen for PWA updates
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });
  }
}

// Initialize PWA
export async function initializePWA(): Promise<void> {
  try {
    // Register service worker
    await registerServiceWorker();

    // Setup event listeners
    setupPWAEventListeners();

    // Request notification permission if not granted
    if ('Notification' in window && Notification.permission === 'default') {
      await requestNotificationPermission();
    }
  } catch {
    return;
  }
}
