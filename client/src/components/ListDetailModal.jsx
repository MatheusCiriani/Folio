// components/ListDetailModal.jsx
import React, { useState, useEffect, useCallback } from 'react'; // <<< 1. Importe useCallback
import axios from 'axios';
import { Link } from 'react-router-dom';
import './UserProfileModal.css'; // Reutiliza o CSS

const ListDetailModal = ({ listId, closeModal }) => {
    const [list, setList] = useState(null);
    const [loading, setLoading] = useState(true);
    const token = localStorage.getItem('token');

    // --- NOVOS ESTADOS PARA BUSCA ---
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

    // --- 2. Extraia a busca de livros para uma função reutilizável ---
    const fetchListDetails = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axios.get(`http://localhost:3001/api/lists/${listId}/books`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setList(res.data);
        } catch (error) {
            console.error("Erro ao carregar detalhes da lista:", error);
        } finally {
            setLoading(false);
        }
    }, [listId, token]);

    useEffect(() => {
        fetchListDetails();
    }, [fetchListDetails]);

    // --- 3. Função para buscar livros (API de busca) ---
    const handleSearch = async (term) => {
        if (term.length < 2) {
            setSearchResults([]);
            setIsSearching(false);
            return;
        }
        setIsSearching(true);
        try {
            // Chama a rota que modificamos no Passo 1
            const res = await axios.get(`http://localhost:3001/api/books?search=${term}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSearchResults(res.data);
        } catch (error) {
            console.error("Erro ao buscar livros:", error);
        } finally {
            setIsSearching(false);
        }
    };

    // --- 4. Função para adicionar o livro à lista ---
    const handleAddBook = async (bookId) => {
        try {
            // Chama a rota POST que já existe em lists.js
            await axios.post(
                `http://localhost:3001/api/lists/${listId}/books`,
                { bookId },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            
            // Limpa a busca e recarrega os livros da lista
            setSearchTerm('');
            setSearchResults([]);
            fetchListDetails(); // Recarrega a lista para mostrar o novo livro
            
        } catch (err) {
            alert(err.response?.data?.message || 'Erro ao adicionar livro.');
        }
    };

    return (
        <div className="modal-overlay" onClick={closeModal} style={{ zIndex: 1001 }}>
            <div className="modal-content profile-modal" onClick={(e) => e.stopPropagation()}>
                <button className="close-button" onClick={closeModal}>X</button>
                {loading && !list ? (
                    <p>Carregando lista...</p>
                ) : !list ? (
                    <p>Lista não encontrada.</p>
                ) : (
                    <>
                        <h2>{list.nome}</h2>
                        
                        {/* --- 5. BARRA DE BUSCA --- */}
                        <div className="list-detail-search">
                            <input
                                type="text"
                                placeholder="Buscar livros para adicionar..."
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    handleSearch(e.target.value);
                                }}
                            />
                        </div>

                        {/* --- 6. RESULTADOS DA BUSCA --- */}
                        {searchTerm && (
                            <div className="search-results-list">
                                {isSearching ? (
                                    <p>Buscando...</p>
                                ) : searchResults.length > 0 ? (
                                    searchResults.map(book => (
                                        <div key={book.id} className="search-result-item">
                                            <img src={book.capa} alt={book.titulo} />
                                            <span>{book.titulo}</span>
                                            <button 
                                                onClick={() => handleAddBook(book.id)}
                                                className="btn-add-book-to-list"
                                            >
                                                Adicionar
                                            </button>
                                        </div>
                                    ))
                                ) : (
                                    <p>Nenhum resultado encontrado.</p>
                                )}
                            </div>
                        )}
                        
                        <hr />
                        
                        <h4>Livros nesta lista ({list.livros.length})</h4>
                        {list.livros.length > 0 ? (
                            <div className="modal-book-list">
                                {list.livros.map(book => (
                                    <Link 
                                        to={`/book/${book.id}`} 
                                        key={book.id} 
                                        className="modal-book-item" 
                                        onClick={closeModal}
                                    >
                                        <img src={book.capa} alt={book.titulo} />
                                        <span>{book.titulo}</span>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <p>Nenhum livro nesta lista ainda.</p>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default ListDetailModal;