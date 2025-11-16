// pages/ProfilePage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import UserProfileModal from '../components/UserProfileModal';

import './ProfilePage.css';
import './AdminForms.css';

// <<< A CORREÇÃO ESTÁ AQUI. RECEBA AS PROPS.
const ProfilePage = ({ openCreateListModal, openListDetailModal, openConfirmDeleteModal }) => {
    const [user, setUser] = useState(null);
    const [likedBooks, setLikedBooks] = useState([]);
    const [followingList, setFollowingList] = useState([]);
    const [myLists, setMyLists] = useState([]); // Estado para listas
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

            // Busca tudo em paralelo
            const [profileRes, booksRes, followingRes, listsRes] = await Promise.all([
                axios.get(`/api/users/me`, config),
                axios.get(`/api/users/${userId}/liked-books`),
                axios.get(`/api/users/me/following`, config),
                axios.get(`/api/lists/`, config) // Busca as listas
            ]);

            setUser(profileRes.data);
            setNome(profileRes.data.nome);
            setLikedBooks(booksRes.data);
            setFollowingList(followingRes.data);
            setMyLists(listsRes.data); // Salva as listas

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
        try {
            const res = await axios.put(
                '/api/users/me',
                { nome },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            
            const updatedUser = { ...user, nome: res.data.user.nome };
            setUser(updatedUser);
            localStorage.setItem('usuarios', JSON.stringify(updatedUser));
            
            setMessage(res.data.message);
            window.dispatchEvent(new Event('storage')); 
            
        } catch (error) {
            setMessage(error.response?.data?.message || 'Erro ao atualizar perfil.');
        }
    };

    // Função de Deleção
    const handleDeleteList = async (listId) => {
        try {
            await axios.delete(`/api/lists/${listId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchMyProfile(); // Recarrega o perfil para atualizar a lista
        } catch (err) {
            alert(err.response?.data?.message || 'Erro ao deletar lista.');
        }
    };

    if (loading) return <p>Carregando seu perfil...</p>;
    if (!user) return <p>Não foi possível carregar seu perfil. Tente fazer login novamente.</p>;

    return (
        <div className="profile-page-container">
            <h2>Meu Perfil</h2>
            {message && <p className="message">{message}</p>}

            {/* Formulário de Perfil */}
            <form onSubmit={handleProfileUpdate} className="admin-form-container">
                <div className="form-group">
                    <label>Email (não pode ser alterado)</label>
                    <input type="email" value={user.email} disabled />
                </div>
                <div className="form-group">
                    <label>Nome</label>
                    <input type="text" value={nome} onChange={e => setNome(e.target.value)} required />
                </div>
                <button type="submit" className="submit-btn">Salvar Alterações</button>
            </form>

            <hr style={{margin: '30px 0'}} />

            {/* Seção "Seguindo" */}
            <h3>Quem você segue ({followingList.length})</h3>
            {followingList.length > 0 ? (
                <ul className="following-list"> {/* Use o CSS de ProfilePage.css */}
                    {followingList.map(followedUser => (
                        <li key={followedUser.id} 
                            onClick={() => setViewingProfileId(followedUser.id)}
                            className="following-item" // Use o CSS
                        >
                            {followedUser.nome}
                        </li>
                    ))}
                </ul>
            ) : (
                <p>Você ainda não segue ninguém.</p>
            )}


            <hr style={{margin: '30px 0'}} />

            {/* Seção "Minhas Listas" */}
            <div className="list-management-section">
                <div className="list-header">
                    <h3>Minhas Listas ({myLists.length})</h3>
                    <button 
                        onClick={() => openCreateListModal()} // <<< ESTA FUNÇÃO VAI FUNCIONAR AGORA
                        className="btn-new-list"
                    >
                        + Criar Nova Lista
                    </button>
                </div>
                
                {myLists.length > 0 ? (
                    <ul className="my-lists-container">
                        {myLists.map(list => (
                            <li key={list.id} className="my-list-item">
                                <span className="list-name" onClick={() => openListDetailModal(list.id)}>
                                    {list.nome}
                                </span>
                                <div className="list-actions">
                                    <button onClick={() => openListDetailModal(list.id)} className="btn-action btn-view">Ver</button>
                                    <button onClick={() => openCreateListModal(list)} className="btn-action btn-edit">Editar</button>
                                    <button 
                                        onClick={() => openConfirmDeleteModal(list.id, () => handleDeleteList(list.id))} 
                                        className="btn-action btn-delete"
                                    >
                                        Deletar
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p>Você ainda não criou nenhuma lista.</p>
                )}
            </div>

            <hr style={{margin: '30px 0'}} />

            {/* Seção "Livros Curtidos" */}
            <h3>Meus últimos 5 livros curtidos</h3>
            {likedBooks.length > 0 ? (
                <div className="book-list">
                    {likedBooks.map(book => (
                        <div key={book.id} className="book-card">
                            <Link to={`/book/${book.id}`}>
                                <img 
                                    src={book.capa} 
                                    alt={`Capa de ${book.titulo}`} 
                                />
                                <h3>{book.titulo}</h3>
                            </Link>
                        </div>
                    ))}
                </div>
            ) : (
                <p>Você ainda não curtiu nenhum livro.</p>
            )}
            
            {/* Modal de Perfil de Outro Usuário */}
            {viewingProfileId && (
                <UserProfileModal 
                    userId={viewingProfileId}
                    closeModal={() => setViewingProfileId(null)}
                    openListDetailModal={openListDetailModal} // <<< ADICIONE ESTA LINHA
                />
            )}
        </div>
    );
};

export default ProfilePage;