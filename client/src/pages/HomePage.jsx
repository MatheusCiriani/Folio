import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import folioLogoHero from '../assets/folio-logo-hero.svg'; 
import './HomePage.css';

const HomePage = () => {
    const [books, setBooks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // --- ESTADOS DO FILTRO ---
    const [allGenres, setAllGenres] = useState([]);
    const [genreFilter, setGenreFilter] = useState('');

    useEffect(() => {
        // 1. Busca Gêneros
        const fetchGenres = async () => {
            try {
                const res = await axios.get('/api/genres');
                setAllGenres(res.data);
            } catch (error) {
                console.error("Erro ao buscar gêneros:", error);
            }
        };
        fetchGenres();
    }, []);

    // 2. Busca Livros (monitorando o filtro de gênero)
    useEffect(() => {
        const fetchBooks = async () => {
            try {
                setLoading(true);
                const params = new URLSearchParams();
                if (genreFilter) {
                    params.append('genre', genreFilter);
                }

                const res = await axios.get(`/api/books?${params.toString()}`);
                setBooks(res.data);
            } catch (error) {
                console.error("Erro ao buscar dados:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchBooks();
    }, [genreFilter]); // Recarrega quando o gênero muda

    const filteredBooks = books.filter(book => 
        book.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        book.autor.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="homepage-wrapper">
            
            {/* --- SEÇÃO HERO --- */}
            <section className="hero-section">
                <div className="hero-content container">
                    <div className="hero-logo-wrapper">
                        <img 
                            src={folioLogoHero} 
                            alt="Fólio - Your Next Page" 
                            className="hero-logo-img"
                        />
                    </div>
                    
                    {/* Container dos Controles de Busca e Filtro */}
                    <div className="hero-controls">
                        
                        {/* Barra de Busca */}
                        <div className="hero-search-wrapper">
                            <input 
                                type="text" 
                                placeholder="Buscar por título ou autor..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            <button className="search-icon-btn">🔍</button>
                        </div>

                        {/* Select de Gêneros (Estilo Pill) */}
                        <select 
                            className="genre-select"
                            value={genreFilter} 
                            onChange={(e) => setGenreFilter(e.target.value)}
                        >
                            <option value="">Todos os Gêneros</option>
                            {allGenres.map(genre => (
                                <option key={genre.id} value={genre.id}>
                                    {genre.nome}
                                </option>
                            ))}
                        </select>

                    </div>
                </div>
            </section>

            {/* --- SEÇÃO DE LIVROS POPULARES --- */}
            <section className="content-section container">
                <div className="section-header">
                    <h2>
                        {genreFilter 
                            ? `Gênero: ${allGenres.find(g => g.id.toString() === genreFilter)?.nome}` 
                            : 'Livros Populares'}
                    </h2>
                    <Link to="/explore" className="section-header-btn">
                        Ver todos
                    </Link>
                </div>

                {loading ? <p>Carregando estante...</p> : (
                    <div className="poster-grid">
                        {filteredBooks.length > 0 ? (
                            filteredBooks.slice(0, 12).map(book => (
                                <Link to={`/book/${book.id}`} key={book.id} className="poster-card">
                                    <div className="poster-wrapper">
                                        <img src={book.capa} alt={book.titulo} />
                                        <div className="poster-hover">
                                            <span>Ver detalhes</span>
                                        </div>
                                    </div>
                                </Link>
                            ))
                        ) : (
                            <div className="empty-state-container">
                                <p>Nenhum livro encontrado.</p>
                            </div>
                        )}
                    </div>
                )}
            </section>

        </div>
    );
};

export default HomePage;