import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import DailyBriefInbox from './DailyBriefInbox'
import './styles.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
    <DailyBriefInbox />
  </React.StrictMode>,
)
