import { useCallback, useRef, useState } from 'react'
import { useAuthStore } from './store/auth'
import { useGameStore } from './store/game'
import LoginScreen from './screens/LoginScreen'
import SaveSlotsScreen from './screens/SaveSlotsScreen'
import BriefingScreen from './screens/BriefingScreen'
import InvestigationScreen from './screens/InvestigationScreen'
import ConfrontationScreen from './screens/ConfrontationScreen'
import FieldReportScreen from './screens/FieldReportScreen'
import DebugPanel from './components/DebugPanel'

const DEBUG_URL = new URLSearchParams(window.location.search).has('debug')
const TAP_TARGET_SIZE = 56   // px — invisible corner hit zone
const TAP_COUNT_NEEDED = 4
const TAP_WINDOW_MS = 3000

export default function App() {
  const token = useAuthStore((s) => s.token)
  const { slotId, state } = useGameStore()

  const [debugOpen, setDebugOpen] = useState(DEBUG_URL)
  const tapCount = useRef(0)
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleCornerTap = useCallback(() => {
    tapCount.current += 1
    if (tapTimer.current) clearTimeout(tapTimer.current)

    if (tapCount.current >= TAP_COUNT_NEEDED) {
      tapCount.current = 0
      setDebugOpen((v) => !v)
      return
    }

    tapTimer.current = setTimeout(() => {
      tapCount.current = 0
    }, TAP_WINDOW_MS)
  }, [])

  let screen: React.ReactNode

  if (!token) {
    screen = <LoginScreen />
  } else if (!slotId || !state) {
    screen = <SaveSlotsScreen />
  } else {
    switch (state.phase) {
      case 'setup':
      case 'briefing':
        screen = <BriefingScreen />
        break
      case 'investigation':
        screen = <InvestigationScreen />
        break
      case 'confrontation':
        screen = <ConfrontationScreen />
        break
      case 'fieldReport':
      case 'complete':
        screen = <FieldReportScreen />
        break
      default:
        screen = <SaveSlotsScreen />
    }
  }

  return (
    <>
      {screen}

      {/* Bottom-left corner tap zone — 4 taps within 3 s toggles debug panel */}
      <div
        onClick={handleCornerTap}
        style={{ width: TAP_TARGET_SIZE, height: TAP_TARGET_SIZE }}
        className="fixed bottom-0 left-0 z-[190] cursor-default select-none"
        aria-hidden="true"
      />

      {debugOpen && <DebugPanel onClose={() => setDebugOpen(false)} />}
    </>
  )
}
