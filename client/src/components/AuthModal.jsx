import React, { useState } from 'react';
import Login from './Login';
import Register from './Register';
import './AuthModal.css'; // Crie um CSS para o modal

const AuthModal = ({ initialView, closeModal, onLoginSuccess  }) => {
    const [isLoginView, setIsLoginView] = useState(initialView === 'login');

    // Impede que o clique dentro do modal o feche
    const handleModalContentClick = (e) => {
        e.stopPropagation();
    };

    return (
        <div className="modal-overlay" onClick={closeModal}>
            <div className="modal-content" onClick={handleModalContentClick}>
                <button className="close-button" onClick={closeModal}>X</button>
                
                {isLoginView ? <Login onLoginSuccess={onLoginSuccess} /> : <Register />}

                <div className="toggle-auth">
                    {isLoginView ? (
                        <p>
                            Não tem uma conta?{' '}
                            <button onClick={() => setIsLoginView(false)}>Cadastre-se</button>
                        </p>
                    ) : (
                        <p>
                            Já tem uma conta?{' '}
                            <button onClick={() => setIsLoginView(true)}>Faça login</button>
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AuthModal;