import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './AdminForms.css'; 

const AddBookPage = () => {
    const [titulo, setTitulo] = useState('');
    const [autor, setAutor] = useState('');
    const [sinopse, setSinopse] = useState('');
    const [capa, setCapa] = useState('');
    
    const [allGenres, setAllGenres] = useState([]);
    const [selectedGenres, setSelectedGenres] = useState([]);
    
    const [message, setMessage] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const fetchGenres = async () => {
            try {
                const res = await axios.get('/api/genres');
                setAllGenres(res.data);
            } catch (error) {
                console.error("Erro ao buscar gêneros:", error);
                setMessage("Erro ao carregar lista de gêneros.");
            }
        };
        fetchGenres();
    }, []);

    const handleGenreChange = (e) => {
        const genreId = parseInt(e.target.value);
        if (e.target.checked) {
            setSelectedGenres(prev => [...prev, genreId]);
        } else {
            setSelectedGenres(prev => prev.filter(id => id !== genreId));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const newBook = {
            titulo,
            autor,
            sinopse,
            capa,
            generos: selectedGenres
        };

        try {
            const token = localStorage.getItem('token');
            const res = await axios.post('/api/books', newBook, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            setMessage('Livro adicionado com sucesso! Redirecionando...');
            setTimeout(() => navigate(`/book/${res.data.id}`), 2000);
        } catch (err) {
            setMessage(err.response?.data?.message || 'Erro ao adicionar livro.');
        }
    };

    return (
        <div className="admin-page-wrapper">
            <div className="admin-backdrop"></div>
            
            <div className="admin-content container">
                <div className="admin-form-card">
                    <h2 className="form-title">Adicionar Novo Livro</h2>
                    <p className="form-subtitle">Preencha os dados abaixo para incluir uma obra na estante.</p>
                    
                    <form onSubmit={handleSubmit}>
                        
                        <div className="form-row">
                            <div className="form-group">
                                <label>Título da Obra</label>
                                <input 
                                    type="text" 
                                    placeholder="Ex: O Senhor dos Anéis"
                                    value={titulo} 
                                    onChange={e => setTitulo(e.target.value)} 
                                    required 
                                />
                            </div>
                            <div className="form-group">
                                <label>Autor(a)</label>
                                <input 
                                    type="text" 
                                    placeholder="Ex: J.R.R. Tolkien"
                                    value={autor} 
                                    onChange={e => setAutor(e.target.value)} 
                                    required 
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Sinopse</label>
                            <textarea 
                                placeholder="Breve descrição sobre o livro..."
                                value={sinopse} 
                                onChange={e => setSinopse(e.target.value)} 
                                required 
                            />
                        </div>
                        
                        <div className="form-group">
                            <label>URL da Capa (Imagem)</label>
                            <input 
                                type="url" 
                                placeholder="https://exemplo.com/imagem.jpg"
                                value={capa} 
                                onChange={e => setCapa(e.target.value)} 
                                required 
                            />
                            {capa && (
                                <div className="preview-capa">
                                    <span>Pré-visualização:</span>
                                    <img src={capa} alt="Capa preview" onError={(e) => e.target.style.display='none'}/>
                                </div>
                            )}
                        </div>

                        <div className="form-group">
                            <label>Gêneros</label>
                            <div className="genres-grid">
                                {allGenres.length > 0 ? allGenres.map(genre => (
                                    <label key={genre.id} className={`genre-checkbox ${selectedGenres.includes(genre.id) ? 'selected' : ''}`}>
                                        <input 
                                            type="checkbox" 
                                            value={genre.id}
                                            onChange={handleGenreChange}
                                            checked={selectedGenres.includes(genre.id)}
                                        />
                                        {genre.nome}
                                    </label>
                                )) : (
                                    <p>Carregando gêneros...</p>
                                )}
                            </div>
                        </div>
                        
                        <button type="submit" className="submit-btn-admin">Adicionar Livro</button>
                    </form>
                    
                    {message && <p className={`form-message ${message.includes('sucesso') ? 'success' : 'error'}`}>{message}</p>}
                </div>
            </div>
        </div>
    );
};

export default AddBookPage;