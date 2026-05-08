/**
 * Remote Bridge Hook - Connect to howcode desktop via Tailscale
 * 
 * This allows Pi-Mobile to invoke desktop actions over HTTP when
 * connected to the same Tailscale network.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { DesktopAction } from '../desktop/actions'
import { getErrorMessage } from '../desktop/error-messages'
import type { DesktopActionInvoker, DesktopActionResult } from '../desktop/types'

export interface BridgeConfig {
  url: string
  token: string
}

export interface UseRemoteBridgeOptions {
  /** Auto-connect on mount */
  autoConnect?: boolean
  /** Called when connection status changes */
  onStatusChange?: (connected: boolean) => void
}

export interface UseRemoteBridgeResult {
  /** Whether we're currently connected */
  connected: boolean
  /** Whether we're trying to connect */
  connecting: boolean
  /** The bridge URL (null if not connected) */
  bridgeUrl: string | null
  /** Error message if connection failed */
  error: string | null
  /** Invoke a desktop action through the bridge */
  invokeAction: DesktopActionInvoker
  /** Connect to a bridge */
  connect: (config: BridgeConfig) => Promise<void>
  /** Disconnect from the bridge */
  disconnect: () => void
}

const DEFAULT_BRIDGE_PORT = 5174

function getDefaultBridgeUrl(): string | null {
  // Try to detect the desktop's Tailscale address
  // This would typically be stored in settings or discovered via Tailscale API
  const stored = localStorage.getItem('pi-mobile-bridge-url')
  if (stored) {
    return stored
  }
  
  // Default to the known laptop Tailscale address
  return 'http://pcmainen.tail94f992.ts.net:5174'
}

function saveBridgeUrl(url: string) {
  localStorage.setItem('pi-mobile-bridge-url', url)
}

export function useRemoteBridge(
  options: UseRemoteBridgeOptions = {},
): UseRemoteBridgeResult {
  const { autoConnect = true, onStatusChange } = options
  
  const [connected, setConnected] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [bridgeUrl, setBridgeUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [bridgeToken, setBridgeToken] = useState<string | null>(null)
  
  const invokeActionRef = useRef<DesktopActionInvoker | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const updateStatus = useCallback((newConnected: boolean) => {
    setConnected(newConnected)
    onStatusChange?.(newConnected)
  }, [onStatusChange])

  const disconnect = useCallback(() => {
    abortControllerRef.current?.abort()
    abortControllerRef.current = null
    setBridgeToken(null)
    setBridgeUrl(null)
    setConnected(false)
    setConnecting(false)
    updateStatus(false)
  }, [updateStatus])

  const connect = useCallback(async (config: BridgeConfig) => {
    // Disconnect first if already connected
    disconnect()
    
    setConnecting(true)
    setError(null)
    abortControllerRef.current = new AbortController()
    
    try {
      // Fetch the bridge config to validate connection and get token
      const response = await fetch(`${config.url}/__howcode/config`, {
        signal: abortControllerRef.current.signal,
        cache: 'no-store',
      })
      
      if (!response.ok) {
        throw new Error(`Failed to connect: ${response.status} ${response.statusText}`)
      }
      
      const data = await response.json()
      
      if (!data.bridgeToken) {
        throw new Error('Invalid bridge response: missing token')
      }
      
      setBridgeToken(data.bridgeToken)
      setBridgeUrl(config.url)
      saveBridgeUrl(config.url)
      setConnected(true)
      setConnecting(false)
      updateStatus(true)
      
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Connection was cancelled, ignore
        return
      }
      
      setError(err instanceof Error ? err.message : 'Failed to connect')
      setConnecting(false)
      setConnected(false)
      updateStatus(false)
    }
  }, [disconnect, updateStatus])

  const invokeAction: DesktopActionInvoker = useCallback(async (
    action: DesktopAction,
    payload = {},
  ): Promise<DesktopActionResult | null> => {
    if (!bridgeUrl || !bridgeToken) {
      return {
        ok: false,
        at: new Date().toISOString(),
        payload: { action, payload },
        result: {
          error: 'Not connected to desktop bridge. Please connect first.',
        },
      }
    }

    try {
      const response = await fetch(`${bridgeUrl}/__howcode/request/invokeAction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-howcode-dev-web-bridge-token': bridgeToken,
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

      const result = await response.json()
      return result

    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return {
          ok: false,
          at: new Date().toISOString(),
          payload: { action, payload },
          result: {
            error: 'Request was cancelled',
          },
        }
      }
      
      return {
        ok: false,
        at: new Date().toISOString(),
        payload: { action, payload },
        result: {
          error: getErrorMessage(err, 'Desktop action request failed.'),
        },
      }
    }
  }, [bridgeUrl, bridgeToken])

  // Store invokeAction in ref so it can be used in the auto-connect effect
  invokeActionRef.current = invokeAction

  // Auto-connect on mount if enabled
  useEffect(() => {
    if (autoConnect && !bridgeUrl) {
      const url = getDefaultBridgeUrl()
      if (url) {
        void connect({ url, token: '' }) // Token will be fetched during connect
      }
    }
  }, [autoConnect, bridgeUrl, connect])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
    }
  }, [])

  return {
    connected,
    connecting,
    bridgeUrl,
    error,
    invokeAction,
    connect,
    disconnect,
  }
}

/**
 * Hook to check if a bridge is reachable at a given URL
 */
export async function probeBridge(url: string): Promise<{ ok: boolean; token?: string }> {
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
