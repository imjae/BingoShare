import CreateScreen from './screens/CreateScreen'
import PlayScreen from './screens/PlayScreen'
import ShareScreen from './screens/ShareScreen'
import { useRoute } from './lib/route'

export default function App() {
  const route = useRoute()

  switch (route.kind) {
    case 'share':
      return <ShareScreen payload={route.payload} />
    case 'play':
      return <PlayScreen payload={route.payload} />
    default:
      return <CreateScreen />
  }
}
