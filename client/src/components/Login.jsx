import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const Login = () => {
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

            
            setTimeout(() => {
                navigate('/dashboard'); 
            }, 1500);

        } catch (err) {
            setMessage(err.response?.data?.message || 'Erro ao fazer login.');
            setIsError(true);
            localStorage.removeItem('token');
            localStorage.removeItem('usuarios'); 
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
                        type="senha"
                        placeholder="Senha"
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
        </div>
    );
};

export default Login;