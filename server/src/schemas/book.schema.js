const { z } = require('zod');

const bookSchema = z.object({
  titulo: z.string().min(1, "Título é obrigatório"),
  autor: z.string().min(1, "Autor é obrigatório"),
  sinopse: z.string().optional(),
  capa: z.string().url("URL da capa inválida").optional().or(z.literal('')),
  // Espera um array de IDs numéricos para os gêneros
  generos: z.array(z.number()).optional()
});

const reviewSchema = z.object({
  texto: z.string().min(1, "O comentário é obrigatório"),
  nota: z.number().min(1).max(5)
});

module.exports = { bookSchema, reviewSchema };