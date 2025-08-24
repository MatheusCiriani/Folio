const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors()); // Permite requisições de outras origens (nosso React app)
app.use(express.json()); // Habilita o parsing de JSON no corpo das requisições

// --- Simulação de um banco de dados ---
// Em uma aplicação real, você usaria MongoDB, PostgreSQL, etc.
const users = [];
const SECRET_KEY = 'sua-chave-super-secreta-aqui'; // Mude isso em um projeto real

// --- Rota de Cadastro (Register) ---
app.post('/api/register', async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Validação básica
    if (!email || !password) {
      return res.status(400).json({ message: 'Email e senha são obrigatórios.' });
    }

    // 2. Verifica se o usuário já existe
    const existingUser = users.find(user => user.email === email);
    if (existingUser) {
      return res.status(400).json({ message: 'Este email já está em uso.' });
    }

    // 3. Criptografa a senha
    const hashedPassword = await bcrypt.hash(password, 10); // 10 é o "salt rounds"

    // 4. Salva o novo usuário
    const newUser = { id: users.length + 1, email, password: hashedPassword };
    users.push(newUser);

    console.log('Usuários cadastrados:', users);
    res.status(201).json({ message: 'Usuário cadastrado com sucesso!' });

  } catch (error) {
    res.status(500).json({ message: 'Erro no servidor.', error });
  }
});

// --- Rota de Login ---
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Validação básica
    if (!email || !password) {
      return res.status(400).json({ message: 'Email e senha são obrigatórios.' });
    }

    // 2. Encontra o usuário
    const user = users.find(user => user.email === email);
    if (!user) {
      return res.status(400).json({ message: 'Credenciais inválidas.' }); // Mensagem genérica por segurança
    }

    // 3. Compara a senha enviada com a senha criptografada no "banco"
    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(400).json({ message: 'Credenciais inválidas.' });
    }

    // 4. Gera o Token JWT
    const token = jwt.sign({ id: user.id, email: user.email }, SECRET_KEY, {
      expiresIn: '1h', // Token expira em 1 hora
    });

    res.status(200).json({ message: 'Login bem-sucedido!', token });

  } catch (error) {
    res.status(500).json({ message: 'Erro no servidor.', error });
  }
});


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});