import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { OfflineIndicator } from "@/components/OfflineIndicator";
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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <OfflineIndicator />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/add-item" element={<AddItem />} />
        <Route path="/bulk-import" element={<BulkImport />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/sold-items" element={<SoldItems />} />
        <Route path="/categories" element={<Categories />} />
        <Route path="/reports" element={<Reports />} />
          <Route path="/export-data" element={<ExportData />} />
          <Route path="/stock-analysis" element={<StockAnalysis />} />
          <Route path="/stock-print" element={<StockPrint />} />
          <Route path="/backup-restore" element={<BackupRestore />} />
          <Route path="/panchaloha-subcategories" element={<SubcategoryManagement />} />
          <Route path="/panchaloha-pieces" element={<PiecesManagement />} />
          <Route path="/data-importer" element={<DataImporter />} />
          <Route path="/update-brass-prices" element={<UpdateBrassPrices />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
