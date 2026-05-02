import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { initLogger } from 'logging-middleware'
import './style.css'

initLogger({
  email: import.meta.env.VITE_EMAIL,
  name: import.meta.env.VITE_NAME,
  rollNo: import.meta.env.VITE_ROLL_NO,
  accessCode: import.meta.env.VITE_ACCESS_CODE,
  clientID: import.meta.env.VITE_CLIENT_ID,
  clientSecret: import.meta.env.VITE_CLIENT_SECRET,
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
