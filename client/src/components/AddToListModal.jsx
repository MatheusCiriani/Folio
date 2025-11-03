// components/AddToListModal.jsx
import React, { useState, useEffect, useCallback } from 'react'; // <<< A CORREÇÃO ESTÁ AQUI
import axios from 'axios';
import './AuthModal.css'; 
import './AddToListModal.css'; 

const AddToListModal = ({ closeModal, bookId }) => {
    const [lists, setLists] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [newListName, setNewListName] = useState('');
    const token = localStorage.getItem('token');

    // Esta é a função que usa o useCallback
    const fetchMyLists = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axios.get('http://localhost:3001/api/lists/', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setLists(res.data);
        } catch (error) {
            console.error("Erro ao carregar listas:", error);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchMyLists();
    }, [fetchMyLists]); // O useEffect agora depende da função 'useCallback'

    const handleAddToList = async (listId) => {
        setMessage('');
        try {
            await axios.post(
                `http://localhost:3001/api/lists/${listId}/books`,
                { bookId },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setMessage('Livro adicionado com sucesso!');
            setTimeout(closeModal, 1500);
        } catch (err) {
            setMessage(err.response?.data?.message || 'Erro ao adicionar livro.');
        }
    };

    const handleCreateAndAdd = async (e) => {
        e.preventDefault();
        setMessage('');
        try {
            // 1. Cria a lista
            const res = await axios.post(
                'http://localhost:3001/api/lists/',
                { nome: newListName },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const newListId = res.data.id;
            
            // 2. Adiciona o livro a ela
            await handleAddToList(newListId);

        } catch (err) {
            setMessage(err.response?.data?.message || 'Erro ao criar lista.');
        }
    };

    return (
        <div className="modal-overlay" onClick={closeModal}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <button className="close-button" onClick={closeModal}>X</button>
                <h2>Adicionar à Lista</h2>

                {message && <p className="message" style={{textAlign: 'center'}}>{message}</p>}

                <div className="lists-container">
                    {loading ? <p>Carregando...</p> : lists.map(list => (
                        <button key={list.id} onClick={() => handleAddToList(list.id)} className="list-item-btn">
                            {list.nome}
                        </button>
                    ))}
                </div>

                <hr style={{margin: '20px 0'}} />

                <form onSubmit={handleCreateAndAdd} className="auth-form">
                    <label>Ou crie uma nova lista:</label>
                    <input
                        type="text"
                        value={newListName}
                        onChange={(e) => setNewListName(e.target.value)}
                        placeholder="Ex: Favoritos"
                    />
                    <button type="submit" className="submit-btn" disabled={!newListName}>
                        Criar e Adicionar
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AddToListModal;