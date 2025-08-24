// client/src/components/Register.jsx
import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom'; // Para redirecionar o usuário

const Register = () => {
    // ALTERADO: Adicionado 'nome' ao estado do formulário
    const [formData, setFormData] = useState({
        nome: '',
        email: '',
        password: '',
    });
    const [message, setMessage] = useState('');
    const [isError, setIsError] = useState(false);
    const navigate = useNavigate(); // Hook para navegação

    // ALTERADO: Desestruturado 'nome'
    const { nome, email, password } = formData;

    const onChange = (e) =>
        setFormData({ ...formData, [e.target.name]: e.target.value });

    const onSubmit = async (e) => {
        e.preventDefault();
        try {
            // ALTERADO: URL da API aponta para a porta 3001
            // ALTERADO: Enviando 'nome' junto com email e password
            const res = await axios.post('http://localhost:3001/api/register', {
                nome,
                email,
                password,
            });

            setMessage(res.data.message + ' Redirecionando para o login...');
            setIsError(false);

            // NOVO: Redireciona para a página de login após 2 segundos
            setTimeout(() => {
                navigate('/login');
            }, 2000);

        } catch (err) {
            setMessage(err.response?.data?.message || 'Erro ao cadastrar.');
            setIsError(true);
        }
    };

    return (
        <div>
            <h2>Crie sua conta Fólio</h2>
            <form className="auth-form" onSubmit={onSubmit}>
                {/* NOVO: Campo de input para o nome */}
                <div className="form-group">
                    <input
                        type="text"
                        placeholder="Nome Completo"
                        name="nome"
                        value={nome}
                        onChange={onChange}
                        required
                    />
                </div>
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
                        placeholder="Senha (mínimo 6 caracteres)"
                        name="password"
                        value={password}
                        onChange={onChange}
                        minLength="6"
                        required
                    />
                </div>
                <button type="submit" className="submit-btn">Cadastrar</button>
            </form>
            {message && (
                <p className={`message ${isError ? 'error' : 'success'}`}>{message}</p>
            )}
        </div>
    );
};

export default Register;