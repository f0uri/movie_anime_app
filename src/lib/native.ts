/** تكامل أندرويد الأصلي: شريط الحالة، شاشة البداية، وزر الرجوع. */
import { IS_NATIVE } from './engine'

export async function initNative(onBack: () => boolean) {
  if (!IS_NATIVE) return
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar')
    await StatusBar.setStyle({ style: Style.Dark })
    await StatusBar.setBackgroundColor({ color: '#06060A' })
    await StatusBar.setOverlaysWebView({ overlay: false })
  } catch {}

  try {
    const { SplashScreen } = await import('@capacitor/splash-screen')
    await SplashScreen.hide()
  } catch {}

  try {
    const { App } = await import('@capacitor/app')
    App.addListener('backButton', ({ canGoBack }) => {
      // onBack يُرجع true إذا استهلك الحدث (أغلق لوحة/نافذة)
      if (onBack()) return
      if (canGoBack) window.history.back()
      else App.exitApp()
    })
  } catch {}
}

/** تبديل لون شريط الحالة مع الثيم. */
export async function syncStatusBar(theme: 'dark' | 'light') {
  if (!IS_NATIVE) return
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar')
    await StatusBar.setStyle({ style: theme === 'dark' ? Style.Dark : Style.Light })
    await StatusBar.setBackgroundColor({ color: theme === 'dark' ? '#06060A' : '#EEF0F6' })
  } catch {}
}
