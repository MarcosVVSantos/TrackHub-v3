function errorHandler(err, req, res, next) {
  if (err?.name === "ZodError" && err.issues?.length) {
    const message = err.issues.map((issue) => issue.message).join(" | ");
    return res.status(400).json({ message });
  }

  if (err?.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ message: "O arquivo deve ter no máximo 2MB" });
  }

  const status = err.status || 500;
  const message = err.message || "Ocorreu um erro inesperado";

  res.status(status).json({ message });
}

module.exports = errorHandler;
