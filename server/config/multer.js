const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Define o diretório onde as imagens serão salvas
const uploadDir = 'uploads/';
// Cria o diretório se ele não existir
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Configura o armazenamento dos arquivos
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir); // Salva em 'uploads/'
    },
    filename: (req, file, cb) => {
        // Cria um nome de arquivo único para evitar conflitos
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// Exportamos o 'upload' para ser usado nas rotas e o 'uploadDir' para o index.js
module.exports = { upload, uploadDir };