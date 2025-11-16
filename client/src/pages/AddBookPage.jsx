// pages/AddBookPage.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './AdminForms.css'; //

const AddBookPage = () => {
    const [titulo, setTitulo] = useState(''); //
    const [autor, setAutor] = useState(''); //
    const [sinopse, setSinopse] = useState(''); //
    const [capa, setCapa] = useState('');  //
    
    // --- NOVOS ESTADOS ---
    const [allGenres, setAllGenres] = useState([]); // Para listar os gêneros
    const [selectedGenres, setSelectedGenres] = useState([]); // Para guardar os IDs selecionados
    
    const [message, setMessage] = useState(''); //
    const navigate = useNavigate(); //

    // --- NOVO useEffect para buscar os gêneros ---
    useEffect(() => {
        const fetchGenres = async () => {
            try {
                const res = await axios.get('/api/genres');
                setAllGenres(res.data);
            } catch (error) {
                console.error("Erro ao buscar gêneros:", error);
                setMessage("Erro ao carregar lista de gêneros.");
            }
        };
        fetchGenres();
    }, []); // Executa só uma vez

    // --- NOVA Função para lidar com a seleção de gêneros ---
    const handleGenreChange = (e) => {
        const genreId = parseInt(e.target.value);
        if (e.target.checked) {
            // Adiciona o ID ao array
            setSelectedGenres(prev => [...prev, genreId]);
        } else {
            // Remove o ID do array
            setSelectedGenres(prev => prev.filter(id => id !== genreId));
        }
    };

    const handleSubmit = async (e) => { //
        e.preventDefault();
        
        const newBook = {
            titulo,
            autor,
            sinopse,
            capa,
            generos: selectedGenres // <<< ENVIA O ARRAY DE IDs
        };

        try {
            const token = localStorage.getItem('token');
            const res = await axios.post('/api/books', newBook, { //
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            setMessage('Livro adicionado com sucesso! Redirecionando...'); //
            setTimeout(() => navigate(`/book/${res.data.id}`), 2000); //
        } catch (err) {
            setMessage(err.response?.data?.message || 'Erro ao adicionar livro.'); //
        }
    };

    return (
        <div className="admin-form-container">
            <h2>Adicionar Novo Livro</h2>
            <form onSubmit={handleSubmit}>
                
                {/* --- AQUI ESTÃO OS INPUTS QUE FALTAVAM --- */}
                <div className="form-group">
                    <label>Título</label>
                    <input type="text" value={titulo} onChange={e => setTitulo(e.target.value)} required />
                </div>
                <div className="form-group">
                    <label>Autor</label>
                    <input type="text" value={autor} onChange={e => setAutor(e.target.value)} required />
                </div>
                <div className="form-group">
                    <label>Sinopse</label>
                    <textarea value={sinopse} onChange={e => setSinopse(e.target.value)} required />
                </div>
                <div className="form-group">
                    <label>URL da Capa do Livro</label>
                    <input 
                        type="url" 
                        placeholder="https://exemplo.com/imagem.jpg"
                        value={capa} 
                        onChange={e => setCapa(e.target.value)} 
                        required 
                    />
                </div>
                {/* --- FIM DOS INPUTS QUE FALTAVAM --- */}


                {/* --- NOVO CAMPO DE GÊNEROS --- */}
                <div className="form-group">
                    <label>Gêneros</label>
                    <div className="checkbox-group">
                        {allGenres.length > 0 ? allGenres.map(genre => (
                            <label key={genre.id}>
                                <input 
                                    type="checkbox" 
                                    value={genre.id}
                                    onChange={handleGenreChange}
                                    checked={selectedGenres.includes(genre.id)}
                                />
                                {genre.nome}
                            </label>
                        )) : (
                            <p>Carregando gêneros...</p>
                        )}
                    </div>
                </div>
                
                <button type="submit" className="submit-btn">Adicionar Livro</button>
            </form>
            {message && <p className="message">{message}</p>}
        </div>
    );
};

export default AddBookPage;