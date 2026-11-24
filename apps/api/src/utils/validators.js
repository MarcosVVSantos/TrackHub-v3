const { z } = require("zod");

const registerSchema = z.object({
  email: z.string().trim().email("Informe um email válido").max(254, "Email muito longo"),
  username: z
    .string()
    .trim()
    .min(3, "O username deve ter pelo menos 3 caracteres")
    .max(30, "O username deve ter no máximo 30 caracteres")
    .regex(/^[a-zA-Z0-9_.]+$/, "Use só letras, números, ponto e underline no username"),
  name: z.string().trim().min(2, "O nome deve ter pelo menos 2 caracteres").max(60, "O nome deve ter no máximo 60 caracteres"),
  // bcrypt só considera os primeiros 72 bytes; acima disso a senha seria truncada sem aviso.
  password: z
    .string()
    .min(8, "A senha deve ter pelo menos 8 caracteres")
    .max(72, "A senha deve ter no máximo 72 caracteres")
    .refine((value) => /[A-Za-z]/.test(value) && /[0-9]/.test(value), "A senha precisa ter letras e números"),
});

// No login a regra é mais solta, para não travar quem criou conta com a regra antiga (6 caracteres).
const loginSchema = z.object({
  email: z.string().trim().email("Informe um email válido").max(254),
  password: z.string().min(1, "Informe a senha").max(200),
});

module.exports = {
  registerSchema,
  loginSchema,
};
