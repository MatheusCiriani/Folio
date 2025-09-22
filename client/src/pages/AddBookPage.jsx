import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
// Adicione um pouco de CSS para o formulário
import './AdminForms.css';

const AddBookPage = () => {
    const [titulo, setTitulo] = useState('');
    const [autor, setAutor] = useState('');
    const [sinopse, setSinopse] = useState('');
    const [capa, setCapa] = useState(null);
    const [message, setMessage] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const formData = new FormData();
        formData.append('titulo', titulo);
        formData.append('autor', autor);
        formData.append('sinopse', sinopse);
        formData.append('capa', capa);

        try {
            const token = localStorage.getItem('token');
            const res = await axios.post('http://localhost:3001/api/books', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'Authorization': `Bearer ${token}`
                }
            });
            setMessage('Livro adicionado com sucesso! Redirecionando...');
            setTimeout(() => navigate(`/book/${res.data.id}`), 2000);
        } catch (err) {
            setMessage(err.response?.data?.message || 'Erro ao adicionar livro.');
        }
    };

    return (
        <div className="admin-form-container">
            <h2>Adicionar Novo Livro</h2>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>Título</label>
                    <input type="text" value={titulo} onChange={e => setTitulo(e.target.value)} required />
                </div>
                <div className="form-group">
                    <label>Autor</label>
                    <input type="text" value={autor} onChange={e => setAutor(e.target.value)} required />
                </div>
                <div className="form-group">
                    <label>Sinopse</label>
                    <textarea value={sinopse} onChange={e => setSinopse(e.target.value)} required />
                </div>
                <div className="form-group">
                    <label>Capa do Livro</label>
                    <input type="file" onChange={e => setCapa(e.target.files[0])} required />
                </div>
                <button type="submit" className="submit-btn">Adicionar Livro</button>
            </form>
            {message && <p className="message">{message}</p>}
        </div>
    );
};

export default AddBookPage;