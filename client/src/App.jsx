import React, { useState, useEffect } from 'react';
import axios from 'axios';
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

// --- NOVOS MODAIS ---
import CreateListModal from './components/CreateListModal';
import ListDetailModal from './components/ListDetailModal';
import AddToListModal from './components/AddToListModal';
import ConfirmModal from './components/ConfirmModal'; // (Já deve existir)


import './App.css';

function App() {
  const [authModal, setAuthModal] = useState({ isOpen: false, view: 'login' });

  useEffect(() => {
    // Configura um interceptador de respostas do Axios
    const interceptor = axios.interceptors.response.use(
      response => response, // Passa as respostas de sucesso
      error => {
        // Verifica se o erro é de token inválido/expirado
        if (error.response && (error.response.status === 400 || error.response.status === 401)) {
          const errorMessage = error.response.data?.message || '';
          
          // O authMiddleware.js envia 'Token inválido.'
          if (errorMessage.includes('Token inválido')) { 
            console.error("Token expirado ou inválido. Deslogando...");
            
            // Limpa os dados do usuário do localStorage
            localStorage.removeItem('token');
            localStorage.removeItem('usuarios');
            
            // Força um recarregamento da página para atualizar a UI
            window.location.reload(); 
          }
        }
        // Retorna o erro para que outros 'catch' possam lidar com ele
        return Promise.reject(error);
      }
    );

    // Limpa o interceptador quando o componente for desmontado
    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, []);

  // --- NOVOS ESTADOS DE MODAL ---
  // 1. Para Criar/Editar Lista (controlado pela ProfilePage)
  const [createListModal, setCreateListModal] = useState({ isOpen: false, listToEdit: null });
  // 2. Para Ver os livros numa lista (controlado pela ProfilePage e UserProfileModal)
  const [listDetailModalId, setListDetailModalId] = useState(null);
  // 3. Para Adicionar um livro a uma lista (controlado pela BookDetailPage)
  const [addToListModalBookId, setAddToListModalBookId] = useState(null);
  // 4. Para Confirmar Deleção (controlado pela ProfilePage)
  const [confirmDeleteList, setConfirmDeleteList] = useState({ isOpen: false, listId: null, onConfirm: null });

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

  // --- Funções dos Novos Modais ---
  const openCreateListModal = (listToEdit = null) => setCreateListModal({ isOpen: true, listToEdit });
  const closeCreateListModal = () => setCreateListModal({ isOpen: false, listToEdit: null });
  
  const openListDetailModal = (listId) => setListDetailModalId(listId);
  const closeListDetailModal = () => setListDetailModalId(null);
  
  const openAddToListModal = (bookId) => setAddToListModalBookId(bookId);
  const closeAddToListModal = () => setAddToListModalBookId(null);
  
  const openConfirmDeleteModal = (listId, onConfirm) => setConfirmDeleteList({ isOpen: true, listId, onConfirm });
  const closeConfirmDeleteModal = () => setConfirmDeleteList({ isOpen: false, listId: null, onConfirm: null });

  return (
    <Router>
      <div className="App">
        <Navbar openAuthModal={openAuthModal} />
        
        <main>
          <Routes>
              {/* Rotas Públicas */}
              <Route path="/" element={<HomePage />} />
              <Route 
                  path="/book/:id" 
                  element={<BookDetailPage 
                      openAuthModal={openAuthModal} 
                      openAddToListModal={openAddToListModal} // <<< Passe a função
                  />} 
              />
              
              {/* Rotas Protegidas */}
              <Route element={<ProtectedRoute />}>
                  <Route path="/admin/add-book" element={<AddBookPage />} />
                  <Route path="/admin/edit-book/:id" element={<EditBookPage />} />
                  <Route 
                      path="/profile" 
                      element={<ProfilePage 
                          openCreateListModal={openCreateListModal} // <<< Passe a função
                          openListDetailModal={openListDetailModal} // <<< Passe a função
                          openConfirmDeleteModal={openConfirmDeleteModal} // <<< Passe a função
                      />} 
                  />
              </Route>
          </Routes>
      </main>

        {/* --- Renderiza todos os modais --- */}
        {authModal.isOpen && (
          <AuthModal
            initialView={authModal.view}
            closeModal={closeAuthModal}
            onLoginSuccess={handleLoginSuccess}
          />
        )}
        
        {createListModal.isOpen && (
            <CreateListModal
                closeModal={closeCreateListModal}
                listToEdit={createListModal.listToEdit}
                onListCreated={createListModal.onListCreated} // <-- Passe o callback original
                openListDetailModal={openListDetailModal} // <-- PASSE A NOVA PROP
            />
        )}
        
        {listDetailModalId && (
            <ListDetailModal
                listId={listDetailModalId}
                closeModal={closeListDetailModal}
            />
        )}
        
        {addToListModalBookId && (
            <AddToListModal
                bookId={addToListModalBookId}
                closeModal={closeAddToListModal}
            />
        )}
        
        {confirmDeleteList.isOpen && (
            <ConfirmModal
                isOpen={true}
                onClose={closeConfirmDeleteModal}
                onConfirm={() => {
                    if (confirmDeleteList.onConfirm) {
                        confirmDeleteList.onConfirm();
                    }
                    closeConfirmDeleteModal();
                }}
                title="Confirmar Exclusão"
            >
                <p>Você tem certeza que deseja deletar esta lista? Esta ação não pode ser desfeita.</p>
            </ConfirmModal>
        )}
      </div>
    </Router>
  );
}

export default App;