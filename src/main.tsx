import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { bootstrap, DeviceManager, PlatformDetector } from '@osiris-smarttv/device'
import { BootScreen } from './components/BootScreen'
import { isPs5Runtime, resolveForcedDevicePlatform } from './device'
import { installShakaPolyfills } from './player/installShakaPolyfills'
import './index.css'
import App from './App.tsx'

const container = document.getElementById('root')
if (!container) {
  throw new Error('#root missing')
}

const root = createRoot(container)

function renderApp(): void {
  installShakaPolyfills()
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

function logPlatform(phase: string): void {
  const detected = PlatformDetector.detect()
  const ps5 = isPs5Runtime()
  console.log(`[Lab] ${phase}`, {
    platform: detected.platform,
    platformVersion: detected.platformVersion,
    isPs5Runtime: ps5,
    hasMsdk: typeof window !== 'undefined' && 'msdk' in window,
    ua: typeof navigator !== 'undefined' ? navigator.userAgent : '',
  })
}

async function startApp(): Promise<void> {
  logPlatform('detect')

  root.render(
    <BootScreen
      message="Initializing PlayStation platform…"
      detail={
        isPs5Runtime()
          ? 'PS5 runtime (window.msdk) detected — waiting for MSDK preload'
          : 'Waiting for device bootstrap (Web adapter if not on PS5 shell)'
      }
    />,
  )

  // Spoofed PS5 UA without msdk → force Web adapter (same as react-playstation).
  const forcePlatform = resolveForcedDevicePlatform()

  await bootstrap({
    device: {
      logLevel: 'warn',
      ...(forcePlatform != null ? { forcePlatform } : {}),
    },
    onReady: () => {
      try {
        const info = DeviceManager.getInstance().info
        console.log('[Lab] Device initialized successfully', info)
      } catch (err) {
        console.log('[Lab] Device initialized successfully', err)
      }
      logPlatform('ready')
      renderApp()
    },
    onError: (err) => {
      console.error('[Lab] Platform initialization failed:', err)
      logPlatform('error')
      // Degraded: still open the lab so desktop/dev can run dual players.
      renderApp()
    },
  })
}

void startApp()
