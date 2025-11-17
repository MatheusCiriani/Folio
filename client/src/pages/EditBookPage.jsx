import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import './AdminForms.css'; 

const EditBookPage = () => {
    const { id } = useParams();
    const [titulo, setTitulo] = useState('');
    const [autor, setAutor] = useState('');
    const [sinopse, setSinopse] = useState('');
    const [capa, setCapa] = useState('');
    
    const [allGenres, setAllGenres] = useState([]);
    const [selectedGenres, setSelectedGenres] = useState([]);

    const [message, setMessage] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const fetchBookAndGenres = async () => {
            try {
                // 1. Busca todos os gêneros
                const genresRes = await axios.get('/api/genres');
                setAllGenres(genresRes.data);

                // 2. Busca os dados do livro
                const bookRes = await axios.get(`/api/books/${id}`);
                const book = bookRes.data;
                
                // 3. Preenche todos os estados
                setTitulo(book.titulo);
                setAutor(book.autor);
                setSinopse(book.sinopse);
                setCapa(book.capa);
                
                // 4. Preenche os gêneros que já estavam selecionados
                // (Assumindo que a API retorna um array de objetos em book.generos)
                if (book.generos) {
                    setSelectedGenres(book.generos.map(g => g.id));
                }

            } catch (error) {
                console.error(error);
                setMessage('Erro ao carregar dados do livro ou gêneros.');
            }
        };
        fetchBookAndGenres();
    }, [id]);

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

        const updatedBook = {
            titulo,
            autor,
            sinopse,
            capa,
            generos: selectedGenres
        };

        try {
            const token = localStorage.getItem('token');
            await axios.put(`/api/books/${id}`, updatedBook, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setMessage('Livro atualizado com sucesso! Redirecionando...');
            setTimeout(() => navigate(`/book/${id}`), 2000);
        } catch (err) {
            setMessage(err.response?.data?.message || 'Erro ao atualizar livro.');
        }
    };

    return (
        <div className="admin-page-wrapper">
            <div className="admin-backdrop"></div>
            
            <div className="admin-content container">
                <div className="admin-form-card">
                    <h2 className="form-title">Editar Livro</h2>
                    <p className="form-subtitle">Atualize as informações da obra abaixo.</p>
                    
                    <form onSubmit={handleSubmit}>
                        
                        <div className="form-row">
                            <div className="form-group">
                                <label>Título</label>
                                <input 
                                    type="text" 
                                    value={titulo} 
                                    onChange={e => setTitulo(e.target.value)} 
                                    required 
                                />
                            </div>
                            <div className="form-group">
                                <label>Autor</label>
                                <input 
                                    type="text" 
                                    value={autor} 
                                    onChange={e => setAutor(e.target.value)} 
                                    required 
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Sinopse</label>
                            <textarea 
                                value={sinopse} 
                                onChange={e => setSinopse(e.target.value)} 
                                required 
                            />
                        </div>
                        
                        <div className="form-group">
                            <label>URL da Capa</label>
                            <input 
                                type="url" 
                                value={capa} 
                                onChange={e => setCapa(e.target.value)} 
                                required 
                            />
                            {capa && (
                                <div className="preview-capa">
                                    <span>Capa Atual:</span>
                                    <img 
                                        src={capa} 
                                        alt="Capa atual" 
                                        onError={(e) => e.target.style.display='none'}
                                    />
                                </div>
                            )}
                        </div>
                        
                        <div className="form-group">
                            <label>Gêneros</label>
                            <div className="genres-grid">
                                {allGenres.length > 0 ? allGenres.map(genre => (
                                    <label 
                                        key={genre.id} 
                                        className={`genre-checkbox ${selectedGenres.includes(genre.id) ? 'selected' : ''}`}
                                    >
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

                        <button type="submit" className="submit-btn-admin">Salvar Alterações</button>
                    </form>
                    
                    {message && <p className={`form-message ${message.includes('sucesso') ? 'success' : 'error'}`}>{message}</p>}
                </div>
            </div>
        </div>
    );
};

export default EditBookPage;