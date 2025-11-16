// components/CreateListModal.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './AuthModal.css'; // Reutilizando o estilo do AuthModal

const CreateListModal = ({ closeModal, onListCreated, listToEdit }) => {
    const [nome, setNome] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const token = localStorage.getItem('token');

    // Se estamos editando, preenche o nome
    useEffect(() => {
        if (listToEdit) {
            setNome(listToEdit.nome);
        }
    }, [listToEdit]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            
            if (listToEdit) {
                // Modo Edição
                await axios.put(`/api/lists/${listToEdit.id}`, { nome }, config);
            } else {
                // Modo Criação
                await axios.post('/api/lists/', { nome }, config);
            }
            
            onListCreated(); // Diz à página pai (ProfilePage) para recarregar as listas
            closeModal();

        } catch (err) {
            setMessage(err.response?.data?.message || 'Erro ao salvar lista.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={closeModal}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <button className="close-button" onClick={closeModal}>X</button>
                <h2>{listToEdit ? 'Editar Lista' : 'Criar Nova Lista'}</h2>
                
                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="form-group">
                        <label>Nome da Lista</label>
                        <input
                            type="text"
                            value={nome}
                            onChange={(e) => setNome(e.target.value)}
                            placeholder="Ex: Quero Ler"
                            required
                        />
                    </div>
                    
                    {message && <p className="error-message">{message}</p>}
                    
                    <button type="submit" disabled={loading} className="submit-btn">
                        {loading ? 'Salvando...' : 'Salvar'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default CreateListModal;