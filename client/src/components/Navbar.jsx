import React from 'react';
import { Link } from 'react-router-dom';
import folioLogo from '../assets/folio-logo.jpeg'; 
import axios from 'axios'; // <<< 1. IMPORTE O AXIOS

const Navbar = ({ openAuthModal }) => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('usuarios'));

    // 2. TRANSFORME A FUNÇÃO EM ASYNC E ADICIONE A CHAMADA DA API
    const handleLogout = async () => {
        try {
            // Pega o token antes de removê-lo
            const tokenToBlacklist = localStorage.getItem('token');
            
            // Chama a API de logout para invalidar o token no backend
            await axios.post(
                'http://localhost:3001/api/auth/logout', 
                {}, // Corpo vazio
                { headers: { 'Authorization': `Bearer ${tokenToBlacklist}` } }
            );

        } catch (error) {
            // Mesmo se falhar (ex: token já expirou), continua o logout no frontend
            console.error("Erro ao fazer logout no backend:", error);
        } finally {
            // 3. Limpa o localStorage e recarrega a página
            localStorage.removeItem('token');
            localStorage.removeItem('usuarios');
            window.location.href = '/'; 
        }
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
                        {/* {user?.email === 'admin@admin.com' && (
                            <Link to="/admin/add-book" className="btn-admin">Adicionar Livro</Link>
                        )} */}
                        {user && ( 
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