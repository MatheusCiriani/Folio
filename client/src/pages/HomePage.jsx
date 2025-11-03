// pages/HomePage.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './HomePage.css';

const HomePage = () => {
    const [books, setBooks] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);

    // --- NOVOS ESTADOS PARA FILTRO ---
    const [allGenres, setAllGenres] = useState([]);
    const [genreFilter, setGenreFilter] = useState(''); // Armazena o ID do gênero selecionado

    const user = JSON.parse(localStorage.getItem('usuarios'));

    // useEffect para buscar os livros (AGORA TAMBÉM BUSCA GÊNEROS)
    useEffect(() => {
        // 1. Função para buscar os gêneros (para o dropdown)
        const fetchGenres = async () => {
            try {
                const res = await axios.get('http://localhost:3001/api/genres');
                setAllGenres(res.data);
            } catch (error) {
                console.error("Erro ao buscar gêneros:", error);
            }
        };

        // 2. Função para buscar os livros (AGORA USA O FILTRO)
        const fetchAllBooks = async () => {
            try {
                setLoading(true);
                
                // Adiciona o parâmetro 'genre' à URL se ele estiver definido
                const params = new URLSearchParams();
                if (genreFilter) {
                    params.append('genre', genreFilter);
                }
                
                const res = await axios.get(`http://localhost:3001/api/books?${params.toString()}`);
                setBooks(res.data);
            } catch (error) {
                console.error("Erro ao buscar os livros:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchGenres(); // Busca gêneros quando o componente carrega
        fetchAllBooks(); // Busca livros quando o componente carrega OU o filtro muda

    }, [genreFilter]); // <<< RE-EXECUTA QUANDO O FILTRO DE GÊNERO MUDAR

    // Filtra os livros (pelo texto)
    const filteredBooks = books.filter(book => 
        book.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        book.autor.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return <p>Carregando livros...</p>;
    }

    return (
        <div className="homepage-container">
            <h1>Descubra seu próximo livro favorito</h1>
            <p>Explore, avalie e compartilhe suas opiniões sobre os melhores livros</p>
            
            <div className="search-controls"> { /* Agrupei os controles */ }
                <div className="search-bar">
                    <input 
                        type="text"
                        placeholder="Buscar por título ou autor..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* --- NOVO FILTRO DE GÊNERO --- */}
                <div className="genre-filter">
                    <select value={genreFilter} onChange={(e) => setGenreFilter(e.target.value)}>
                        <option value="">Todos os Gêneros</option>
                        {allGenres.map(genre => (
                            <option key={genre.id} value={genre.id}>
                                {genre.nome}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="book-list">
                {filteredBooks.length > 0 ? (
                    filteredBooks.map(book => (
                        <div key={book.id} className="book-card">
                           {/* O Link faz o card inteiro ser clicável e levar para a página de detalhes */}
                           <Link to={`/book/${book.id}`}>
                                {/* CORREÇÃO AQUI: Use book.capa diretamente */}
                                <img 
                                    src={book.capa} 
                                    alt={`Capa de ${book.titulo}`} 
                                />
                                <h3>{book.titulo}</h3>
                                <p>{book.autor}</p>
                            </Link>

                           {/* {user?.email === 'admin@admin.com' && (
                                <div className="admin-actions">
                                    <Link to={`/admin/edit-book/${book.id}`} className="btn-edit-card">
                                        Editar
                                    </Link>
                                </div>
                            )} */}
                           {user && (
                                <div className="admin-actions">
                                    <Link to={`/admin/edit-book/${book.id}`} className="btn-edit-card">
                                        Editar
                                    </Link>
                                </div>
                            )}
                        </div>
                    ))
                ) : (
                    <p>Nenhum livro encontrado com o termo "{searchTerm}".</p>
                )}
            </div>
        </div>
    );
};

export default HomePage;