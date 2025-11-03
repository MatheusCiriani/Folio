// server/db.js
require('dotenv').config();
const mysql = require('mysql2/promise');
const { createTunnel } = require('tunnel-ssh');
const fs = require('fs');
const os = require('os');
const path = require('path');

// --- Lógica da Chave SSH (sem alterações) ---
const getSshKeyPath = () => {
    const customPath = process.env.SSH_KEY_PATH;
    if (customPath) {
        console.log(`Usando caminho da chave SSH definido em .env: ${customPath}`);
        return customPath;
    }
    const homeDir = os.homedir();
    const defaultPath = path.join(homeDir, '.ssh', 'id_rsa');
    console.log(`Usando caminho padrão da chave SSH: ${defaultPath}`);
    return defaultPath;
};

// --- Configuração da Conexão 1: Universidade (via SSH) ---
const tunnelConfig = {
    host: process.env.SSH_HOST,
    port: 22,
    username: process.env.SSH_USER,
    // A 'privateKey' será lida e adicionada depois
    dstHost: 'localhost',
    dstPort: 3387,
    localHost: '127.0.0.1',
    localPort: 3307
};

const univPoolConfig = {
    host: tunnelConfig.localHost, // 127.0.0.1
    port: tunnelConfig.localPort, // 3307
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

// --- Configuração da Conexão 2: Alwaysdata (Fallback) ---
const alwaysPoolConfig = {
    host: process.env.ALWAYS_DB_HOST,
    port: process.env.ALWAYS_DB_PORT || 3306,
    user: process.env.ALWAYS_DB_USER,
    password: process.env.ALWAYS_DB_PASSWORD,
    database: process.env.ALWAYS_DB_NAME || process.env.DB_NAME, // Usa DB_NAME se ALWAYS_DB_NAME não for fornecido
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

// --- Função Principal de Inicialização com Fallback ---
const initializeDatabase = async () => {
    
    // --- TENTATIVA 1: UNIVERSIDADE (via SSH) ---
    try {
        console.log('[Tentativa 1] Verificando conexão com a Universidade (via SSH)...');

        // 1. Verificar se a chave SSH existe
        const sshKeyPath = getSshKeyPath();
        if (!fs.existsSync(sshKeyPath)) {
            // Isso não é um erro fatal, apenas pulamos para o fallback
            throw new Error(`Chave SSH não encontrada em ${sshKeyPath}. Pulando para fallback.`);
        }
        
        // 2. Tentar criar o túnel SSH
        console.log(`[Tentativa 1] Iniciando túnel SSH para ${process.env.SSH_HOST}...`);
        const tunnelOptions = {
            ...tunnelConfig,
            privateKey: fs.readFileSync(sshKeyPath) // Adiciona a chave
        };
        await createTunnel(tunnelOptions);
        console.log('✅ [Tentativa 1] Túnel SSH estabelecido.');

        // 3. Tentar conectar ao banco via túnel
        console.log('[Tentativa 1] Criando pool de conexões (Universidade)...');
        const pool = mysql.createPool(univPoolConfig);
        const connection = await pool.getConnection(); // Testa a conexão
        
        console.log('✅✅ Conexão com o banco da UNIVERSIDADE estabelecida com sucesso! ✅✅');
        connection.release();
        return pool; // SUCESSO! Retorna o pool da universidade.

    } catch (sshError) {
        // Se CUALQUER coisa na Tentativa 1 falhar...
        console.warn(`⚠️  Falha na Conexão 1 (Universidade/SSH): ${sshError.message}`);
        console.log('Iniciando tentativa de fallback para Alwaysdata...');

        // --- TENTATIVA 2: ALWAYS DATA (Fallback) ---
        try {
            if (!process.env.ALWAYS_DB_HOST) {
                throw new Error("Variáveis de ambiente 'ALWAYS_DB_HOST' não configuradas para o fallback.");
            }

            console.log(`[Tentativa 2] Conectando diretamente ao Alwaysdata (${process.env.ALWAYS_DB_HOST})...`);
            const pool = mysql.createPool(alwaysPoolConfig);
            const connection = await pool.getConnection(); // Testa a conexão
            
            console.log('✅✅ Conexão com o banco ALWAYS DATA estabelecida com sucesso! ✅✅');
            connection.release();
            return pool; // SUCESSO! Retorna o pool do Alwaysdata.

        } catch (alwaysError) {
            // Se o fallback também falhar...
            console.error(`❌ Falha na Conexão 2 (Alwaysdata): ${alwaysError.message}`);
            console.error('ERRO FATAL: Não foi possível conectar a NENHUM banco de dados. Encerrando.');
            process.exit(1); // Aborta a aplicação
        }
    }
};

// Exportamos a promessa, exatamente como antes.
// O index.js não precisa saber de nada disso.
module.exports = initializeDatabase();