import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import './UserProfileModal.css'; // Crie este CSS

const UserProfileModal = ({ userId, closeModal }) => {
    const [profile, setProfile] = useState(null);
    const [likedBooks, setLikedBooks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isFollowing, setIsFollowing] = useState(false);
    const token = localStorage.getItem('token');

    useEffect(() => {
        if (!userId) return;

        const fetchProfileData = async () => {
            setLoading(true);
            try {
                const [profileRes, booksRes] = await Promise.all([
                    axios.get(`http://localhost:3001/api/users/${userId}/profile`, {
                        headers: { Authorization: `Bearer ${token}` }
                    }),
                    axios.get(`http://localhost:3001/api/users/${userId}/liked-books`)
                ]);

                setProfile(profileRes.data);
                setIsFollowing(profileRes.data.isFollowing);
                setLikedBooks(booksRes.data);
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
                <button className="close-button" onClick={closeModal}>X</button>
                {loading ? (
                    <p>Carregando perfil...</p>
                ) : !profile ? (
                    <p>Perfil não encontrado.</p>
                ) : (
                    <>
                        <h2>{profile.nome}</h2>
                        
                        {/* Botão de Seguir (FOL-28) */}
                        <button onClick={handleFollowToggle} className="btn-follow">
                            {isFollowing ? 'Deixar de Seguir' : 'Seguir'}
                        </button>
                        
                        <hr />

                        {/* (FOL-27 / FOL-30) */}
                        <h4>Últimos livros curtidos</h4>
                        {likedBooks.length > 0 ? (
                            <div className="modal-book-list">
                                {likedBooks.map(book => (
                                    <Link to={`/book/${book.id}`} key={book.id} className="modal-book-item" onClick={closeModal}>
                                        <img src={`http://localhost:3001/${book.capa}`} alt={book.titulo} />
                                        <span>{book.titulo}</span>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <p>{profile.nome} ainda não curtiu nenhum livro.</p>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default UserProfileModal;