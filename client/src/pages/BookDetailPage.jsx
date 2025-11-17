import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import ConfirmModal from '../components/ConfirmModal';
import UserProfileModal from '../components/UserProfileModal';
import './BookDetailPage.css';

// Componente de Estrelas (Reutilizável e Ajustável)
const StarRating = ({ rating, setRating, readOnly = false, size = 'medium' }) => {
    const [hover, setHover] = useState(0);
    return (
        <div className={`star-rating ${size} ${readOnly ? 'readonly' : ''}`}>
            {[...Array(5)].map((star, index) => {
                const ratingValue = index + 1;
                return (
                    <span
                        key={index}
                        className="star"
                        style={{ 
                            color: ratingValue <= (hover || rating) ? "#f5c518" : "#e4e5e9" 
                        }}
                        onClick={() => !readOnly && setRating && setRating(ratingValue)}
                        onMouseEnter={() => !readOnly && setHover(ratingValue)}
                        onMouseLeave={() => !readOnly && setHover(0)}
                    >
                        &#9733;
                    </span>
                );
            })}
        </div>
    );
};

const BookDetailPage = ({ openAuthModal, openAddToListModal, openListDetailModal }) => {
    const { id } = useParams();
    const [book, setBook] = useState(null);
    const [comments, setComments] = useState([]);
    const [rating, setRating] = useState({ media_avaliacoes: 0, total_avaliacoes: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [newComment, setNewComment] = useState('');
    const [newRating, setNewRating] = useState(0);
    const [userHasReviewed, setUserHasReviewed] = useState(false);

    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('usuarios'));
    const userId = user?.id;

    const [editingCommentId, setEditingCommentId] = useState(null);
    const [editText, setEditText] = useState('');
    const [editRating, setEditRating] = useState(0);
    const [commentToDelete, setCommentToDelete] = useState(null);
    const [likes, setLikes] = useState(0);
    const [userLiked, setUserLiked] = useState(false);
    const [viewingProfileId, setViewingProfileId] = useState(null);

    // Estados para "Ler Mais" da sinopse
    const [isClamped, setIsClamped] = useState(true);
    const [isOverflowing, setIsOverflowing] = useState(false);
    const synopsisRef = useRef(null);

    const fetchBookDetails = useCallback(async () => {
        try {
            setLoading(true);
            setError('');
            const headers = token ? { Authorization: `Bearer ${token}` } : {};

            const [bookRes, commentsRes, ratingRes, likesRes] = await Promise.all([
                axios.get(`/api/books/${id}`),
                axios.get(`/api/books/${id}/comments`),
                axios.get(`/api/books/${id}/rating`),
                axios.get(`/api/books/${id}/likes`, { headers })
            ]);

            setBook(bookRes.data);
            const fetchedComments = commentsRes.data;
            
            if (userId) {
                let userComment = null;
                const otherComments = fetchedComments.filter(comment => {
                    if (comment.usuario_id === userId) {
                        userComment = comment;
                        return false;
                    }
                    return true;
                });

                if (userComment) {
                    setUserHasReviewed(true);
                    setComments([userComment, ...otherComments]);
                } else {
                    setUserHasReviewed(false);
                    setComments(fetchedComments);
                }
            } else {
                setUserHasReviewed(false);
                setComments(fetchedComments);
            }

            if (ratingRes.data && ratingRes.data.media_avaliacoes !== undefined) {
                setRating(ratingRes.data);
            }

            if (likesRes && likesRes.data) {
                setLikes(likesRes.data.totalCurtidas || 0);
                setUserLiked(!!likesRes.data.userLiked);
            }

        } catch (err) {
            setError('Erro ao carregar os detalhes do livro.');
            console.error("Detalhes do erro:", err);
        } finally {
            setLoading(false);
        }
    }, [id, token, userId]);

    useEffect(() => {
        fetchBookDetails();
    }, [fetchBookDetails]);

    // Efeito para verificar overflow da sinopse
    useEffect(() => {
        if (synopsisRef.current) {
            const hasOverflow = synopsisRef.current.scrollHeight > synopsisRef.current.clientHeight;
            setIsOverflowing(hasOverflow);
        }
    }, [book?.sinopse]);

    const handleSubmitReview = async (e) => {
        e.preventDefault();
        if (newRating === 0 || newComment.trim() === '') {
            alert('Por favor, selecione uma nota e escreva um comentário.');
            return;
        }
        try {
            await axios.post(
                `/api/books/${id}/review`,
                { texto: newComment, nota: newRating },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setNewComment('');
            setNewRating(0);
            fetchBookDetails(); 
        } catch (err) {
            alert(err.response?.data?.message || "Não foi possível enviar sua avaliação.");
        }
    };

    const handleLike = async () => {
        if (!token) { openAuthModal('login'); return; }
        try {
            const response = await axios.post(
                `/api/books/${id}/like`, {}, { headers: { Authorization: `Bearer ${token}` } }
            );
            const { liked } = response.data;
            setUserLiked(liked);
            setLikes(prevLikes => liked ? prevLikes + 1 : prevLikes - 1);
        } catch (err) { console.error(err); }
    };

    const handleCommentLike = async (commentId) => {
        if (!token) { openAuthModal('login'); return; }
        try {
            const res = await axios.post(
                `/api/comments/${commentId}/like`, {}, { headers: { Authorization: `Bearer ${token}` } }
            );
            const { liked } = res.data;
            setComments(prevComments => 
                prevComments.map(comment => {
                    if (comment.id === commentId) {
                        return {
                            ...comment,
                            curtidas: liked ? comment.curtidas + 1 : comment.curtidas - 1,
                            userLiked: liked
                        };
                    }
                    return comment;
                })
            );
        } catch (err) { console.error(err); }
    };

    // Funções de Edição/Lista/Deleção
    const handleEditClick = (comment) => {
        setEditingCommentId(comment.id);
        setEditText(comment.texto);
        setEditRating(comment.nota);
    };
    const handleCancelEdit = () => {
        setEditingCommentId(null);
        setEditText('');
        setEditRating(0);
    };
    const handleAddToListClick = () => {
        if (!token) openAuthModal('login'); 
        else openAddToListModal(book.id);
    };
    const handleUpdateReview = async (e) => {
        e.preventDefault();
        try {
            await axios.put(
                `/api/comments/${editingCommentId}`,
                { texto: editText, nota: editRating },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setEditingCommentId(null);
            fetchBookDetails(); 
        } catch (err) { console.error(err); }
    };
    const handleDeleteClick = (commentId) => setCommentToDelete(commentId);
    const handleDeleteConfirm = async () => {
        if (!commentToDelete) return;
        try {
            await axios.delete(`/api/comments/${commentToDelete}`, { headers: { Authorization: `Bearer ${token}` } });
            setCommentToDelete(null); 
            fetchBookDetails(); 
        } catch (err) { setCommentToDelete(null); }
    };

    if (loading) return <div className="loading-screen"><p>Carregando...</p></div>;
    if (error) return <div className="error-screen"><p>{error}</p></div>;
    if (!book) return <div className="error-screen"><p>Livro não encontrado.</p></div>;

    const coverImageUrl = book.capa ? book.capa : 'https://via.placeholder.com/300x450?text=Sem+Capa';
    const averageRating = rating.total_avaliacoes > 0 ? parseFloat(rating.media_avaliacoes).toFixed(1) : '0.0';

    return (
        <div className="book-page-wrapper">
            {/* Backdrop Azul no Topo */}
            <div className="book-backdrop"></div>

            {/* Container Principal */}
            <div className="book-content-container container">
                
                {/* --- SIDEBAR (ESQUERDA) --- */}
                <aside className="book-sidebar">
                    <div className="book-cover-wrapper">
                        <img src={coverImageUrl} alt={`Capa de ${book.titulo}`} className="book-cover-img" />
                    </div>
                    
                    <div className="book-actions">
                        <button 
                            onClick={handleLike} 
                            className={`action-btn ${userLiked ? 'liked' : ''}`}
                        >
                            {userLiked ? '❤️ Curtido' : '🤍 Curtir'} 
                            <span className="count">({likes})</span>
                        </button>

                        <button onClick={handleAddToListClick} className="action-btn list-btn">
                            🔖 Adicionar à Lista
                        </button>
                    </div>

                    {book.generos && book.generos.length > 0 && (
                        <div className="book-genres">
                            {book.generos.map(genre => (
                                <span key={genre.id} className="genre-pill">{genre.nome}</span>
                            ))}
                        </div>
                    )}
                </aside>

                {/* --- CONTEÚDO PRINCIPAL (DIREITA) --- */}
                <main className="book-main-content">
                    
                    {/* Cabeçalho */}
                    <div className="book-header-info">
                        <h1 className="book-title">{book.titulo}</h1>
                        <h2 className="book-author">por <span>{book.autor}</span></h2>
                        
                        <div className="book-rating-box">
                            <span className="rating-number">{averageRating}</span>
                            <div className="rating-stars">
                                <StarRating rating={Math.round(averageRating)} readOnly size="small"/>
                            </div>
                            <span className="rating-count">{rating.total_avaliacoes} avaliações</span>
                        </div>
                    </div>

                    {/* Sinopse com "Ler Mais" */}
                    <div className="book-synopsis">
                        <h3>Sinopse</h3>
                        <div className={`synopsis-container ${isClamped ? 'clamped' : ''} ${isOverflowing ? 'is-overflowing' : ''}`}>
                            <p className="synopsis-text" ref={synopsisRef}>{book.sinopse}</p>
                        </div>
                        {isOverflowing && (
                            <button onClick={() => setIsClamped(!isClamped)} className="btn-expand-synopsis">
                                {isClamped ? 'Ler mais' : 'Esconder'}
                            </button>
                        )}
                    </div>

                    <hr className="divider" />

                    {/* Reviews */}
                    <div className="reviews-section">
                        <h3>Avaliações da Comunidade</h3>

                        {/* Form de Avaliação */}
                        {!userHasReviewed && (
                            <div className="review-input-card">
                                {token ? (
                                    <form onSubmit={handleSubmitReview}>
                                        <h4>Escreva sua opinião</h4>
                                        <div className="rating-input">
                                            <span>Sua nota:</span>
                                            <StarRating rating={newRating} setRating={setNewRating} />
                                        </div>
                                        <textarea
                                            placeholder={`O que você achou deste livro, ${user.nome}?`}
                                            value={newComment}
                                            onChange={(e) => setNewComment(e.target.value)}
                                            required
                                        ></textarea>
                                        <button type="submit" className="btn-submit-review">Publicar Avaliação</button>
                                    </form>
                                ) : (
                                    <div className="login-prompt-box">
                                        <p>Faça login para avaliar este livro.</p>
                                        <button onClick={() => openAuthModal('login')} className="btn-login-prompt">Entrar</button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Lista de Comentários */}
                        <div className="comments-list">
                            {comments.length === 0 && <p>Seja o primeiro a avaliar!</p>}
                            
                            {comments.map(comment => {
                                const isOwnComment = user && comment.usuario_id === user.id;
                                
                                return (
                                    <div key={comment.id} className={`comment-card ${isOwnComment ? 'own-card' : ''}`}>
                                        <div className="comment-card-header">
                                            <div className="user-info" onClick={() => setViewingProfileId(comment.usuario_id)}>
                                                <div className="user-avatar-placeholder">
                                                    {comment.usuario_nome.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="user-meta">
                                                    <span className="username">{comment.usuario_nome}</span>
                                                    {isOwnComment && <span className="badge-you">Você</span>}
                                                </div>
                                            </div>
                                            <div className="user-rating">
                                                <StarRating rating={comment.nota} readOnly size="small" />
                                            </div>
                                        </div>

                                        <div className="comment-card-body">
                                            {editingCommentId === comment.id ? (
                                                <form onSubmit={handleUpdateReview} className="edit-review-form">
                                                    <StarRating rating={editRating} setRating={setEditRating} />
                                                    <textarea value={editText} onChange={(e) => setEditText(e.target.value)} required />
                                                    <div className="edit-actions">
                                                        <button type="button" onClick={handleCancelEdit} className="btn-cancel">Cancelar</button>
                                                        <button type="submit" className="btn-save">Salvar</button>
                                                    </div>
                                                </form>
                                            ) : (
                                                <p className="review-text">"{comment.texto}"</p>
                                            )}
                                        </div>

                                        <div className="comment-card-footer">
                                            <button onClick={() => handleCommentLike(comment.id)} className={`btn-like-comment ${comment.userLiked ? 'liked' : ''}`}>
                                                👍 {comment.curtidas > 0 ? comment.curtidas : ''} Curtir
                                            </button>
                                            {isOwnComment && !editingCommentId && (
                                                <div className="owner-actions">
                                                    <button onClick={() => handleEditClick(comment)} className="btn-icon edit">✎ Editar</button>
                                                    <button onClick={() => handleDeleteClick(comment.id)} className="btn-icon delete">🗑️ Excluir</button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </main>
            </div>

            {/* Modais */}
            {viewingProfileId && (
                <UserProfileModal
                    userId={viewingProfileId}
                    closeModal={() => setViewingProfileId(null)}
                    openListDetailModal={openListDetailModal}
                />
            )}
            <ConfirmModal
                isOpen={commentToDelete !== null}
                onClose={() => setCommentToDelete(null)}
                onConfirm={handleDeleteConfirm}
                title="Confirmar Exclusão"
            >
                <p>Você tem certeza? Essa ação não pode ser desfeita.</p>
            </ConfirmModal>
        </div>
    );
};

export default BookDetailPage;