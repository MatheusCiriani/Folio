import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import UserProfileModal from '../components/UserProfileModal'; // <<< 1. IMPORTE O MODAL

// (Estilos da HomePage para o book-list, ou crie um CSS próprio)
import './ProfilePage.css';
import './AdminForms.css'; // Para o formulário

const ProfilePage = () => {
    const [user, setUser] = useState(null);
    const [likedBooks, setLikedBooks] = useState([]);
    const [followingList, setFollowingList] = useState([]); // <<< 2. NOVO ESTADO
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    
    // Estado para edição
    const [nome, setNome] = useState('');
    const token = localStorage.getItem('token');
    
    // Estado para o modal
    const [viewingProfileId, setViewingProfileId] = useState(null); // <<< 3. NOVO ESTADO

    const fetchMyProfile = useCallback(async () => {
        setLoading(true);
        try {
            const loggedInUser = JSON.parse(localStorage.getItem('usuarios'));
            if (!loggedInUser) {
                throw new Error('Usuário não logado');
            }
            const userId = loggedInUser.id;

            // <<< 4. ATUALIZADO: Busca perfil, livros E a lista de "seguindo"
            const [profileRes, booksRes, followingRes] = await Promise.all([
                axios.get(`http://localhost:3001/api/users/me`, {
                    headers: { Authorization: `Bearer ${token}` }
                }),
                axios.get(`http://localhost:3001/api/users/${userId}/liked-books`),
                axios.get(`http://localhost:3001/api/users/me/following`, {
                    headers: { Authorization: `Bearer ${token}` }
                })
            ]);

            setUser(profileRes.data);
            setNome(profileRes.data.nome);
            setLikedBooks(booksRes.data);
            setFollowingList(followingRes.data); // <<< 5. ATUALIZA O ESTADO

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
                'http://localhost:3001/api/users/me',
                { nome },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            
            const updatedUser = { ...user, nome: res.data.user.nome };
            setUser(updatedUser);
            localStorage.setItem('usuarios', JSON.stringify(updatedUser));
            
            setMessage(res.data.message);
            // Dispara um evento para a Navbar atualizar o "Olá, [nome]"
            window.dispatchEvent(new Event('storage')); 
            
        } catch (error) {
            setMessage(error.response?.data?.message || 'Erro ao atualizar perfil.');
        }
    };

    if (loading) return <p>Carregando seu perfil...</p>;
    if (!user) return <p>Não foi possível carregar seu perfil. Tente fazer login novamente.</p>;

    return (
        <div className="profile-page-container" style={{maxWidth: '800px', margin: 'auto', padding: '20px'}}>
            <h2>Meu Perfil</h2>
            {message && <p className="message">{message}</p>}

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

            {/* --- 6. NOVA SEÇÃO "SEGUINDO" --- */}
            <h3>Quem você segue ({followingList.length})</h3>
            {followingList.length > 0 ? (
                <ul style={{ listStyle: 'none', padding: 0 }}>
                    {followingList.map(followedUser => (
                        <li key={followedUser.id} 
                            onClick={() => setViewingProfileId(followedUser.id)}
                            style={{ cursor: 'pointer', padding: '8px', textDecoration: 'underline', color: 'var(--primary-blue)' }}
                        >
                            {followedUser.nome}
                        </li>
                    ))}
                </ul>
            ) : (
                <p>Você ainda não segue ninguém.</p>
            )}


            <hr style={{margin: '30px 0'}} />

            <h3>Meus últimos 5 livros curtidos</h3>
            {likedBooks.length > 0 ? (
                <div className="book-list">
                    {likedBooks.map(book => (
                        <div key={book.id} className="book-card">
                            <Link to={`/book/${book.id}`}>
                                <img 
                                    src={`http://localhost:3001/${book.capa}`} 
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
            
            {/* --- 7. ADICIONA O MODAL AQUI --- */}
            {viewingProfileId && (
                <UserProfileModal 
                    userId={viewingProfileId}
                    closeModal={() => setViewingProfileId(null)}
                />
            )}
        </div>
    );
};

export default ProfilePage;