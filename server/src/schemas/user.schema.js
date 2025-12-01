const { z } = require('zod');

const updateUserSchema = z.object({
  nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres")
});

module.exports = { updateUserSchema };