function ErrorFallback() {
  return (
    <div className="mx-auto mt-24 max-w-md px-6 text-center">
      <h1 className="text-2xl font-semibold text-th-lilac">Algo deu errado</h1>
      <p className="mt-2 text-sm text-th-muted">
        O erro já foi registrado e vamos olhar. Recarregue a página para continuar.
      </p>
      <button className="btn-primary mx-auto mt-6" type="button" onClick={() => window.location.reload()}>
        Recarregar
      </button>
    </div>
  );
}

export default ErrorFallback;
