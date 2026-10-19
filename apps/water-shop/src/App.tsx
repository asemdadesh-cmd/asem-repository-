import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router';
import { BottomNav } from './components/BottomNav';
import { Gate } from './components/Gate';
import { Toaster } from './components/ui/toast';
import { ListSkeleton } from './components/ui/misc';
import { startSync } from './lib/sync';
import { requestPersistentStorage } from './lib/db';
import Dashboard from './screens/Dashboard';
import NewSale from './screens/NewSale';

const Customers = lazy(() => import('./screens/Customers'));
const CustomerProfile = lazy(() => import('./screens/CustomerProfile'));
const Pay = lazy(() => import('./screens/Pay'));
const History = lazy(() => import('./screens/History'));
const TxnDetail = lazy(() => import('./screens/TxnDetail'));
const Expense = lazy(() => import('./screens/Expense'));
const Day = lazy(() => import('./screens/Day'));
const Reports = lazy(() => import('./screens/Reports'));
const More = lazy(() => import('./screens/More'));
const Catalog = lazy(() => import('./screens/settings/Catalog'));
const Settings = lazy(() => import('./screens/settings/Settings'));

function ScrollTop() {
  const { pathname } = useLocation();
  useEffect(() => window.scrollTo(0, 0), [pathname]);
  return null;
}

const Fallback = () => <div className="mx-auto max-w-lg px-4 pt-24"><ListSkeleton /></div>;

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
        <Suspense fallback={<Fallback />}>
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
        </Suspense>
        <BottomNav />
      </Gate>
    </BrowserRouter>
  );
}
