import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import './AdminForms.css';

const EditBookPage = () => {
    const { id } = useParams();
    const [titulo, setTitulo] = useState('');
    const [autor, setAutor] = useState('');
    const [sinopse, setSinopse] = useState('');
    
    // 1. Mude o estado da capa para string
    const [capa, setCapa] = useState('');
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
                
                // 2. Defina o estado da capa com a URL
                setCapa(book.capa); 
            } catch (error) {
                setMessage('Erro ao carregar dados do livro.');
            }
        };
        fetchBook();
    }, [id]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        // 3. Envie um objeto JSON, não FormData
        const updatedBook = {
            titulo,
            autor,
            sinopse,
            capa
        };

        try {
            const token = localStorage.getItem('token');
            // 4. Remova o 'Content-Type: multipart/form-data'
            await axios.put(`http://localhost:3001/api/books/${id}`, updatedBook, {
                headers: {
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
                {/* ... (inputs de titulo, autor, sinopse) ... */}
                <div className="form-group">
                    <label>Sinopse</label>
                    <textarea value={sinopse} onChange={e => setSinopse(e.target.value)} required />
                </div>
                
                {/* 5. Mude o input de 'file' para 'url' */}
                <div className="form-group">
                    <label>URL da Capa Atual</label>
                    {/* 6. Exiba a capa diretamente da URL */}
                    {capa && <img src={capa} alt="Capa atual" style={{ maxWidth: '100px', display: 'block', marginBottom: '10px' }} />}
                    
                    <input 
                        type="url" 
                        value={capa} 
                        onChange={e => setCapa(e.target.value)} 
                        required 
                    />
                </div>
                
                <button type="submit" className="submit-btn">Salvar Alterações</button>
            </form>
            {message && <p className="message">{message}</p>}
        </div>
    );
};

export default EditBookPage;