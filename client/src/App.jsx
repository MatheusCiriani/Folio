import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import AuthModal from './components/AuthModal'; // Criaremos este a seguir

// Importando as páginas
import HomePage from './pages/HomePage';
import BookDetailPage from './pages/BookDetailPage';
import AddBookPage from './pages/AddBookPage';
import EditBookPage from './pages/EditBookPage';

import ProtectedRoute from './components/ProtectedRoute'; // <<< IMPORTE A ROTA PROTEGIDA
import ProfilePage from './pages/ProfilePage'; // <<< IMPORTE A NOVA PÁGINA


import './App.css';

function App() {
  const [authModal, setAuthModal] = useState({ isOpen: false, view: 'login' });

  const openAuthModal = (view) => {
    setAuthModal({ isOpen: true, view });
  };

  const closeAuthModal = () => {
    setAuthModal({ isOpen: false, view: 'login' });
  };

  // Esta função será chamada após o login bem-sucedido
  const handleLoginSuccess = () => {
      closeAuthModal(); // Fecha o modal
      window.location.reload(); // Recarrega a página para refletir o estado de login
  };

  return (
    <Router>
      <div className="App">
        <Navbar openAuthModal={openAuthModal} />
        
        <main>
          <Routes>
              {/* Rotas Públicas */}
              <Route path="/" element={<HomePage />} />
              <Route path="/book/:id" element={<BookDetailPage openAuthModal={openAuthModal} />} />
              
              {/* Rotas Protegidas (qualquer usuário logado) */}
              <Route element={<ProtectedRoute />}>
                  <Route path="/admin/add-book" element={<AddBookPage />} />
                  <Route path="/admin/edit-book/:id" element={<EditBookPage />} />
                  <Route path="/profile" element={<ProfilePage />} /> {/* <<< ADICIONE ESTA ROTA */}
              </Route>
          </Routes>
      </main>

        {authModal.isOpen && (
          <AuthModal
            initialView={authModal.view}
            closeModal={closeAuthModal}
            onLoginSuccess={handleLoginSuccess} // Passe a função aqui
          />
        )}
      </div>
    </Router>
  );
}

export default App;