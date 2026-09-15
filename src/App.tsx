import { AppProvider } from './components/AppProvider'
import { AuthScreen } from './components/AuthScreen'
import { GroupScreen } from './components/GroupScreen'
import { HomeScreen } from './components/HomeScreen'
import { useApp } from './hooks/useApp'
import { isFamilyUnlocked } from './lib/api'
import './App.css'

function Gate() {
  const { session } = useApp()
  if (!isFamilyUnlocked() || !session?.memberId) return <AuthScreen />
  if (!session.groupId) return <GroupScreen />
  return <HomeScreen />
}

export default function App() {
  return (
    <AppProvider>
      <Gate />
    </AppProvider>
  )
}
