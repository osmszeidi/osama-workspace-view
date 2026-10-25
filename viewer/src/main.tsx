import '@fontsource/inter/400.css'
import '@fontsource/inter/400-italic.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import '@fontsource/ibm-plex-sans-arabic/400.css'
import '@fontsource/ibm-plex-sans-arabic/600.css'
import '../../src/renderer/src/styles.css'
import './viewer.css'
import { createRoot } from 'react-dom/client'
import Viewer from './Viewer'

createRoot(document.getElementById('root')!).render(<Viewer />)
