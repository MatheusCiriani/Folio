import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import UserProfileModal from '../components/UserProfileModal';

import './ProfilePage.css';

const ProfilePage = ({ openCreateListModal, openListDetailModal, openConfirmDeleteModal }) => {
    const [user, setUser] = useState(null);
    const [likedBooks, setLikedBooks] = useState([]);
    const [followingList, setFollowingList] = useState([]);
    const [myLists, setMyLists] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    
    const [nome, setNome] = useState('');
    const token = localStorage.getItem('token');
    
    const [viewingProfileId, setViewingProfileId] = useState(null);

    const fetchMyProfile = useCallback(async () => {
        setLoading(true);
        try {
            const loggedInUser = JSON.parse(localStorage.getItem('usuarios'));
            if (!loggedInUser) throw new Error('Usuário não logado');
            
            const userId = loggedInUser.id;
            const config = { headers: { Authorization: `Bearer ${token}` } };

            const [profileRes, booksRes, followingRes, listsRes] = await Promise.all([
                axios.get(`/api/users/me`, config),
                axios.get(`/api/users/${userId}/liked-books`),
                axios.get(`/api/users/me/following`, config),
                axios.get(`/api/lists/`, config)
            ]);

            setUser(profileRes.data);
            setNome(profileRes.data.nome);
            setLikedBooks(booksRes.data);
            setFollowingList(followingRes.data);
            setMyLists(listsRes.data);

        } catch (error) {
            console.error("Erro ao carregar seu perfil:", error);
        } finally {
            setLoading(false);
        }
    }, [token]);
    
    useEffect(() => {
        fetchMyProfile();
    }, [fetchMyProfile]);

    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        setMessage('');
        try {
            const res = await axios.put(
                '/api/users/me',
                { nome },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            
            const updatedUser = { ...user, nome: res.data.user.nome };
            setUser(updatedUser);
            localStorage.setItem('usuarios', JSON.stringify(updatedUser));
            
            setMessage('Perfil atualizado com sucesso!');
            window.dispatchEvent(new Event('storage')); 
            
            // Limpa a mensagem após 3 segundos
            setTimeout(() => setMessage(''), 3000);
            
        } catch (error) {
            setMessage(error.response?.data?.message || 'Erro ao atualizar perfil.');
        }
    };

    const handleDeleteList = async (listId) => {
        try {
            await axios.delete(`/api/lists/${listId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchMyProfile(); 
        } catch (err) {
            alert(err.response?.data?.message || 'Erro ao deletar lista.');
        }
    };

    if (loading) return <div className="loading-screen">Carregando perfil...</div>;
    if (!user) return <div className="error-screen">Não foi possível carregar seu perfil.</div>;

    const userInitials = user.nome ? user.nome.charAt(0).toUpperCase() : '?';

    return (
        <div className="profile-page-wrapper">
            <div className="profile-backdrop"></div>
            
            <div className="profile-content container">
                
                {/* --- CARTÃO DE CABEÇALHO --- */}
                <div className="profile-header-card">
                    <div className="profile-avatar-large">
                        {userInitials}
                    </div>
                    
                    <div className="profile-info-form">
                        <h2>Meu Perfil</h2>
                        <form onSubmit={handleProfileUpdate}>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Nome</label>
                                    <input 
                                        type="text" 
                                        value={nome} 
                                        onChange={e => setNome(e.target.value)} 
                                        required 
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Email</label>
                                    <input type="email" value={user.email} disabled className="input-disabled" />
                                </div>
                            </div>
                            <button type="submit" className="btn-save-profile">Salvar Alterações</button>
                            {message && <p className="success-message">{message}</p>}
                        </form>
                    </div>
                </div>

                {/* --- ESTATÍSTICAS RÁPIDAS (Opcional, mas visualmente rico) --- */}
                <div className="profile-stats-bar">
                    <div className="stat-item">
                        <span className="stat-value">{myLists.length}</span>
                        <span className="stat-label">Listas</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-value">{likedBooks.length}</span>
                        <span className="stat-label">Curtidos</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-value">{followingList.length}</span>
                        <span className="stat-label">Seguindo</span>
                    </div>
                </div>

                {/* --- MINHAS LISTAS --- */}
                <section className="profile-section">
                    <div className="section-header-profile">
                        <h3>Minhas Listas</h3>
                        <button onClick={() => openCreateListModal()} className="btn-add-new">
                            + Criar Nova Lista
                        </button>
                    </div>

                    {myLists.length > 0 ? (
                        <div className="lists-grid">
                            {myLists.map(list => (
                                <div key={list.id} className="list-card">
                                    <div className="list-card-content" onClick={() => openListDetailModal(list.id)}>
                                        <span className="list-icon">📂</span>
                                        <h4>{list.nome}</h4>
                                    </div>
                                    <div className="list-card-actions">
                                        <button onClick={() => openListDetailModal(list.id)} title="Ver">👁️</button>
                                        <button onClick={() => openCreateListModal(list)} title="Editar">✏️</button>
                                        <button 
                                            onClick={() => openConfirmDeleteModal(list.id, () => handleDeleteList(list.id))} 
                                            title="Excluir" 
                                            className="btn-delete-icon"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="empty-text">Você ainda não criou nenhuma lista.</p>
                    )}
                </section>

                {/* --- LIVROS CURTIDOS --- */}
                <section className="profile-section">
                    <h3>Últimos Curtidos</h3>
                    {likedBooks.length > 0 ? (
                        <div className="books-grid-profile">
                            {likedBooks.map(book => (
                                <Link to={`/book/${book.id}`} key={book.id} className="book-card-mini">
                                    <img src={book.capa} alt={book.titulo} />
                                    <div className="book-card-mini-overlay">
                                        <span>{book.titulo}</span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <p className="empty-text">Você ainda não curtiu nenhum livro.</p>
                    )}
                </section>

                {/* --- SEGUINDO --- */}
                <section className="profile-section">
                    <h3>Quem você segue</h3>
                    {followingList.length > 0 ? (
                        <div className="following-grid">
                            {followingList.map(followedUser => (
                                <div 
                                    key={followedUser.id} 
                                    className="following-card"
                                    onClick={() => setViewingProfileId(followedUser.id)}
                                >
                                    <div className="following-avatar">
                                        {followedUser.nome.charAt(0).toUpperCase()}
                                    </div>
                                    <span>{followedUser.nome}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="empty-text">Você ainda não segue ninguém.</p>
                    )}
                </section>
            </div>

            {/* Modal de Perfil de Outro Usuário */}
            {viewingProfileId && (
                <UserProfileModal 
                    userId={viewingProfileId}
                    closeModal={() => setViewingProfileId(null)}
                    openListDetailModal={openListDetailModal}
                />
            )}
        </div>
    );
};

export default ProfilePage;