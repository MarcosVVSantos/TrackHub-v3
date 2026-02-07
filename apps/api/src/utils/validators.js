const { z } = require("zod");

const registerSchema = z.object({
  email: z.string().email("Informe um email válido"),
  username: z.string().min(3, "O username deve ter pelo menos 3 caracteres"),
  name: z.string().min(2, "O nome deve ter pelo menos 2 caracteres"),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
});

const loginSchema = z.object({
  email: z.string().email("Informe um email válido"),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
});

module.exports = {
  registerSchema,
  loginSchema,
};
