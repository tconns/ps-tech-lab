import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { DualPlayerPage } from './pages/DualPlayerPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DualPlayerPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
