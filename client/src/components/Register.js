import React, { useState } from 'react';
import axios from 'axios';

const Register = () => {
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
      const res = await axios.post('http://localhost:5000/api/register', {
        email,
        password,
      });
      setMessage(res.data.message);
      setIsError(false);
    } catch (err) {
      setMessage(err.response.data.message || 'Erro ao cadastrar.');
      setIsError(true);
    }
  };

  return (
    <div>
      <h2>Crie sua conta Fólio</h2>
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