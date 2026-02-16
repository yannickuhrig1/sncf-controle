import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { useFraudThresholds } from "@/hooks/useFraudThresholds";
import { AnimatePresence } from "framer-motion";
import { PageTransition } from "@/components/layout/PageTransition";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import NewControl from "./pages/NewControl";
import OnboardControl from "./pages/OnboardControl";
import StationControl from "./pages/StationControl";
import HistoryPage from "./pages/History";
import ProfilePage from "./pages/Profile";
import AdminPage from "./pages/Admin";
import ManagerPage from "./pages/Manager";
import StatisticsPage from "./pages/Statistics";
import SettingsPage from "./pages/Settings";
import InstallPage from "./pages/Install";
import InfosUtilesPage from "./pages/InfosUtiles";
import NotFound from "./pages/NotFound";

// Component to initialize global fraud thresholds from admin settings
function FraudThresholdsInitializer() {
  useFraudThresholds();
  return null;
}

const queryClient = new QueryClient();

const AnimatedRoutes = () => {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageTransition><Dashboard /></PageTransition>} />
        <Route path="/auth" element={<PageTransition><Auth /></PageTransition>} />
        <Route path="/control/new" element={<PageTransition><NewControl /></PageTransition>} />
        <Route path="/onboard" element={<PageTransition><OnboardControl /></PageTransition>} />
        <Route path="/station" element={<PageTransition><StationControl /></PageTransition>} />
        <Route path="/history" element={<PageTransition><HistoryPage /></PageTransition>} />
        <Route path="/statistics" element={<PageTransition><StatisticsPage /></PageTransition>} />
        <Route path="/profile" element={<PageTransition><ProfilePage /></PageTransition>} />
        <Route path="/settings" element={<PageTransition><SettingsPage /></PageTransition>} />
        <Route path="/manager" element={<PageTransition><ManagerPage /></PageTransition>} />
        <Route path="/admin" element={<PageTransition><AdminPage /></PageTransition>} />
        <Route path="/install" element={<PageTransition><InstallPage /></PageTransition>} />
        <Route path="/infos" element={<PageTransition><InfosUtilesPage /></PageTransition>} />
        <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
      </Routes>
    </AnimatePresence>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <FraudThresholdsInitializer />
      <TooltipProvider>
        <Sonner />
        <BrowserRouter>
          <AnimatedRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
