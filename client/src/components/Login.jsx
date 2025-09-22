import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

import folioLogo from '../assets/folio-logo.jpeg'; // Importe seu logo

const Login = ({ onLoginSuccess }) => {
    const [formData, setFormData] = useState({
        email: '',
        senha: '',
    });
    const [message, setMessage] = useState('');
    const [isError, setIsError] = useState(false);
    const navigate = useNavigate();

    const { email, senha } = formData;

    const onChange = (e) =>
        setFormData({ ...formData, [e.target.name]: e.target.value });

    const onSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post('http://localhost:3001/api/login', {
                email,
                senha,
            });

            localStorage.setItem('token', res.data.token);
            localStorage.setItem('usuarios', JSON.stringify(res.data.usuarios));

            setMessage('Login bem-sucedido! Redirecionando...');
            setIsError(false);

            // Chame a função de sucesso que recebemos via prop
            // Isso vai fechar o modal e recarregar a página
            if (onLoginSuccess) {
                onLoginSuccess();
            }

            // O redirecionamento para o dashboard pode ser removido se o desejado
            // é apenas atualizar a página atual. A função onLoginSuccess cuidará disso.
            // setTimeout(() => {
            //     navigate('/dashboard'); 
            // }, 1500);

        } catch (err) {
            setMessage(err.response?.data?.message || 'Erro ao fazer login.');
            setIsError(true);
            localStorage.removeItem('token');
            localStorage.removeItem('usuarios'); 
        }
    };

    return (
        <div>
            <div className="modal-header">
                <img src={folioLogo} alt="Fólio Logo" />
                <h2>Entrar na sua conta</h2>
            </div>
            <form className="auth-form" onSubmit={onSubmit}>
                <div className="form-group">
                    <label htmlFor="email">Email</label>
                    <input
                        id="email"
                        type="email"
                        placeholder="seu@email.com"
                        name="email"
                        value={email}
                        onChange={onChange}
                        required
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="senha">Senha</label>
                    <input
                        id="senha"
                        type="password" /* Corrigido de 'senha' para 'password' */
                        placeholder="Sua senha"
                        name="senha"
                        value={senha}
                        onChange={onChange}
                        required
                    />
                </div>
                <button type="submit" className="submit-btn">Entrar</button>
            </form>
            {message && (
                <p className={`message ${isError ? 'error' : 'success'}`}>{message}</p>
            )}
            {/* FIM DO BLOCO */}
        </div>
    );
};

export default Login;