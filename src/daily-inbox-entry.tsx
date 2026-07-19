import { createRoot } from 'react-dom/client'
import TodaysDermBrief from './TodaysDermBrief'

const host = document.createElement('div')
host.id = 'todays-dermbrief-root'
document.body.appendChild(host)
createRoot(host).render(<TodaysDermBrief />)
