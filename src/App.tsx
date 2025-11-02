import { AuthProvider } from './contexts/AuthContext';
import { Router, Route } from './components/Router';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { NewTrip } from './pages/NewTrip';
import { TripDetail } from './pages/TripDetail';
import { Compare } from './pages/Compare';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Route path="/">
          <Home />
        </Route>
        <Route path="/login">
          <Login />
        </Route>
        <Route path="/register">
          <Register />
        </Route>
        <Route path="/dashboard">
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        </Route>
        <Route path="/trip/new">
          <ProtectedRoute>
            <NewTrip />
          </ProtectedRoute>
        </Route>
        <Route path="/trip/:id">
          <ProtectedRoute>
            <TripDetail />
          </ProtectedRoute>
        </Route>
        <Route path="/trip/:id/compare">
          <ProtectedRoute>
            <Compare />
          </ProtectedRoute>
        </Route>
      </Router>
    </AuthProvider>
  );
}

export default App;
