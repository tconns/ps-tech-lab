import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { DualPlayerPage } from './pages/DualPlayerPage'
import { ImageCachePage } from './pages/ImageCachePage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ImageCachePage />} />
        <Route path="/dual" element={<DualPlayerPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
