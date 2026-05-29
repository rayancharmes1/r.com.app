import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import ShopPage from './pages/ShopPage';
import AdminUsersPage from './pages/AdminUsersPage';
import MyShopPage from './pages/MyShopPage';
import BoutiquesPage from './pages/BoutiquesPage';
import BoutiquePage from './pages/BoutiquePage';
import InstallBanner from './components/InstallBanner';

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/shop/:discId" element={<ShopPage />} />
            <Route path="/admin/comptes" element={<AdminUsersPage />} />
            <Route path="/ma-boutique" element={<MyShopPage />} />
            <Route path="/boutiques" element={<BoutiquesPage />} />
            <Route path="/boutique/:shopId" element={<BoutiquePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <InstallBanner />
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  );
}
