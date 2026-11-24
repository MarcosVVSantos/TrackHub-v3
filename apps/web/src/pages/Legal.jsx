import { Link } from "react-router-dom";

// Troque pelo e-mail que vai responder pedidos de usuários (suporte e LGPD).
const CONTACT_EMAIL = "contato@trackhub.app";
const UPDATED_AT = "24 de novembro de 2026";

function LegalLayout({ title, children }) {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Link to="/" className="text-sm text-th-lilac">
        Voltar para o início
      </Link>
      <h1 className="mt-4 text-3xl font-bold text-th-text">{title}</h1>
      <p className="mt-1 text-sm text-th-muted">Última atualização: {UPDATED_AT}</p>
      <div className="legal mt-8 space-y-6 text-sm leading-relaxed text-th-text">
        {children}
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold text-th-text">{title}</h2>
      {children}
    </section>
  );
}

export function Terms() {
  return (
    <LegalLayout title="Termos de uso">
      <Section title="1. O que é o TrackHub">
        <p>
          O TrackHub é uma plataforma para produtores e artistas organizarem e colaborarem em projetos
          musicais: quadro de etapas, versões de arquivos, agenda, chat, perfil público, feed e playlists.
        </p>
      </Section>
      <Section title="2. Sua conta">
        <p>
          Você é responsável pelos dados informados no cadastro e por manter sua senha em segredo. Avise-nos
          se perceber uso indevido da sua conta.
        </p>
      </Section>
      <Section title="3. Seu conteúdo é seu">
        <p>
          Áudios, imagens, letras e demais arquivos enviados continuam sendo de quem os criou. Ao enviar, você
          autoriza o TrackHub apenas a armazenar, processar e exibir esse conteúdo para as pessoas que você
          escolheu: colaboradores do projeto ou o público, quando você marca algo como público.
        </p>
        <p>
          Você declara ter os direitos sobre o que envia. A divisão de direitos entre colaboradores é
          combinada entre vocês; o TrackHub não é parte desse acordo.
        </p>
      </Section>
      <Section title="4. O que não é permitido">
        <ul className="list-disc space-y-1 pl-5">
          <li>Enviar conteúdo de terceiros sem autorização.</li>
          <li>Assediar, ameaçar ou discriminar outros usuários.</li>
          <li>Tentar acessar projetos ou contas que não são seus.</li>
          <li>Usar a plataforma para spam ou atividades ilegais.</li>
        </ul>
        <p>Contas que violarem estas regras podem ser suspensas e o conteúdo removido.</p>
      </Section>
      <Section title="5. Planos e limites">
        <p>
          O plano gratuito tem limites de projetos, colaboradores, armazenamento e playlists. Planos pagos,
          quando disponíveis, ampliam esses limites. Preços e condições serão informados antes da contratação.
        </p>
      </Section>
      <Section title="6. Disponibilidade">
        <p>
          Trabalhamos para manter o serviço no ar e seus arquivos seguros, mas recomendamos manter cópias dos
          arquivos importantes. O serviço é oferecido no estado em que se encontra.
        </p>
      </Section>
      <Section title="7. Encerramento">
        <p>
          Você pode encerrar sua conta quando quiser pedindo pelo e-mail abaixo. Podemos alterar estes termos;
          mudanças relevantes serão avisadas na plataforma.
        </p>
      </Section>
      <Section title="8. Contato">
        <p>
          Dúvidas: <a className="text-th-lilac" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        </p>
      </Section>
    </LegalLayout>
  );
}

export function Privacy() {
  return (
    <LegalLayout title="Política de privacidade">
      <p>
        Esta política explica quais dados o TrackHub coleta, por que e quais são seus direitos, conforme a Lei
        Geral de Proteção de Dados (Lei 13.709/2018).
      </p>
      <Section title="1. Dados que coletamos">
        <ul className="list-disc space-y-1 pl-5">
          <li>Cadastro: nome, username, e-mail e senha (guardada com criptografia, nunca em texto).</li>
          <li>Perfil: foto, bio e o que você decidir publicar.</li>
          <li>Conteúdo: arquivos, comentários, mensagens, tarefas e eventos dos seus projetos.</li>
          <li>Uso: páginas acessadas, ações no app e dados técnicos (navegador, erros), para melhorar o produto.</li>
        </ul>
      </Section>
      <Section title="2. Para que usamos">
        <ul className="list-disc space-y-1 pl-5">
          <li>Fazer a plataforma funcionar: login, projetos, colaboração e notificações.</li>
          <li>Corrigir erros e entender quais recursos são mais usados.</li>
          <li>Cobrança, quando você contratar um plano pago.</li>
          <li>Cumprir obrigações legais.</li>
        </ul>
        <p>Não vendemos seus dados.</p>
      </Section>
      <Section title="3. Com quem compartilhamos">
        <p>
          Apenas com fornecedores necessários para operar o serviço, como hospedagem, banco de dados,
          armazenamento de arquivos, monitoramento de erros, análise de uso e processamento de pagamentos. Eles
          só podem usar os dados para prestar esse serviço ao TrackHub.
        </p>
      </Section>
      <Section title="4. Quem vê o seu conteúdo">
        <p>
          Projetos privados são vistos só por você e pelos colaboradores que você convidar. Faixas, playlists e
          posts marcados como públicos podem ser vistos por qualquer pessoa.
        </p>
      </Section>
      <Section title="5. Por quanto tempo guardamos">
        <p>
          Enquanto sua conta estiver ativa. Ao pedir a exclusão, apagamos ou anonimizamos seus dados, exceto o
          que a lei exigir manter por mais tempo.
        </p>
      </Section>
      <Section title="6. Seus direitos">
        <p>
          Você pode pedir acesso, correção, cópia, exclusão dos seus dados ou revogar consentimentos, escrevendo
          para <a className="text-th-lilac" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
          Respondemos em até 15 dias.
        </p>
      </Section>
      <Section title="7. Segurança">
        <p>
          Usamos conexão criptografada (HTTPS), senhas com hash e controle de acesso por projeto. Nenhum sistema
          é 100% imune, e avisaremos os usuários afetados em caso de incidente relevante.
        </p>
      </Section>
    </LegalLayout>
  );
}
