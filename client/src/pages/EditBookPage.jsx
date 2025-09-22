import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import './AdminForms.css';

const EditBookPage = () => {
    const { id } = useParams();
    const [titulo, setTitulo] = useState('');
    const [autor, setAutor] = useState('');
    const [sinopse, setSinopse] = useState('');
    const [capa, setCapa] = useState(null);
    const [currentCapaUrl, setCurrentCapaUrl] = useState('');
    const [message, setMessage] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const fetchBook = async () => {
            try {
                const res = await axios.get(`http://localhost:3001/api/books/${id}`);
                const book = res.data;
                setTitulo(book.titulo);
                setAutor(book.autor);
                setSinopse(book.sinopse);
                setCurrentCapaUrl(`http://localhost:3001/${book.capa}`);
            } catch (error) {
                setMessage('Erro ao carregar dados do livro.');
            }
        };
        fetchBook();
    }, [id]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('titulo', titulo);
        formData.append('autor', autor);
        formData.append('sinopse', sinopse);
        if (capa) { // Só anexa a nova capa se uma foi selecionada
            formData.append('capa', capa);
        }

        try {
            const token = localStorage.getItem('token');
            await axios.put(`http://localhost:3001/api/books/${id}`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'Authorization': `Bearer ${token}`
                }
            });
            setMessage('Livro atualizado com sucesso! Redirecionando...');
            setTimeout(() => navigate(`/book/${id}`), 2000);
        } catch (err) {
            setMessage(err.response?.data?.message || 'Erro ao atualizar livro.');
        }
    };

    return (
        <div className="admin-form-container">
            <h2>Editar Livro</h2>
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
                    <label>Capa Atual</label>
                    {currentCapaUrl && <img src={currentCapaUrl} alt="Capa atual" style={{ maxWidth: '100px', display: 'block', marginBottom: '10px' }} />}
                    <label>Substituir Capa (opcional)</label>
                    <input type="file" onChange={e => setCapa(e.target.files[0])} />
                </div>
                <button type="submit" className="submit-btn">Salvar Alterações</button>
            </form>
            {message && <p className="message">{message}</p>}
        </div>
    );
};

export default EditBookPage;