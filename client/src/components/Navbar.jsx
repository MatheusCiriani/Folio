import React from 'react';
import { Link } from 'react-router-dom';

// Supondo que você tenha o logo aqui
import folioLogo from '../assets/folio-logo.jpeg'; 

// A função openAuthModal virá das props para abrir o modal
const Navbar = ({ openAuthModal }) => {
    // Lógica para verificar se o usuário está logado (ex: lendo do localStorage)
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('usuarios'));

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('usuarios');
        window.location.href = '/'; // Recarrega a página para o estado deslogado
    };

    return (
        <nav className="navbar">
            <Link to="/" className="navbar-logo">
                <img src={folioLogo} alt="Fólio Logo" style={{ width: '80px' }}/>
            </Link>
            <div className="navbar-links">
                {token ? (
                    <>
                        <span>Olá, {user?.nome}</span>
                        {/* Link para Adicionar Livro (Apenas para Admin) */}
                        {user?.email === 'admin@admin.com' && (
                            <Link to="/admin/add-book" className="btn-admin">Adicionar Livro</Link>
                        )}
                        <button onClick={handleLogout}>Sair</button>
                    </>
                ) : (
                    <>
                        <button onClick={() => openAuthModal('login')}>Entrar</button>
                        <button onClick={() => openAuthModal('register')} className="btn-primary">Cadastrar</button>
                    </>
                )}
            </div>
        </nav>
    );
};

export default Navbar;