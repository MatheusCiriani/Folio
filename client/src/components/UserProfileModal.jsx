import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import './UserProfileModal.css'; // Crie este CSS

// --- 1. ADICIONE ESTA FUNÇÃO AJUDANTE ---
const getInitials = (name) => {
    if (!name) return '?';
    const names = name.split(' ');
    if (names.length === 1) return names[0][0].toUpperCase();
    return (names[0][0] + names[names.length - 1][0]).toUpperCase();
};

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
                    axios.get(`/api/users/${userId}/profile`, {
                        headers: { Authorization: `Bearer ${token}` }
                    }),
                    axios.get(`/api/users/${userId}/liked-books`),
                    axios.get(`/api/users/${userId}/lists`) // <<< NOVA CHAMADA
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
            const url = `/api/users/${userId}/follow`;
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
                <button className="close-button" onClick={closeModal}>X</button>
                {loading ? (
                    <p>Carregando perfil...</p>
                ) : !profile ? (
                    <p>Perfil não encontrado.</p>
                ) : (
                    <>
                        {/* --- NOVO HEADER MODERNO --- */}
                        <div className="profile-modal-header">
                            <div className="avatar-circle">
                                <span>{getInitials(profile.nome)}</span>
                            </div>
                            <div className="header-info">
                                <h2>{profile.nome}</h2>
                                <button onClick={handleFollowToggle} className="btn-follow">
                                    {isFollowing ? 'Deixar de Seguir' : 'Seguir'}
                                </button>
                            </div>
                        </div>

                        {/* --- NOVO CORPO DO MODAL --- */}
                        <div className="profile-modal-body">
                            <h4>Listas de {profile.nome}</h4>
                            {userLists.length > 0 ? (
                                <div className="modal-public-lists">
                                    {userLists.map(list => (
                                        <div 
                                            key={list.id} 
                                            className="public-list-item"
                                            onClick={() => openListDetailModal(list.id)}
                                        >
                                            <span className="public-list-name">{list.nome}</span>
                                            <span className="public-list-count">{list.total_livros} livros</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="modal-empty-state">
                                    {profile.nome} ainda não criou nenhuma lista.
                                </p>
                            )}
                            
                            <hr />

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
                                <p className="modal-empty-state">
                                    {profile.nome} ainda não curtiu nenhum livro.
                                </p>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default UserProfileModal;