import { HashRouter, Routes, Route } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import DashboardOverview from '@/pages/DashboardOverview';
import AdminPage from '@/pages/AdminPage';
import EinkaufslistenPage from '@/pages/EinkaufslistenPage';
import ArtikelPage from '@/pages/ArtikelPage';
import PersonenPage from '@/pages/PersonenPage';

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<DashboardOverview />} />
          <Route path="einkaufslisten" element={<EinkaufslistenPage />} />
          <Route path="artikel" element={<ArtikelPage />} />
          <Route path="personen" element={<PersonenPage />} />
          <Route path="admin" element={<AdminPage />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}