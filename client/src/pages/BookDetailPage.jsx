import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import ConfirmModal from '../components/ConfirmModal'; // <<< IMPORTE O NOVO COMPONENTE
import UserProfileModal from '../components/UserProfileModal';
import './BookDetailPage.css';

// Componente para as estrelas
const StarRating = ({ rating, setRating }) => {
    const [hover, setHover] = useState(0);
    return (
        <div className="star-rating">
            {[...Array(5)].map((star, index) => {
                const ratingValue = index + 1;
                return (
                    <span
                        key={index}
                        className="star"
                        style={{ color: ratingValue <= (hover || rating) ? "#f5c518" : "#ccc" }}
                        onClick={() => setRating(ratingValue)}
                        onMouseEnter={() => setHover(ratingValue)}
                        onMouseLeave={() => setHover(0)}
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

    // --- CORREÇÃO DO LOOP ---
    // 1. Pegue o token e o user (e seu ID) AQUI FORA.
    // Assim, 'userId' é um valor primitivo (estável) que podemos usar nos hooks.
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('usuarios'));
    const userId = user?.id; // Esta é a dependência estável que usaremos
    // --- FIM DA CORREÇÃO ---

    const [editingCommentId, setEditingCommentId] = useState(null);
    const [editText, setEditText] = useState('');
    const [editRating, setEditRating] = useState(0);
    const [commentToDelete, setCommentToDelete] = useState(null);
    const [likes, setLikes] = useState(0);
    const [userLiked, setUserLiked] = useState(false);
    const [viewingProfileId, setViewingProfileId] = useState(null);

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
            
            // --- CORREÇÃO DO LOOP ---
            // 2. Use 'userId' (estável) aqui dentro, em vez do objeto 'user'
            if (userId) {
                let userComment = null;
                const otherComments = fetchedComments.filter(comment => {
                    if (comment.usuario_id === userId) { // Usando userId
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
            // --- FIM DA CORREÇÃO ---

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
    // --- CORREÇÃO DO LOOP ---
    // 3. Use 'userId' no array de dependências.
    }, [id, token, userId]);

    useEffect(() => {
        // A verificação 'user?.id' garante que o user não é nulo antes de acessar o id
        fetchBookDetails();
    }, [fetchBookDetails]);

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
            console.error("Erro ao enviar avaliação:", err);
            alert(err.response?.data?.message || "Não foi possível enviar sua avaliação.");
        }
    };

    // --- Função de Curtir / Descurtir ---
    const handleLike = async () => {
        if (!token) {
            openAuthModal('login');
            return;
        }

        try {
            const response = await axios.post(
                `/api/books/${id}/like`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );

            // Atualiza estados baseado na resposta
            setUserLiked(response.data.liked);
            // Recarrega contagem e comentários/avaliações atualizadas
            fetchBookDetails();
        } catch (err) {
            console.error('Erro ao curtir livro:', err);
            alert('Não foi possível curtir o livro.');
        }
    };

    // --- Curtir / Descurtir comentário ---
    const handleCommentLike = async (commentId) => {
        if (!token) {
            openAuthModal('login');
            return;
        }

        try {
            await axios.post(
                `/api/comments/${commentId}/like`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );

            // Atualiza os comentários e suas curtidas
            fetchBookDetails();
        } catch (err) {
            console.error('Erro ao curtir comentário:', err);
            alert('Não foi possível curtir o comentário.');
        }
    };


    if (loading) return <p>Carregando...</p>;
    if (error) return <p>{error}</p>;
    if (!book) return <p>Livro não encontrado.</p>;

    const coverImageUrl = book.capa ? book.capa : 'caminho/para/imagem/padrao.jpg';
    const averageRating = rating.total_avaliacoes > 0
        ? parseFloat(rating.media_avaliacoes).toFixed(1)
        : '0.0';

    const userCommentStyle = {
        border: '1px solid var(--primary-blue)',
        backgroundColor: 'rgba(0, 123, 255, 0.05)',
        padding: '1.5rem',
        borderRadius: '8px'
    };

    // --- NOVAS FUNÇÕES ---

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
        if (!token) {
            openAuthModal('login'); // Abre o modal de login se não estiver logado
        } else {
            openAddToListModal(book.id); // Abre o modal de adicionar à lista
        }
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
            fetchBookDetails(); // Recarrega os dados para mostrar a atualização
        } catch (err) {
            console.error("Erro ao atualizar avaliação:", err);
            alert("Não foi possível atualizar sua avaliação.");
        }
    };

    const handleDeleteClick = (commentId) => {
        setCommentToDelete(commentId);
    };

    // 2. Executa a exclusão após a confirmação no modal
    const handleDeleteConfirm = async () => {
        if (!commentToDelete) return;

        try {
            await axios.delete(
                `/api/comments/${commentToDelete}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setCommentToDelete(null); // Fecha o modal
            fetchBookDetails(); // Recarrega os dados para remover o comentário da tela
        } catch (err) {
            console.error("Erro ao deletar avaliação:", err);
            alert("Não foi possível deletar sua avaliação.");
            setCommentToDelete(null); // Fecha o modal mesmo se der erro
        }
    };

    return (
        <div className="book-detail-container">
            <div className="book-info">
                <img src={coverImageUrl} alt={`Capa de ${book.titulo}`} className="book-cover-large" />
                <h1>{book.titulo}</h1>
                <h2>por {book.autor}</h2>
                
                {book.generos && book.generos.length > 0 && (
                    <div className="genre-tags">
                        {book.generos.map(genre => (
                            <span key={genre.id} className="genre-tag">
                                {genre.nome}
                            </span>
                        ))}
                    </div>
                )}
                
                {rating.total_avaliacoes > 0 && (
                    <div className="rating">
                        <span>⭐ {averageRating} ({rating.total_avaliacoes} avaliações)</span>
                    </div>
                )}
                <p>{book.sinopse}</p>
                <button onClick={handleLike} className="like-button">
                    {userLiked ? '💔 Remover Curtida' : '❤️ Curtir Livro'} ({likes})
                </button>
                
                {/* Botão Adicionar à Lista */}
                <button onClick={handleAddToListClick} className="add-to-list-button">
                    + Adicionar à Lista
                </button>
            </div>

            <div className="book-reviews">
                <h3>Avaliações ({comments.length})</h3>

                {token && !userHasReviewed && (
                    <form onSubmit={handleSubmitReview} className="review-form">
                        <h4>Deixe sua avaliação</h4>
                        <StarRating rating={newRating} setRating={setNewRating} />
                        <textarea
                            placeholder={`O que você achou, ${user.nome}?`}
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            required
                        ></textarea>
                        <button type="submit" className="submit-btn">Enviar Avaliação</button>
                    </form>
                )}
                {token && userHasReviewed && (
                    <div className="login-prompt">
                        <p>Sua avaliação já foi registrada para este livro.</p>
                    </div>
                )}
                {!token && (
                    <div className="login-prompt">
                        <p>Você precisa estar logado para deixar uma avaliação.</p>
                        <button onClick={() => openAuthModal('login')}>Entrar</button>
                    </div>
                )}

                {comments.map(comment => (
                    <div key={comment.id} className="comment" style={user && comment.usuario_id === user.id ? userCommentStyle : {}}>

                        {/* MODO DE EDIÇÃO */}
                        {editingCommentId === comment.id ? (
                            <form onSubmit={handleUpdateReview} className="edit-form">
                                <StarRating rating={editRating} setRating={setEditRating} />
                                <textarea
                                    value={editText}
                                    onChange={(e) => setEditText(e.target.value)}
                                    required
                                />
                                <div className="comment-actions">
                                    <button type="submit">Salvar</button>
                                    <button type="button" onClick={handleCancelEdit} className="btn-cancel">Cancelar</button>
                                </div>
                            </form>
                        ) : (
                            /* MODO DE VISUALIZAÇÃO (NORMAL) */
                            <>
                                <div className="comment-header">
                                    <strong 
                                        className="comment-author-name" 
                                        onClick={() => setViewingProfileId(comment.usuario_id)}
                                    >
                                        {comment.usuario_nome}
                                    </strong>
                                    {comment.nota > 0 && (
                                        <span className="comment-stars">{'⭐'.repeat(comment.nota)}</span>
                                    )}
                                </div>
                                <p>{comment.texto}</p>
                                <div className="comment-actions">
                                    <button
                                        onClick={() => handleCommentLike(comment.id)}
                                        className={comment.userLiked ? 'liked' : ''}>
                                        👍 {comment.curtidas}
                                    </button>


                                    {user && user.id === comment.usuario_id && (
                                        <>
                                            <button onClick={() => handleEditClick(comment)} className="btn-edit">Editar</button>
                                            <button onClick={() => handleDeleteClick(comment.id)} className="btn-delete">Deletar</button>
                                        </>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                ))}
            </div>

            {/* 4. ADICIONE O MODAL NO FINAL DO RETURN */}
            {viewingProfileId && (
                <UserProfileModal
                    userId={viewingProfileId}
                    closeModal={() => setViewingProfileId(null)}
                    openListDetailModal={openListDetailModal} // <<< ADICIONE ESTA LINHA
                />
            )}

            {/* --- MODAL DE CONFIRMAÇÃO --- */}
            <ConfirmModal
                isOpen={commentToDelete !== null}
                onClose={() => setCommentToDelete(null)}
                onConfirm={handleDeleteConfirm}
                title="Confirmar Exclusão"
            >
                <p>Você tem certeza que deseja deletar sua avaliação? Esta ação não pode ser desfeita.</p>
            </ConfirmModal>
        </div>
    );
};

export default BookDetailPage;
