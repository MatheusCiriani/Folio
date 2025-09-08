import React, { useState } from 'react';
import axios from 'axios';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const { email, password } = formData;

  const onChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:5000/api/login', {
        email,
        password,
      });
      localStorage.setItem('token', res.data.token);
      setMessage('Login bem-sucedido! Redirecionando...');
      setIsError(false);
      // Você pode adicionar um redirecionamento aqui:
      // setTimeout(() => { window.location.href = '/dashboard'; }, 2000);
    } catch (err) {
      setMessage(err.response.data.message || 'Erro ao fazer login.');
      setIsError(true);
      localStorage.removeItem('token');
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