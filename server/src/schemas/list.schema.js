const { z } = require('zod');

const listSchema = z.object({
  nome: z.string().min(1, "O nome da lista é obrigatório")
});

const addBookToListSchema = z.object({
  bookId: z.number({ required_error: "ID do livro é obrigatório" })
});

module.exports = { listSchema, addBookToListSchema };