import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const Login = () => {
    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });
    const [message, setMessage] = useState('');
    const [isError, setIsError] = useState(false);
    const navigate = useNavigate();

    const { email, password } = formData;

    const onChange = (e) =>
        setFormData({ ...formData, [e.target.name]: e.target.value });

    const onSubmit = async (e) => {
        e.preventDefault();
        try {
            // ALTERADO: URL da API aponta para a porta 3001
            const res = await axios.post('http://localhost:3001/api/login', {
                email,
                password,
            });

            // Salva o token e os dados do usuário no Local Storage
            localStorage.setItem('token', res.data.token);
            // NOVO: Salva o objeto do usuário para fácil acesso (ex: "Bem-vindo, Elias!")
            localStorage.setItem('user', JSON.stringify(res.data.user));

            setMessage('Login bem-sucedido! Redirecionando...');
            setIsError(false);

            // NOVO: Redireciona para o dashboard após 1.5 segundos
            setTimeout(() => {
                navigate('/dashboard'); // Ou para a página principal do app
            }, 1500);

        } catch (err) {
            setMessage(err.response?.data?.message || 'Erro ao fazer login.');
            setIsError(true);
            localStorage.removeItem('token');
            localStorage.removeItem('user'); // NOVO: Limpa também o usuário
        }
    };

    return (
        <div>
            <h2>Entrar na sua conta</h2>
            <form className="auth-form" onSubmit={onSubmit}>
                <div className="form-group">
                    <input
                        type="email"
                        placeholder="Email"
                        name="email"
                        value={email}
                        onChange={onChange}
                        required
                    />
                </div>
                <div className="form-group">
                    <input
                        type="password"
                        placeholder="Senha"
                        name="password"
                        value={password}
                        onChange={onChange}
                        required
                    />
                </div>
                <button type="submit" className="submit-btn">Entrar</button>
            </form>
            {message && (
                <p className={`message ${isError ? 'error' : 'success'}`}>{message}</p>
            )}
        </div>
    );
};

export default Login;