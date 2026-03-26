import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import DashboardPage from '@/pages/DashboardPage';
import SnippetDetailPage from '@/pages/SnippetDetailPage';
import CreateSnippetPage from '@/pages/CreateSnippetPage';
import VerifyEmailPage from '@/pages/VerifyEmailPage';
import ForgotPasswordPage from '@/pages/ForgotPasswordPage';
import ResetPasswordPage from '@/pages/ResetPasswordPage';
import FeedPage from '@/pages/FeedPage';
import PublicSnippetPage from '@/pages/PublicSnippetPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/feed" element={<FeedPage />} />
          <Route path="/feed/:id" element={<PublicSnippetPage />} />

          {/* Protected */}
          <Route element={<ProtectedRoute />}>
            <Route path="/my-snippets" element={<DashboardPage />} />
            <Route path="/snippets/new" element={<CreateSnippetPage />} />
            <Route path="/snippets/:id" element={<SnippetDetailPage />} />
            <Route path="/snippets/:id/edit" element={<CreateSnippetPage />} />
          </Route>

          {/* Fallback */}
          <Route path="/" element={<Navigate to="/feed" replace />} />
          <Route path="*" element={<Navigate to="/feed" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
