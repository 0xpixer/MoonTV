// PWA utilities for MoonTV

export interface LockScreenCoverData {
  poster: string;
  title: string;
  episode?: string;
  progress?: number;
}

// Update lock screen cover with current playing content
export async function updateLockScreenCover(data: LockScreenCoverData): Promise<void> {
  try {
    if ('serviceWorker' in navigator && 'serviceWorker' in navigator.serviceWorker) {
      const registration = await navigator.serviceWorker.ready;
      
      // Send message to service worker to update lock screen cover
      registration.active?.postMessage({
        type: 'UPDATE_LOCK_SCREEN_COVER',
        ...data
      });

      // For iOS Safari, we can also update the web app icon
      if (typeof window !== 'undefined' && 'navigator' in window) {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        
        if (isIOS) {
          // iOS Safari specific lock screen cover update
          // This would require additional implementation for actual lock screen cover updates
          console.log('iOS lock screen cover update:', data);
        }
      }
    }
  } catch (error) {
    console.error('Failed to update lock screen cover:', error);
  }
}

// Register service worker
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered successfully:', registration);
      return registration;
    }
  } catch (error) {
    console.error('Service Worker registration failed:', error);
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
  } catch (error) {
    console.error('Failed to request notification permission:', error);
  }
  return 'denied';
}

// Send notification
export async function sendNotification(title: string, options?: NotificationOptions): Promise<void> {
  try {
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(title, {
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        ...options
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    }
  } catch (error) {
    console.error('Failed to send notification:', error);
  }
}

// Check if app is running as PWA
export function isPWA(): boolean {
  if (typeof window === 'undefined') return false;
  
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://')
  );
}

// Get PWA installation prompt
export async function getInstallPrompt(): Promise<any> {
  try {
    if ('BeforeInstallPromptEvent' in window) {
      return new Promise((resolve) => {
        window.addEventListener('beforeinstallprompt', (e) => {
          e.preventDefault();
          resolve(e);
        });
      });
    }
  } catch (error) {
    console.error('Failed to get install prompt:', error);
  }
  return null;
}

// Install PWA
export async function installPWA(): Promise<boolean> {
  try {
    const prompt = await getInstallPrompt();
    if (prompt) {
      const result = await prompt.prompt();
      return result.outcome === 'accepted';
    }
  } catch (error) {
    console.error('Failed to install PWA:', error);
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
  } catch (error) {
    console.error('Failed to update PWA:', error);
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
  } catch (error) {
    console.error('Failed to check for PWA updates:', error);
  }
  return false;
}

// Get PWA installation status
export function getPWAInstallStatus(): 'installed' | 'not-installed' | 'not-supported' {
  if (typeof window === 'undefined') return 'not-supported';
  
  if (isPWA()) {
    return 'installed';
  }
  
  if ('BeforeInstallPromptEvent' in window) {
    return 'not-installed';
  }
  
  return 'not-supported';
}

// PWA event listeners
export function setupPWAEventListeners(): void {
  if (typeof window === 'undefined') return;

  // Listen for PWA installation
  window.addEventListener('appinstalled', () => {
    console.log('PWA installed successfully');
  });

  // Listen for PWA updates
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('PWA updated successfully');
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
    
    console.log('PWA initialized successfully');
  } catch (error) {
    console.error('Failed to initialize PWA:', error);
  }
} 