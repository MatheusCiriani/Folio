// server/db.js
require('dotenv').config();
const mysql = require('mysql2/promise');
const { createTunnel } = require('tunnel-ssh')
const fs = require('fs')
const os = require('os')
const path = require('path')

// --- Lógica Inteligente para Chave SSH ---
const getSshKeyPath = () =>{
    const customPath = process.env.SSH_KEY_PATH;
    if (customPath) {
        console.log(`Usando caminho da chave SSH definido em .env: ${customPath}`);
        return customPath;
    }

    // 2. Se não houver, monta o caminho padrão
    const homeDir = os.homedir(); // Pega C:\Users\Elias ou /home/elias
    const defaultPath = path.join(homeDir, '.ssh', 'id_rsa');

    console.log(`Usando caminho padrão da chave SSH: ${defaultPath}`);
    return defaultPath;
}

const sshKeyPath = getSshKeyPath();

// --- Verificação de Existência da Chave ---
// Isso vai parar o servidor ANTES de tentar conectar, se a chave não existir
if(!fs.existsSync(sshKeyPath)){
    console.error(`❌ Erro Fatal: Chave SSH não encontrada em ${sshKeyPath}`);
    console.error("Por favor, verifique se a chave existe ou defina SSH_KEY_PATH no seu .env se ela estiver em outro local.");
    process.exit(1);
}

// Configuração do TúNEL SSH
const tunnelConfig ={
    host: process.env.SSH_HOST,
    port: 22,
    username: process.env.SSH,
    privateKey: fs.readFileSync(sshKeyPath),

    // Configuração do encaminhamento
    dstHost: 'localhost',
    dstPort: 3387,
    localHost:'127.0.0.1',
    localPort: 3307
}

// const pool = mysql.createPool({
//     host: process.env.DB_HOST,       // Lê do .env
//     port: process.env.DB_PORT,
//     user: process.env.DB_USER,       // Lê do .env
//     password: process.env.DB_PASSWORD, // Lê do .env
//     database: process.env.DB_NAME,   // Lê do .env
//     waitForConnections: true,
//     connectionLimit: 10,
//     queueLimit: 0
// });

const poolConfig = {
    host: tunnelConfig.localHost,       // Lê do .env
    port: tunnelConfig.localPort,
    user: process.env.DB_USER,       // Lê do .env
    password: process.env.DB_PASSWORD, // Lê do .env
    database: process.env.DB_NAME,   // Lê do .env
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

// Função assíncrona para iniciar tudo
const initializeDatabase = async () => {
    try {
        // 1. Cria o túnel SSH
        console.log('Iniciando túnel SSH...');
        await createTunnel(tunnelConfig);
        console.log('✅ Túnel SSH estabelecido.');

        // 2. Cria o pool de conexões APÓS o túnel estar pronto
        console.log('Criando pool de conexões MySQL...');
        const pool = mysql.createPool(poolConfig);
        
        // 3. Testa a conexão (opcional, mas recomendado)
        const connection = await pool.getConnection();
        console.log('✅ Conexão com o banco de dados estabelecida com sucesso!');
        connection.release();

        return pool; // Retorna o pool pronto

    } catch (error) {
        console.error('❌ Erro fatal ao inicializar o banco de dados:', error.message);
        // Se o erro for de autenticação SSH, ele aparecerá aqui
        if (error.message.includes('Authentication failed')) {
            console.error("Verifique se a chave SSH é válida e se foi adicionada ao servidor remoto.");
        }
        process.exit(1); // Aborta a inicialização do servidor se o DB falhar
    }
};

module.exports = initializeDatabase();