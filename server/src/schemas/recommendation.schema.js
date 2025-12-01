const { z } = require('zod');

const recommendationSchema = z.object({
  livro_id: z.number(),
  usuario_destino_id: z.number()
});

module.exports = { recommendationSchema };