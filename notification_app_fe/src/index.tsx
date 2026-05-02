import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { initLogger } from 'logging-middleware'
import './style.css'

initLogger({
  email: process.env.REACT_APP_EMAIL as string,
  name: process.env.REACT_APP_NAME as string,
  rollNo: process.env.REACT_APP_ROLL_NO as string,
  accessCode: process.env.REACT_APP_ACCESS_CODE as string,
  clientID: process.env.REACT_APP_CLIENT_ID as string,
  clientSecret: process.env.REACT_APP_CLIENT_SECRET as string,
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
