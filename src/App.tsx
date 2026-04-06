import { HashRouter, Routes, Route } from 'react-router-dom';
import { ActionsProvider } from '@/context/ActionsContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Layout } from '@/components/Layout';
import DashboardOverview from '@/pages/DashboardOverview';
import AdminPage from '@/pages/AdminPage';
import EinkaufslistenPage from '@/pages/EinkaufslistenPage';
import PersonenPage from '@/pages/PersonenPage';
import ArtikelPage from '@/pages/ArtikelPage';

export default function App() {
  return (
    <ErrorBoundary>
      <HashRouter>
        <ActionsProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<DashboardOverview />} />
              <Route path="einkaufslisten" element={<EinkaufslistenPage />} />
              <Route path="personen" element={<PersonenPage />} />
              <Route path="artikel" element={<ArtikelPage />} />
              <Route path="admin" element={<AdminPage />} />
            </Route>
          </Routes>
        </ActionsProvider>
      </HashRouter>
    </ErrorBoundary>
  );
}
