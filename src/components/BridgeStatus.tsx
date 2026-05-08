/**
 * Bridge Status Component - Shows connection status to desktop bridge
 */

import { useEffect, useState } from 'react'
import {
  clearRemoteBridgeInfo,
  getRemoteBridgeUrl,
  getRemoteBridgeToken,
  probeRemoteBridge,
  saveRemoteBridgeInfo,
} from '../app/hooks/useDesktopBridge'

export interface BridgeStatusState {
  connected: boolean
  connecting: boolean
  bridgeUrl: string | null
  error: string | null
}

export function useBridgeStatus(): BridgeStatusState {
  const [state, setState] = useState<BridgeStatusState>({
    connected: false,
    connecting: false,
    bridgeUrl: getRemoteBridgeUrl(),
    error: null,
  })

  useEffect(() => {
    const url = getRemoteBridgeUrl()
    const token = getRemoteBridgeToken()

    if (!url) {
      setState({
        connected: false,
        connecting: false,
        bridgeUrl: null,
        error: null,
      })
      return
    }

    if (!token) {
      setState({
        connected: false,
        connecting: false,
        bridgeUrl: url,
        error: 'Not connected - tap to connect',
      })
      return
    }

    // Check connection
    setState((s) => ({ ...s, connecting: true, error: null }))

    void probeRemoteBridge(url).then((result) => {
      if (result.ok) {
        saveRemoteBridgeInfo(url, result.token || token)
        setState({
          connected: true,
          connecting: false,
          bridgeUrl: url,
          error: null,
        })
      } else {
        clearRemoteBridgeInfo()
        setState({
          connected: false,
          connecting: false,
          bridgeUrl: null,
          error: 'Connection failed - tap to retry',
        })
      }
    })
  }, [])

  const connect = async () => {
    let url = getRemoteBridgeUrl()
    
    // Default to laptop's Tailscale address
    if (!url) {
      url = 'http://pcmainen.tail94f992.ts.net:5174'
    }

    setState((s) => ({ ...s, connecting: true, error: null }))

    const result = await probeRemoteBridge(url)

    if (result.ok && result.token) {
      saveRemoteBridgeInfo(url, result.token)
      setState({
        connected: true,
        connecting: false,
        bridgeUrl: url,
        error: null,
      })
    } else {
      setState({
        connected: false,
        connecting: false,
        bridgeUrl: url,
        error: 'Failed to connect to desktop',
      })
    }
  }

  const disconnect = () => {
    clearRemoteBridgeInfo()
    setState({
      connected: false,
      connecting: false,
      bridgeUrl: null,
      error: null,
    })
  }

  return { ...state, connect, disconnect }
}

export default function BridgeStatus() {
  const { connected, connecting, bridgeUrl, error, connect, disconnect } = useBridgeStatus()

  if (connecting) {
    return (
      <div className="bridge-status connecting">
        <span className="bridge-status-dot connecting" />
        <span className="bridge-status-text">Connecting...</span>
      </div>
    )
  }

  if (connected) {
    return (
      <button className="bridge-status connected" onClick={disconnect} title="Connected to desktop - tap to disconnect">
        <span className="bridge-status-dot connected" />
        <span className="bridge-status-text">Desktop Connected</span>
      </button>
    )
  }

  return (
    <button className="bridge-status disconnected" onClick={connect} title={error || 'Connect to desktop'}>
      <span className="bridge-status-dot disconnected" />
      <span className="bridge-status-text">{error || 'Connect to Desktop'}</span>
    </button>
  )
}
