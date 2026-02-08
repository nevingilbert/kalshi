import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { UserProvider, useUser } from './context/UserContext';
import Register from './pages/Register';
import Feed from './pages/Feed';
import BetDetail from './pages/BetDetail';
import Dashboard from './pages/Dashboard';
import Admin from './pages/Admin';

function ProtectedRoute({ children }) {
  const { user, loading } = useUser();
  if (loading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  if (!user) return <Navigate to="/register" replace />;
  return children;
}

function App() {
  return (
    <BrowserRouter>
      <UserProvider>
        <Routes>
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<ProtectedRoute><Feed /></ProtectedRoute>} />
          <Route path="/bet/:id" element={<ProtectedRoute><BetDetail /></ProtectedRoute>} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/admin-x7k9m2" element={<Admin />} />
        </Routes>
      </UserProvider>
    </BrowserRouter>
  );
}

export default App;
