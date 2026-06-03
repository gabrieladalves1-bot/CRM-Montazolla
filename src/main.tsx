/* Main entry point for the application - renders the root React component */
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './main.css'

// @skip-protected: Do not remove. Required for React rendering.
document.documentElement.classList.add('dark')

createRoot(document.getElementById('root')!).render(<App />)
