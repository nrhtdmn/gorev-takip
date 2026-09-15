import { AppProvider } from './components/AppProvider'
import { AuthScreen } from './components/AuthScreen'
import { HomeScreen } from './components/HomeScreen'
import { useApp } from './hooks/useApp'
import './App.css'

function Gate() {
  const { session } = useApp()
  if (!session?.unlocked) return <AuthScreen />
  return <HomeScreen />
}

export default function App() {
  return (
    <AppProvider>
      <Gate />
    </AppProvider>
  )
}
