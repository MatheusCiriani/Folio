/*import React, { useState } from 'react';
import Register from './components/Register';
import Login from './components/Login';
import './App.css';

// Importando o logo da pasta assets
import folioLogo from './assets/folio-logo.jpeg';

function App() {
  const [isLoginView, setIsLoginView] = useState(true);

  return (
    <div className="auth-container">
      <div className="logo-container">
        <img src={folioLogo} alt="Fólio Logo" />
      </div>

      {isLoginView ? <Login /> : <Register />}

      <div className="toggle-auth">
        {isLoginView ? (
          <p>
            Não tem uma conta?{' '}
            <button onClick={() => setIsLoginView(false)}>Cadastre-se</button>
          </p>
        ) : (
          <p>
            Já tem uma conta?{' '}
            <button onClick={() => setIsLoginView(true)}>Faça login</button>
          </p>
        )}
      </div>
    </div>
  );
}

export default App;
*/
// client/src/App.js

import React from 'react';
import BookDetails from './components/BookDetails';
// import './App.css'; // O CSS principal pode não ser necessário aqui

function App() {
  // Por enquanto, vamos exibir apenas a página de detalhes para teste
  return (
    <main>
      <BookDetails />
    </main>
  );
}

export default App;