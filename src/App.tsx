import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { DualPlayerPage } from './pages/DualPlayerPage'
import { ImageCachePage } from './pages/ImageCachePage'
import { LivePlayerPage } from './pages/LivePlayerPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LivePlayerPage />} />
        <Route path="/cache" element={<ImageCachePage />} />
        <Route path="/dual" element={<DualPlayerPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
