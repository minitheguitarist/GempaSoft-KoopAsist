import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import './App.css';

// Placeholder Pages - We will replace these with real components later
import MemberList from './pages/MemberList';

import MemberRegister from './pages/MemberRegister';

import CoopList from './pages/CoopList';
import CoopRegister from './pages/CoopRegister';

import CoopDetail from './pages/CoopDetail';
import CoopMemberDues from './pages/CoopMemberDues';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/members" replace />} />
          <Route path="members" element={<MemberList />} />
          <Route path="members/new" element={<MemberRegister />} />
          <Route path="coops" element={<CoopList />} />
          <Route path="coops/new" element={<CoopRegister />} />
          <Route path="coops/:id" element={<CoopDetail />} />
          <Route path="coops/:coopId/members/:memberId" element={<CoopMemberDues />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
