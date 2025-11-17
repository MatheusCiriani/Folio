// components/ListDetailModal.jsx
import React, { useState, useEffect, useCallback } from 'react'; // <<< 1. Importe useCallback
import axios from 'axios';
import { Link } from 'react-router-dom';
import './ListDetailModal.css';

const ListDetailModal = ({ listId, closeModal }) => {
    const [list, setList] = useState(null);
    const [loading, setLoading] = useState(true);
    const token = localStorage.getItem('token');

    // --- NOVOS ESTADOS PARA BUSCA ---
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

    // 2. Função para buscar os detalhes da lista
    const fetchListDetails = useCallback(async () => {
        setLoading(prev => prev || !list); 
        try {
            const res = await axios.get(`/api/lists/${listId}/books`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setList(res.data);
        } catch (error) {
            console.error("Erro ao carregar detalhes da lista:", error);
        } finally {
            setLoading(false);
        }
    }, [listId, token, list]); // A dependência 'list' é intencional

    useEffect(() => {
        fetchListDetails();
    }, [fetchListDetails]); // Carrega na primeira vez

    // 3. Função de Busca (Corrigida)
    const handleSearch = async (term) => {
        if (term.length < 2) {
            setSearchResults([]);
            setIsSearching(false);
            return;
        }
        setIsSearching(true);
        try {
            // 4. Usa a nova rota do backend (com 'excludeListId')
            const res = await axios.get(
                `/api/books?search=${term}&excludeListId=${listId}`, 
                { headers: { Authorization: `Bearer ${token}` } }
            );
            
            // 5. Filtro local (garantia extra)
            const listBookIds = list.livros.map(book => book.id);
            const filteredResults = res.data.filter(
                book => !listBookIds.includes(book.id)
            );
            
            setSearchResults(filteredResults);
        } catch (error) {
            console.error("Erro ao buscar livros:", error);
        } finally {
            setIsSearching(false);
        }
    };

    // 6. Função para Adicionar Livro (Corrigida)
    const handleAddBook = async (bookId) => {
        try {
            await axios.post(
                `/api/lists/${listId}/books`,
                { bookId },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            
            // 7. Recarrega os livros da lista
            fetchListDetails(); 
            
            // 8. Remove o item da lista de busca (para não clicar de novo)
            setSearchResults(prevResults => prevResults.filter(book => book.id !== bookId));
            
        } catch (err) {
            alert(err.response?.data?.message || 'Erro ao adicionar livro.');
        }
    };

    return (
        <div className="modal-overlay" onClick={closeModal} style={{ zIndex: 1001 }}>
            {/* 9. NOVO CSS E JSX */}
            <div className="modal-content list-detail-modal" onClick={(e) => e.stopPropagation()}>
                <button className="close-button" onClick={closeModal}>X</button>
                
                {loading && !list ? (
                    <p>Carregando lista...</p>
                ) : !list ? (
                    <p>Lista não encontrada.</p>
                ) : (
                    <>
                        <h2 className="list-detail-title">{list.nome}</h2>
                        
                        <div className="list-search-container">
                            <input
                                type="text"
                                placeholder="Buscar livros para adicionar..."
                                value={searchTerm}
                                // Atualiza o termo, mas só busca no "keyup"
                                onChange={(e) => setSearchTerm(e.target.value)} 
                                onKeyUp={(e) => handleSearch(e.target.value)}
                            />
                        </div>

                        <div className="search-results-list">
                            {isSearching && (
                                <p className="search-state">Buscando...</p>
                            )}
                            {!isSearching && searchTerm.length > 1 && searchResults.length === 0 && (
                                <p className="search-state">Nenhum resultado encontrado.</p>
                            )}
                            {searchResults.map(book => (
                                <div key={book.id} className="search-result-item">
                                    <img src={book.capa} alt={book.titulo} />
                                    <span className="book-title">{book.titulo}</span>
                                    <button 
                                        onClick={() => handleAddBook(book.id)}
                                        className="btn-add-book"
                                    >
                                        Adicionar
                                    </button>
                                </div>
                            ))}
                        </div>
                        
                        <div className="books-in-list-container">
                            <h4>Livros nesta lista ({list.livros.length})</h4>
                            {list.livros.length > 0 ? (
                                <div className="books-in-list">
                                    {list.livros.map(book => (
                                        <Link 
                                            to={`/book/${book.id}`} 
                                            key={book.id} 
                                            className="book-in-list-item" 
                                            onClick={closeModal}
                                        >
                                            <img src={book.capa} alt={book.titulo} />
                                            <span className="book-title">{book.titulo}</span>
                                        </Link>
                                    ))}
                                </div>
                            ) : (
                                <p className="search-state">Nenhum livro nesta lista ainda.</p>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default ListDetailModal;