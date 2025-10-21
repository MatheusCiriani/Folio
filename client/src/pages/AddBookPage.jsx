import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './AdminForms.css';

const AddBookPage = () => {
    const [titulo, setTitulo] = useState('');
    const [autor, setAutor] = useState('');
    const [sinopse, setSinopse] = useState('');
    
    // 1. Mudar o estado da capa para string vazia
    const [capa, setCapa] = useState(''); 
    
    const [message, setMessage] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // 2. Remover o 'FormData'
        // const formData = new FormData(); ... (Linhas antigas)

        // 3. Criar um objeto JSON simples
        const newBook = {
            titulo,
            autor,
            sinopse,
            capa // Envia a URL da capa
        };

        try {
            const token = localStorage.getItem('token');
            
            // 4. Enviar o objeto 'newBook' como dados
            // 5. Remover o header 'Content-Type: multipart/form-data'
            //    (Axios usará 'application/json' por padrão)
            const res = await axios.post('http://localhost:3001/api/books', newBook, {
                headers: {
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
                
                {/* 6. Mudar o input de 'file' para 'url' (ou 'text') */}
                <div className="form-group">
                    <label>URL da Capa do Livro</label>
                    <input 
                        type="url" 
                        placeholder="https://exemplo.com/imagem.jpg"
                        value={capa} 
                        onChange={e => setCapa(e.target.value)} 
                        required 
                    />
                </div>
                
                <button type="submit" className="submit-btn">Adicionar Livro</button>
            </form>
            {message && <p className="message">{message}</p>}
        </div>
    );
};

export default AddBookPage;