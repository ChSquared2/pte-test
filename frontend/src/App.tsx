import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import HomePage from './pages/HomePage';
import PracticePage from './pages/PracticePage';
import ExamPage from './pages/ExamPage';
import DashboardPage from './pages/DashboardPage';
import ExamResultsPage from './pages/ExamResultsPage';
import UserSelectPage from './pages/UserSelectPage';
import { UserProvider, useUser, USER_LABELS } from './context/UserContext';

function NavBar() {
  const location = useLocation();
  const { currentUser, setCurrentUser } = useUser();
  const isExamActive = location.pathname === '/exam';

  if (isExamActive) return null;

  return (
    <nav className="bg-[#003057] text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-xl font-bold text-[#F2A900]">PTE</span>
            <span className="text-lg font-medium">Academic Simulator</span>
          </Link>
          <div className="flex gap-6 items-center">
            <NavLink to="/" current={location.pathname}>Home</NavLink>
            <NavLink to="/practice" current={location.pathname}>Practice</NavLink>
            <NavLink to="/exam" current={location.pathname}>Exam</NavLink>
            <NavLink to="/dashboard" current={location.pathname}>Dashboard</NavLink>
            {currentUser && (
              <button
                onClick={() => setCurrentUser(null)}
                className="ml-4 px-3 py-1.5 rounded-md text-sm bg-[#F2A900] text-[#003057] font-semibold hover:bg-[#e09d00]"
                title="Switch user"
              >
                {USER_LABELS[currentUser]} ⇄
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

function NavLink({ to, current, children }: { to: string; current: string; children: React.ReactNode }) {
  const active = current === to;
  return (
    <Link
      to={to}
      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
        active ? 'bg-[#0072CE] text-white' : 'text-gray-300 hover:text-white hover:bg-[#003057]/80'
      }`}
    >
      {children}
    </Link>
  );
}

function AppShell() {
  const { currentUser } = useUser();
  if (!currentUser) return <UserSelectPage />;
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <NavBar />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/practice" element={<PracticePage />} />
          <Route path="/exam" element={<ExamPage />} />
          <Route path="/exam/results/:sessionId" element={<ExamResultsPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

function App() {
  return (
    <UserProvider>
      <AppShell />
    </UserProvider>
  );
}

export default App;
