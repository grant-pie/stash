import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import DashboardPage from '@/pages/DashboardPage';
import SnippetDetailPage from '@/pages/SnippetDetailPage';
import CreateSnippetPage from '@/pages/CreateSnippetPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected */}
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/snippets/new" element={<CreateSnippetPage />} />
            <Route path="/snippets/:id" element={<SnippetDetailPage />} />
            {/* Edit page can reuse CreateSnippetPage with pre-filled data — stub */}
            <Route path="/snippets/:id/edit" element={<CreateSnippetPage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
