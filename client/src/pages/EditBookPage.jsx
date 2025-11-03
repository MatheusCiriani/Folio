// pages/EditBookPage.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import './AdminForms.css'; //

const EditBookPage = () => {
    const { id } = useParams();
    const [titulo, setTitulo] = useState('');
    const [autor, setAutor] = useState('');
    const [sinopse, setSinopse] = useState('');
    const [capa, setCapa] = useState('');
    
    // Estados para os gêneros
    const [allGenres, setAllGenres] = useState([]);
    const [selectedGenres, setSelectedGenres] = useState([]);

    const [message, setMessage] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const fetchBookAndGenres = async () => {
            try {
                // 1. Busca todos os gêneros
                const genresRes = await axios.get('http://localhost:3001/api/genres');
                setAllGenres(genresRes.data);

                // 2. Busca os dados do livro
                const bookRes = await axios.get(`http://localhost:3001/api/books/${id}`);
                const book = bookRes.data;
                
                // 3. Preenche todos os estados
                setTitulo(book.titulo);
                setAutor(book.autor);
                setSinopse(book.sinopse);
                setCapa(book.capa);
                
                // 4. Preenche os gêneros que já estavam selecionados
                setSelectedGenres(book.generos.map(g => g.id));

            } catch (error) {
                setMessage('Erro ao carregar dados do livro ou gêneros.');
            }
        };
        fetchBookAndGenres();
    }, [id]);

    // Função para lidar com a seleção de gêneros
    const handleGenreChange = (e) => {
        const genreId = parseInt(e.target.value);
        if (e.target.checked) {
            setSelectedGenres(prev => [...prev, genreId]);
        } else {
            setSelectedGenres(prev => prev.filter(id => id !== genreId));
        }
    };


    const handleSubmit = async (e) => {
        e.preventDefault();

        // Monta o objeto com todos os dados
        const updatedBook = {
            titulo,
            autor,
            sinopse,
            capa,
            generos: selectedGenres
        };

        try {
            const token = localStorage.getItem('token');
            await axios.put(`http://localhost:3001/api/books/${id}`, updatedBook, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setMessage('Livro atualizado com sucesso! Redirecionando...');
            setTimeout(() => navigate(`/book/${id}`), 2000);
        } catch (err) {
            setMessage(err.response?.data?.message || 'Erro ao atualizar livro.');
        }
    };

    return (
        <div className="admin-form-container">
            <h2>Editar Livro</h2>
            <form onSubmit={handleSubmit}>
                
                {/* --- CAMPOS QUE FALTAVAM --- */}
                <div className="form-group">
                    <label>Título</label>
                    <input type="text" value={titulo} onChange={e => setTitulo(e.target.value)} required />
                </div>
                <div className="form-group">
                    <label>Autor</label>
                    <input type="text" value={autor} onChange={e => setAutor(e.target.value)} required />
                </div>
                {/* --- FIM DOS CAMPOS QUE FALTAVAM --- */}

                <div className="form-group">
                    <label>Sinopse</label>
                    <textarea value={sinopse} onChange={e => setSinopse(e.target.value)} required />
                </div>
                
                <div className="form-group">
                    <label>URL da Capa Atual</label>
                    {capa && <img src={capa} alt="Capa atual" style={{ maxWidth: '100px', display: 'block', marginBottom: '10px' }} />}
                    <input 
                        type="url" 
                        value={capa} 
                        onChange={e => setCapa(e.target.value)} 
                        required 
                    />
                </div>
                
                <div className="form-group">
                    <label>Gêneros</label>
                    <div className="checkbox-group">
                        {allGenres.map(genre => (
                            <label key={genre.id}>
                                <input 
                                    type="checkbox" 
                                    value={genre.id}
                                    onChange={handleGenreChange}
                                    checked={selectedGenres.includes(genre.id)} // Define se está marcado
                                />
                                {genre.nome}
                            </label>
                        ))}
                    </div>
                </div>

                <button type="submit" className="submit-btn">Salvar Alterações</button>
            </form>
            {message && <p className="message">{message}</p>}
        </div>
    );
};

export default EditBookPage;