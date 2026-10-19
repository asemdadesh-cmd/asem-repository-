import { useEffect } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router';
import { BottomNav } from './components/BottomNav';
import { Gate } from './components/Gate';
import { Toaster } from './components/ui/toast';
import { ErrorBoundary } from './components/ErrorBoundary';
import { startSync } from './lib/sync';
import { requestPersistentStorage } from './lib/db';
import Dashboard from './screens/Dashboard';
import NewSale from './screens/NewSale';

import Customers from './screens/Customers';
import CustomerProfile from './screens/CustomerProfile';
import Pay from './screens/Pay';
import History from './screens/History';
import TxnDetail from './screens/TxnDetail';
import Expense from './screens/Expense';
import Day from './screens/Day';
import Reports from './screens/Reports';
import More from './screens/More';
import Catalog from './screens/settings/Catalog';
import Settings from './screens/settings/Settings';

function ScrollTop() {
  const { pathname } = useLocation();
  useEffect(() => window.scrollTo(0, 0), [pathname]);
  return null;
}

export default function App() {
  useEffect(() => {
    startSync();
    void requestPersistentStorage();
  }, []);
  return (
    <BrowserRouter>
      <Toaster />
      <Gate>
        <ScrollTop />
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/sale" element={<NewSale />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/customers/:id" element={<CustomerProfile />} />
            <Route path="/pay" element={<Pay />} />
            <Route path="/history" element={<History />} />
            <Route path="/txn/:id" element={<TxnDetail />} />
            <Route path="/expense" element={<Expense />} />
            <Route path="/day" element={<Day />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/more" element={<More />} />
            <Route path="/settings/catalog" element={<Catalog />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Dashboard />} />
          </Routes>
        </ErrorBoundary>
        <BottomNav />
      </Gate>
    </BrowserRouter>
  );
}
