import { useEffect, useState } from 'react'
import type { DesktopAction } from '../desktop/actions'
import { getErrorMessage } from '../desktop/error-messages'
import type { DesktopActionInvoker, DesktopActionResult } from '../desktop/types'

export const desktopBridgeUnavailableMessage =
  'Desktop bridge is unavailable. Make sure howcode desktop is running and connected to the same Tailscale network.'

/**
 * Check if we're running in a browser context with access to the desktop bridge.
 * This works when Pi-Mobile is served from the same origin as howcode dev server.
 */
export function hasLocalDesktopBridge() {
  return typeof window !== 'undefined' && typeof window.piDesktop?.invokeAction === 'function'
}

/**
 * Check if the remote desktop bridge (via Tailscale) should be used.
 * This is true when:
 * 1. We're not in a local context (no window.piDesktop)
 * 2. We have a stored bridge URL from a previous connection
 */
export function shouldUseRemoteBridge() {
  if (hasLocalDesktopBridge()) {
    return false
  }
  // Check if we have a stored bridge URL
  const stored = localStorage.getItem('pi-mobile-bridge-url')
  return Boolean(stored)
}

/**
 * Get the stored remote bridge URL.
 */
export function getRemoteBridgeUrl(): string | null {
  return localStorage.getItem('pi-mobile-bridge-url')
}

/**
 * Get the stored bridge token.
 */
export function getRemoteBridgeToken(): string | null {
  return localStorage.getItem('pi-mobile-bridge-token')
}

/**
 * Save bridge connection info.
 */
export function saveRemoteBridgeInfo(url: string, token: string) {
  localStorage.setItem('pi-mobile-bridge-url', url)
  localStorage.setItem('pi-mobile-bridge-token', token)
}

/**
 * Clear bridge connection info.
 */
export function clearRemoteBridgeInfo() {
  localStorage.removeItem('pi-mobile-bridge-url')
  localStorage.removeItem('pi-mobile-bridge-token')
}

export function useDesktopBridgeAvailable() {
  const [available, setAvailable] = useState(() => {
    // Check local bridge first
    if (hasLocalDesktopBridge()) {
      return true
    }
    // Check remote bridge
    return shouldUseRemoteBridge() && Boolean(getRemoteBridgeToken())
  })

  useEffect(() => {
    // Local bridge is always available if present
    if (hasLocalDesktopBridge()) {
      setAvailable(true)
      return
    }

    // For remote bridge, we need both URL and token
    const url = getRemoteBridgeUrl()
    const token = getRemoteBridgeToken()
    
    if (!url || !token) {
      setAvailable(false)
      return
    }

    let cancelled = false
    setAvailable(false)
    
    void fetch(`${url}/__howcode/config`, { cache: 'no-store' })
      .then((response) => {
        if (!cancelled) {
          setAvailable(response.ok)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAvailable(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  return available
}

/**
 * Check if a remote bridge is available at the given URL.
 */
export async function probeRemoteBridge(url: string): Promise<{ ok: boolean; token?: string }> {
  try {
    const response = await fetch(`${url}/__howcode/config`, {
      cache: 'no-store',
    })
    
    if (!response.ok) {
      return { ok: false }
    }
    
    const data = await response.json()
    return { ok: true, token: data.bridgeToken }
  } catch {
    return { ok: false }
  }
}

export function useDesktopBridge() {
  const invokeDesktopAction: DesktopActionInvoker = async (
    action: DesktopAction,
    payload = {},
  ): Promise<DesktopActionResult | null> => {
    // Try local bridge first (dev server or Electron)
    if (hasLocalDesktopBridge()) {
      try {
        const result = await window.piDesktop!.invokeAction(action, payload)
        return result
      } catch (error) {
        return {
          ok: false,
          at: new Date().toISOString(),
          payload: { action, payload },
          result: {
            error: getErrorMessage(error, 'Desktop action request failed.'),
          },
        }
      }
    }

    // Try remote bridge (Tailscale)
    const remoteUrl = getRemoteBridgeUrl()
    const remoteToken = getRemoteBridgeToken()
    
    if (!remoteUrl || !remoteToken) {
      return {
        ok: false,
        at: new Date().toISOString(),
        payload: { action, payload },
        result: {
          error: desktopBridgeUnavailableMessage,
        },
      }
    }

    try {
      const response = await fetch(`${remoteUrl}/__howcode/request/invokeAction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-howcode-dev-web-bridge-token': remoteToken,
        },
        body: JSON.stringify({ action, payload }),
      })

      if (!response.ok) {
        const text = await response.text()
        return {
          ok: false,
          at: new Date().toISOString(),
          payload: { action, payload },
          result: {
            error: `Request failed: ${response.status} ${text}`,
          },
        }
      }

      return await response.json()
    } catch (error) {
      return {
        ok: false,
        at: new Date().toISOString(),
        payload: { action, payload },
        result: {
          error: getErrorMessage(error, 'Desktop action request failed.'),
        },
      }
    }
  }

  return invokeDesktopAction
}
