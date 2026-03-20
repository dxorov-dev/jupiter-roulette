'use client'

import { useEffect, useCallback } from 'react'

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready: () => void
        close: () => void
        expand: () => void
        HapticFeedback?: {
          impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void
          notificationOccurred: (type: 'error' | 'success' | 'warning') => void
          selectionChanged: () => void
        }
        showPopup?: (params: {
          title?: string
          message: string
          buttons?: Array<{ type?: string; text?: string }>
        }, callback?: (buttonId: string) => void) => void
        showAlert?: (message: string, callback?: () => void) => void
        showConfirm?: (message: string, callback?: (confirmed: boolean) => void) => void
        themeParams?: {
          bg_color?: string
          text_color?: string
          hint_color?: string
          link_color?: string
          button_color?: string
          button_text_color?: string
        }
        version?: string
        platform?: string
        initData?: string
        init_data?: string
      }
    }
  }
}

export function useTelegram() {
  useEffect(() => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready()
      window.Telegram.WebApp.expand()
    }
  }, [])

  const haptic = useCallback((style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft' = 'light') => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.impactOccurred(style)
    }
  }, [])

  const notification = useCallback((type: 'error' | 'success' | 'warning') => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.notificationOccurred(type)
    }
  }, [])

  const close = useCallback(() => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      window.Telegram.WebApp.close()
    }
  }, [])

  const isTelegram = typeof window !== 'undefined' && !!window.Telegram?.WebApp

  return { haptic, notification, close, isTelegram }
}
