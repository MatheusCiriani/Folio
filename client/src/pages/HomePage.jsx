import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const HomePage = () => {
    const [books, setBooks] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);

    const user = JSON.parse(localStorage.getItem('usuarios'));

    // useEffect para buscar os livros da API quando o componente carregar
    useEffect(() => {
        const fetchAllBooks = async () => {
            try {
                setLoading(true);
                const res = await axios.get('http://localhost:3001/api/books');
                setBooks(res.data);
            } catch (error) {
                console.error("Erro ao buscar os livros:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchAllBooks();
    }, []);

    // Filtra os livros com base no termo de pesquisa (em tempo real)
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
            
            <div className="search-bar">
                <input 
                    type="text"
                    placeholder="Buscar por título ou autor..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="book-list">
                {filteredBooks.length > 0 ? (
                    filteredBooks.map(book => (
                        <div key={book.id} className="book-card">
                           {/* O Link faz o card inteiro ser clicável e levar para a página de detalhes */}
                           <Link to={`/book/${book.id}`}>
                                <img 
                                    src={`http://localhost:3001/${book.capa}`} 
                                    alt={`Capa de ${book.titulo}`} 
                                />
                                <h3>{book.titulo}</h3>
                                <p>{book.autor}</p>
                           </Link>

                           {user?.email === 'admin@admin.com' && (
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