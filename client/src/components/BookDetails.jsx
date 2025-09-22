import React, { useState, useEffect } from 'react';
import './BookDetails.css'; // Criaremos este arquivo de estilo a seguir

// --- Dados Fictícios (Mock Data) ---
// Em uma aplicação real, estes dados viriam de uma chamada à sua API (backend)
const mockBookData = {
  id: 1,
  title: 'Odisseia',
  author: 'Homero',
  coverImage: 'https://placehold.co/300x450/007bff/white?text=Odisseia', // Imagem de exemplo
  description: 'A Odisseia é um dos dois principais poemas épicos da Grécia Antiga, atribuídos a Homero. É uma sequência da Ilíada e narra o retorno de Odisseu, herói da Guerra de Troia, à sua terra natal, Ítaca. A viagem de volta leva dez anos, durante os quais ele enfrenta inúmeros perigos e desafios, enquanto sua esposa Penélope e seu filho Telêmaco precisam lidar com pretendentes que cobiçam o trono de Ítaca.',
};

const mockComments = [
    { id: 101, user: 'Leitor voraz', text: 'Um clássico indispensável! A jornada de Odisseu é atemporal.'},
    { id: 102, user: 'Ana P.', text: 'Achei a leitura um pouco densa no começo, mas depois me prendeu totalmente.'},
];
// ------------------------------------


// Componente para renderizar as estrelas de avaliação
const StarRating = ({ rating, onRating }) => {
  return (
    <div className="star-rating">
      {[...Array(5)].map((_, index) => {
        const ratingValue = index + 1;
        return (
          <span
            key={ratingValue}
            className={ratingValue <= rating ? 'star filled' : 'star'}
            onClick={() => onRating(ratingValue)}
          >
            &#9733; {/* Código HTML para uma estrela */}
          </span>
        );
      })}
    </div>
  );
};


const BookDetails = () => {
  // Estado para os dados do livro
  const [book, setBook] = useState(mockBookData);

  // Estado para controlar a autenticação e interação do usuário
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [userRating, setUserRating] = useState(0); // 0 = sem avaliação
  const [newComment, setNewComment] = useState('');
  const [comments, setComments] = useState(mockComments);

  // Verifica se o usuário está logado ao carregar o componente
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsLoggedIn(true);
      // Em uma aplicação real, você faria uma chamada à API aqui
      // para buscar se o usuário já curtiu ou avaliou este livro.
    }
  }, []); // O array vazio [] garante que isso rode apenas uma vez

  const handleLike = () => {
    // Em uma app real, aqui você enviaria a requisição para a API
    setIsLiked(!isLiked);
  };

  const handleRating = (rate) => {
    // Em uma app real, aqui você enviaria a requisição para a API
    setUserRating(rate);
  }

  const handleCommentSubmit = (e) => {
    e.preventDefault();
    if (newComment.trim() === '') return;

    // Em uma app real, aqui você enviaria a requisição para a API
    const newCommentObject = {
        id: Date.now(), // ID simples para o exemplo
        user: 'Usuário Logado', // Em uma app real, pegaria o nome do usuário logado
        text: newComment
    };

    setComments([newCommentObject, ...comments]); // Adiciona o novo comentário no início da lista
    setNewComment(''); // Limpa o campo de texto
  }

  return (
    <div className="book-details-page">
      <div className="book-details-card">
        <div className="book-cover">
          <img src={book.coverImage} alt={`Capa do livro ${book.title}`} />
        </div>
        <div className="book-info">
          <h1>{book.title}</h1>
          <p className="author">por {book.author}</p>
          <p className="description">{book.description}</p>

          {/* === SEÇÃO INTERATIVA - SÓ APARECE SE ESTIVER LOGADO === */}
          {isLoggedIn && (
            <div className="interactive-section">
              <div className="actions">
                <button
                    onClick={handleLike}
                    className={`like-btn ${isLiked ? 'liked' : ''}`}
                >
                    {isLiked ? '❤️ Curtido' : '🤍 Curtir'}
                </button>
                <div className="rating-section">
                    <span>Sua Avaliação:</span>
                    <StarRating rating={userRating} onRating={handleRating} />
                </div>
              </div>

              <div className="comment-section">
                <h3>Deixe seu comentário</h3>
                <form onSubmit={handleCommentSubmit}>
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Escreva o que você achou do livro..."
                    rows="4"
                  />
                  <button type="submit">Enviar Comentário</button>
                </form>
              </div>
            </div>
          )}
          {/* ======================================================= */}

          <div className="comments-list">
            <h3>Comentários da Comunidade</h3>
            {comments.length > 0 ? (
                comments.map(comment => (
                    <div key={comment.id} className="comment-item">
                        <strong>{comment.user}</strong>
                        <p>{comment.text}</p>
                    </div>
                ))
            ) : (
                <p>Ainda não há comentários. Seja o primeiro!</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookDetails;