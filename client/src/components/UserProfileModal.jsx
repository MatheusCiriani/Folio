import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import './UserProfileModal.css'; // Crie este CSS

const UserProfileModal = ({ userId, closeModal, openListDetailModal }) => {
    const [profile, setProfile] = useState(null);
    const [likedBooks, setLikedBooks] = useState([]);
    const [userLists, setUserLists] = useState([]); // <<< NOVO ESTADO
    const [loading, setLoading] = useState(true);
    const [isFollowing, setIsFollowing] = useState(false);
    const token = localStorage.getItem('token');

    useEffect(() => {
        if (!userId) return;

        const fetchProfileData = async () => {
            setLoading(true);
            try {
                // Rota de listas públicas que criamos em users.js
                const [profileRes, booksRes, listsRes] = await Promise.all([
                    axios.get(`http://localhost:3001/api/users/${userId}/profile`, {
                        headers: { Authorization: `Bearer ${token}` }
                    }),
                    axios.get(`http://localhost:3001/api/users/${userId}/liked-books`),
                    axios.get(`http://localhost:3001/api/users/${userId}/lists`) // <<< NOVA CHAMADA
                ]);

                setProfile(profileRes.data);
                setIsFollowing(profileRes.data.isFollowing);
                setLikedBooks(booksRes.data);
                setUserLists(listsRes.data); // <<< ATUALIZA O ESTADO

            } catch (error) {
                console.error("Erro ao carregar perfil do usuário:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchProfileData();
    }, [userId, token]);

    const handleFollowToggle = async () => {
        try {
            const url = `http://localhost:3001/api/users/${userId}/follow`;
            const config = { headers: { Authorization: `Bearer ${token}` } };

            if (isFollowing) {
                await axios.delete(url, config); // UNFOLLOW
                setIsFollowing(false);
            } else {
                await axios.post(url, {}, config); // FOLLOW
                setIsFollowing(true);
            }
        } catch (error) {
            console.error("Erro ao seguir/deixar de seguir:", error);
            alert('Não foi possível completar a ação.');
        }
    };

    return (
        <div className="modal-overlay" onClick={closeModal}>
            <div className="modal-content profile-modal" onClick={(e) => e.stopPropagation()}>
                {/* ... (botão fechar, loading, h2, botão seguir) ... */}
                
                {loading ? ( <p>Carregando...</p> ) : !profile ? ( <p>Perfil não...</p> ) : (
                    <>
                        <h2>{profile.nome}</h2>
                        <button onClick={handleFollowToggle} className="btn-follow">
                            {isFollowing ? 'Deixar de Seguir' : 'Seguir'}
                        </button>
                        <hr />

                        {/* --- NOVA SEÇÃO DE LISTAS PÚBLICAS --- */}
                        <h4>Listas de {profile.nome}</h4>
                        {userLists.length > 0 ? (
                            <div className="modal-public-lists">
                                {userLists.map(list => (
                                    <div 
                                        key={list.id} 
                                        className="public-list-item"
                                        // Esta função agora vai funcionar
                                        onClick={() => openListDetailModal(list.id)} // Erro era aqui
                                    >
                                        <span className="public-list-name">{list.nome}</span>
                                        <span className="public-list-count">{list.total_livros} livros</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p>{profile.nome} ainda não criou nenhuma lista.</p>
                        )}


                        {/* --- SEÇÃO DE LIVROS CURTIDOS (existente) --- */}
                        <h4>Últimos livros curtidos</h4>
                        {likedBooks.length > 0 ? (
                            <div className="modal-book-list">
                                {likedBooks.map(book => (
                                    <Link to={`/book/${book.id}`} key={book.id} className="modal-book-item" onClick={closeModal}>
                                        <img src={book.capa} alt={book.titulo} /> 
                                        <span>{book.titulo}</span>
                                    </Link>
                                ))}
                            </div>
                        ) :(
                            <p>{profile.nome} ainda não curtiu nenhum livro.</p>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default UserProfileModal;