import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import folioLogoHero from '../assets/folio-logo-hero.svg'; 
import './HomePage.css';

const HomePage = () => {
    const [books, setBooks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // --- RECUPERA O USUÁRIO (Para mostrar o botão de editar se logado) ---
    const user = JSON.parse(localStorage.getItem('usuarios'));

    // --- ESTADOS DO FILTRO ---
    const [allGenres, setAllGenres] = useState([]);
    const [genreFilter, setGenreFilter] = useState('');

    useEffect(() => {
        // 1. Busca Gêneros para o Select
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
                // Se houver um gênero selecionado, envia para a API
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
    }, [genreFilter]); 

    // --- FUNÇÃO DE RESET (Botão "Ver todos") ---
    const handleResetFilters = () => {
        setGenreFilter(''); // Volta o select para "Todos"
        setSearchTerm('');  // Limpa o texto da busca
    };

    // Filtragem local por texto (Título ou Autor)
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
                            <option value="">Todos os Generos</option>
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
                    
                    {/* Botão Funcional de Resetar Filtros */}
                    <button onClick={handleResetFilters} className="section-header-btn">
                        Ver todos
                    </button>
                </div>

                {loading ? <p>Carregando estante...</p> : (
                    <div className="poster-grid">
                        {filteredBooks.length > 0 ? (
                            filteredBooks.slice(0, 12).map(book => (
                                /* Wrapper do Item */
                                <div key={book.id} className="poster-item">
                                    
                                    {/* Link Principal (Capa) */}
                                    <Link to={`/book/${book.id}`} className="poster-card">
                                        <div className="poster-wrapper">
                                            <img src={book.capa} alt={book.titulo} />
                                            <div className="poster-hover">
                                                <span>Ver detalhes</span>
                                            </div>
                                        </div>
                                    </Link>

                                    {/* Botão de Editar (Visível apenas para usuários logados) */}
                                    {user && (
                                        <Link 
                                            to={`/admin/edit-book/${book.id}`} 
                                            className="poster-edit-btn"
                                            title="Editar Livro"
                                        >
                                            ✎
                                        </Link>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className="empty-state-container">
                                <p>Nenhum livro encontrado.</p>
                                <button 
                                    onClick={handleResetFilters} 
                                    className="section-header-btn" 
                                    style={{marginTop: '10px'}}
                                >
                                    Limpar filtros
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </section>

        </div>
    );
};

export default HomePage;