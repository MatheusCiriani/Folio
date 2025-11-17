import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
// IMPORTANTE: Certifique-se de que o arquivo folio-logo-navbar.svg está na pasta assets
import folioLogoNavbar from '../assets/folio-logo-navbar.svg'; 
import './Navbar.css';

// --- Ícones (Hamburger e User) ---
const HamburgerIcon = () => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <line x1="3" y1="12" x2="21" y2="12"></line>
        <line x1="3" y1="6" x2="21" y2="6"></line>
        <line x1="3" y1="18" x2="21" y2="18"></line>
    </svg>
);

const UserIcon = () => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width="20"
        height="20"
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
    >
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
        <circle cx="12" cy="7" r="4"></circle>
    </svg>
);


const Navbar = ({ openAuthModal }) => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('usuarios'));

    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null); 

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [dropdownRef]); 

    useEffect(() => {
        const handleStorageChange = () => {
            window.location.reload(); 
        };
        window.addEventListener('storage', handleStorageChange);
        return () => {
            window.removeEventListener('storage', handleStorageChange);
        };
    }, []);

    const handleLogout = async () => {
        try {
            const tokenToBlacklist = localStorage.getItem('token');
            await axios.post(
                '/api/auth/logout', 
                {}, 
                { headers: { 'Authorization': `Bearer ${tokenToBlacklist}` } }
            );
        } catch (error) {
            console.error("Erro ao fazer logout no backend:", error);
        } finally {
            localStorage.removeItem('token');
            localStorage.removeItem('usuarios');
            window.location.href = '/'; 
        }
    };

    return (
        <nav className="navbar">
            
            <div className="navbar-logo-container">
                <Link to="/" className="navbar-logo">
                    {/* SVG da Logo */}
                    <img src={folioLogoNavbar} alt="Fólio" />
                </Link>
                
                {token && (
                    <Link to="/profile" className="navbar-user-greeting">
                        Olá, {user?.nome}
                    </Link>
                )}
            </div>

            <div className="navbar-links">
                {token ? (
                    <div className="navbar-profile-menu" ref={dropdownRef}>
                        <button 
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)} 
                            className="profile-icon-button"
                        >
                            <HamburgerIcon />
                        </button>

                        {isDropdownOpen && (
                            <div className="profile-dropdown">
                                <div className="dropdown-header">
                                    Conta de {user?.nome}
                                </div>
                                
                                <Link to="/profile" className="dropdown-item-button">
                                    <UserIcon /> <span>Meu Perfil</span>
                                </Link>
                                
                                {user && (
                                    <Link to="/admin/add-book" className="dropdown-item-button dropdown-item-add">
                                        Adicionar Livro
                                    </Link>
                                )}
                                
                                <button onClick={handleLogout} className="dropdown-item-button dropdown-item-logout">
                                    Sair
                                </button>
                            </div>
                        )}
                    </div>
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