// src/App.tsx
import { HashRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout.tsx';
import Dashboard from './pages/Dashboard.tsx';
import Members from './pages/Members.tsx';
import PrayerRequests from './pages/PrayerRequests.tsx';
import Login from './pages/Login.tsx';
import Signup from './pages/Signup.tsx';

import { AuthProvider } from './contexts/AuthContext.tsx';
import ForgotPassword from './pages/ForgotPassword.tsx';
import ResetPassword from './pages/ResetPassword.tsx';
import OldApp from "@/OldApp.tsx";

function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/old" element={<OldApp />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="members" element={<Members />} />
            <Route path="prayers" element={<PrayerRequests />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
          </Route>
        </Routes>
      </HashRouter>
    </AuthProvider>
  );
}

export default App;