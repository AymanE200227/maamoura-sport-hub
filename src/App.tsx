import { Suspense, lazy } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import LoadingScreen from "./components/LoadingScreen";

// Lazy load pages for better performance
const Login = lazy(() => import("./pages/Login"));
const Accueil = lazy(() => import("./pages/Accueil"));
const StudentDashboard = lazy(() => import("./pages/StudentDashboard"));
const CoursDetail = lazy(() => import("./pages/CoursDetail"));
const CoursContent = lazy(() => import("./pages/CoursContent"));
const GestionCours = lazy(() => import("./pages/GestionCours"));
const Parametres = lazy(() => import("./pages/Parametres"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/accueil" element={<Accueil />} />
            <Route path="/dashboard" element={<StudentDashboard />} />
            <Route path="/cours/:typeId" element={<CoursDetail />} />
            <Route path="/cours/:typeId/stage/:stageId/course/:courseId" element={<CoursContent />} />
            <Route path="/gestion-cours" element={<GestionCours />} />
            <Route path="/parametres" element={<Parametres />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
