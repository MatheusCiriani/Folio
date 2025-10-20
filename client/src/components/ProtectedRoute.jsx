import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

const ProtectedRoute = () => {
    // Pega os dados do usuário do localStorage
    const user = JSON.parse(localStorage.getItem('usuarios'));

    // ATUALIZADO: Verifica se o usuário está logado E se a role dele é 'admin'
    // const isAdmin = user && user?.email === 'admin@admin.com' ;

    // Agora, apenas verifica se está logado:
    const isLoggedIn = user ? true : false;

    // Se for admin, permite o acesso à rota. Se não, redireciona para a home.
    return isLoggedIn ? <Outlet /> : <Navigate to="/" />;
};

export default ProtectedRoute;