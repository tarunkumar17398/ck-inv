import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import AddItem from "./pages/AddItem";
import Inventory from "./pages/Inventory";
import SoldItems from "./pages/SoldItems";
import Categories from "./pages/Categories";
import BulkImport from "./pages/BulkImport";
import Reports from "./pages/Reports";
import ExportData from "./pages/ExportData";
import StockAnalysis from "./pages/StockAnalysis";
import StockPrint from "./pages/StockPrint";
import BackupRestore from "./pages/BackupRestore";
import SubcategoryManagement from "./pages/SubcategoryManagement";
import PiecesManagement from "./pages/PiecesManagement";
import DataImporter from "./pages/DataImporter";
import UpdateBrassPrices from "./pages/UpdateBrassPrices";
import RfidApiTest from "./pages/RfidApiTest";
import BarcodePrint from "./pages/BarcodePrint";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <OfflineIndicator />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/add-item" element={<ProtectedRoute><AddItem /></ProtectedRoute>} />
            <Route path="/bulk-import" element={<ProtectedRoute><BulkImport /></ProtectedRoute>} />
            <Route path="/inventory" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
            <Route path="/sold-items" element={<ProtectedRoute><SoldItems /></ProtectedRoute>} />
            <Route path="/categories" element={<ProtectedRoute><Categories /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
            <Route path="/export-data" element={<ProtectedRoute><ExportData /></ProtectedRoute>} />
            <Route path="/stock-analysis" element={<ProtectedRoute><StockAnalysis /></ProtectedRoute>} />
            <Route path="/stock-print" element={<ProtectedRoute><StockPrint /></ProtectedRoute>} />
            <Route path="/backup-restore" element={<ProtectedRoute><BackupRestore /></ProtectedRoute>} />
            <Route path="/panchaloha-subcategories" element={<ProtectedRoute><SubcategoryManagement /></ProtectedRoute>} />
            <Route path="/panchaloha-pieces" element={<ProtectedRoute><PiecesManagement /></ProtectedRoute>} />
            <Route path="/data-importer" element={<ProtectedRoute><DataImporter /></ProtectedRoute>} />
            <Route path="/update-brass-prices" element={<ProtectedRoute><UpdateBrassPrices /></ProtectedRoute>} />
            <Route path="/rfid-api-test" element={<ProtectedRoute><RfidApiTest /></ProtectedRoute>} />
            <Route path="/barcode-print" element={<ProtectedRoute><BarcodePrint /></ProtectedRoute>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
