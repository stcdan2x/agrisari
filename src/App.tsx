import { useLiveQuery } from 'dexie-react-hooks'
import { lazy, Suspense, useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Sidebar, TabBar, TopBar } from './components/AppNav'
import SyncBanner from './components/SyncBanner'
import { getStore } from './db/storeRepo'
import { startScheduler } from './sync/scheduler'
import DashboardPage from './pages/DashboardPage'
import FinancePage from './pages/finance/FinancePage'
import ReportsPage from './pages/finance/ReportsPage'
import InventoryPage from './pages/inventory/InventoryPage'
import CountPage from './pages/inventory/CountPage'
import ProductFormPage from './pages/inventory/ProductFormPage'
import ProductPage from './pages/inventory/ProductPage'
import Onboarding from './pages/Onboarding'
import PlanPage from './pages/plan/PlanPage'
import ScenarioPage from './pages/plan/ScenarioPage'
import NewPurchasePage from './pages/purchasing/NewPurchasePage'
import PayablesPage from './pages/purchasing/PayablesPage'
import PurchasePage from './pages/purchasing/PurchasePage'
import PurchasingPage from './pages/purchasing/PurchasingPage'
import SupplierFormPage from './pages/purchasing/SupplierFormPage'
import SupplierPage from './pages/purchasing/SupplierPage'
import SuppliersPage from './pages/purchasing/SuppliersPage'
import CustomerFormPage from './pages/sales/CustomerFormPage'
import CustomerPage from './pages/sales/CustomerPage'
import CustomersPage from './pages/sales/CustomersPage'
import DeliveriesPage from './pages/sales/DeliveriesPage'
import NewSalePage from './pages/sales/NewSalePage'
import ReceivablesPage from './pages/sales/ReceivablesPage'
import SalePage from './pages/sales/SalePage'
import SalesPage from './pages/sales/SalesPage'
import SettingsPage from './pages/SettingsPage'

// The Guide carries the compiled research (about 270 kB); its pages load on first visit so the
// content stays off the first paint, as the dashboard charts do.
const GuidePage = lazy(() => import('./pages/GuidePage'))
const GuideTopicPage = lazy(() => import('./pages/GuideTopicPage'))
const GlossaryPage = lazy(() => import('./pages/GlossaryPage'))

export default function App() {
  // undefined = still loading, null = no store yet
  const store = useLiveQuery(async () => (await getStore()) ?? null, [])
  const location = useLocation()
  // Background sync (P10): starts once the app is open; a no-op until connected.
  useEffect(() => startScheduler(), [])

  if (store === undefined) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="text-lg font-semibold text-brand-600">AgriSari</div>
      </div>
    )
  }

  const onOnboarding = location.pathname === '/onboarding'
  const justOnboarded = (location.state as { justOnboarded?: boolean } | null)?.justOnboarded
  if (store === null && !onOnboarding && !justOnboarded) return <Navigate to="/onboarding" replace />
  if (onOnboarding) return <Onboarding store={store} />
  if (store === null) return null // justOnboarded: the live query re-emits on the next tick

  return (
    <div className="min-h-dvh md:pl-56">
      <Sidebar />
      <TopBar />
      <SyncBanner />
      <main className="mx-auto max-w-3xl pb-20 md:pb-8">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/sales" element={<SalesPage />} />
          <Route path="/sales/new" element={<NewSalePage />} />
          <Route path="/sales/receivables" element={<ReceivablesPage />} />
          <Route path="/sales/deliveries" element={<DeliveriesPage />} />
          <Route path="/sales/customers" element={<CustomersPage />} />
          <Route path="/sales/customers/new" element={<CustomerFormPage />} />
          <Route path="/sales/customers/:id" element={<CustomerPage />} />
          <Route path="/sales/customers/:id/edit" element={<CustomerFormPage />} />
          <Route path="/sales/:id" element={<SalePage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/inventory/products/new" element={<ProductFormPage />} />
          <Route path="/inventory/count" element={<CountPage />} />
          <Route path="/inventory/products/:id" element={<ProductPage />} />
          <Route path="/inventory/products/:id/edit" element={<ProductFormPage />} />
          <Route path="/purchasing" element={<PurchasingPage />} />
          <Route path="/purchasing/suppliers" element={<SuppliersPage />} />
          <Route path="/purchasing/suppliers/new" element={<SupplierFormPage />} />
          <Route path="/purchasing/suppliers/:id" element={<SupplierPage />} />
          <Route path="/purchasing/suppliers/:id/edit" element={<SupplierFormPage />} />
          <Route path="/purchasing/new" element={<NewPurchasePage />} />
          <Route path="/purchasing/payables" element={<PayablesPage />} />
          <Route path="/purchasing/:id" element={<PurchasePage />} />
          <Route path="/finance" element={<FinancePage />} />
          <Route path="/finance/reports/:tab?" element={<ReportsPage />} />
          <Route path="/plan/scenarios/new" element={<ScenarioPage />} />
          <Route path="/plan/scenarios/:id" element={<ScenarioPage />} />
          <Route path="/plan/:tab?" element={<PlanPage />} />
          <Route
            path="/guide"
            element={
              <Suspense>
                <GuidePage />
              </Suspense>
            }
          />
          <Route
            path="/guide/glossary"
            element={
              <Suspense>
                <GlossaryPage />
              </Suspense>
            }
          />
          <Route
            path="/guide/:topic"
            element={
              <Suspense>
                <GuideTopicPage />
              </Suspense>
            }
          />
          <Route path="/settings" element={<SettingsPage store={store} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <TabBar />
    </div>
  )
}
