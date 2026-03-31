import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";

// Layout
import { AdminLayout } from "./components/layout/AdminLayout";

// Pages
import { LoginPage } from "./pages/auth/LoginPage";
import { DashboardPage } from "./pages/dashboard/DashboardPage";
import { ExamListPage } from "./pages/exam/ExamListPage";
import { ExamCreatePage } from "./pages/exam/ExamCreatePage";
import { ImportExcelPage } from "./pages/exam/ImportExcelPage";
import { ExamDetailPage } from "./pages/exam/ExamDetailPage";
import { VocabManagementPage } from "./pages/vocab/VocabManagementPage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        
        {/* Dashboard & User Management (Shared component, different modes) */}
        <Route path="dashboard" element={<DashboardPage mode="overview" />} />
        <Route path="users" element={<DashboardPage mode="users" />} />
        
        {/* Exam Management */}
        <Route path="exams" element={<ExamListPage />} />
        <Route path="exams/new" element={<ExamCreatePage />} />
        <Route path="exams/import-excel" element={<ImportExcelPage />} />
        <Route path="exams/:examSetId" element={<ExamDetailPage />} />
        
        {/* Vocab Management */}
        <Route path="vocab" element={<VocabManagementPage />} />
      </Route>
    </Routes>
  );
}

export default App;
