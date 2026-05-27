# Controle de Frota

Sistema web para controle de frota de uma revendedora de veículos.

## Recursos

- Cadastro, edição, venda e exclusão de veículos
- Controle de estoque, pendências, manutenção e documentos
- Relatórios de estoque e veículos vendidos por período
- Exportação CSV compatível com Excel em português do Brasil
- Firebase como banco de dados e autenticação
- Criação de cadastro, login com e-mail/senha e recuperação de senha
- Dados separados por usuário autenticado

## Estrutura

- `Firebase Authentication`: cadastro, login, sair e recuperação de senha
- `Cloud Firestore`: veículos e dados da frota
- `GitHub`: versionamento do código
- `Vercel`: publicação do site

## Rodar localmente

Configure o Firebase primeiro. Depois abra `index.html` no navegador ou sirva a pasta com um servidor estático.

```powershell
python -m http.server 4173 --bind 127.0.0.1
```

Depois acesse `http://127.0.0.1:4173`.

## Configurar Firebase

1. Crie um projeto no Firebase.
2. Em Authentication, habilite o método `Email/senha`.
3. Em Firestore Database, crie um banco em modo produção.
4. Em Firestore Rules, publique as regras do arquivo `firestore.rules`.
5. Crie a coleção `vehicles`, conforme o arquivo `firebase-estrutura.md`.
6. Em Project settings > General, crie um Web App.
7. Copie as credenciais do Firebase Web App.
8. Edite `config.js`:

```js
window.APP_CONFIG = {
  FIREBASE_API_KEY: "sua-api-key",
  FIREBASE_AUTH_DOMAIN: "seu-projeto.firebaseapp.com",
  FIREBASE_PROJECT_ID: "seu-projeto",
  FIREBASE_STORAGE_BUCKET: "seu-projeto.appspot.com",
  FIREBASE_MESSAGING_SENDER_ID: "000000000000",
  FIREBASE_APP_ID: "1:000000000000:web:xxxxxxxxxxxxxxxx"
};
```

Sem essa configuração, o sistema mostra erro e não salva dados.

## Login e senha

O sistema só carrega após login no Firebase. A tela inicial permite criar cadastro, entrar com e-mail/senha e recuperar senha. A opção `Esqueci minha senha` envia um link de recuperação para o e-mail do usuário cadastrado.

## Publicar no Vercel

1. Suba este projeto para um repositório no GitHub.
2. No Vercel, importe o repositório.
3. Framework preset: `Other`.
4. Build command: deixe vazio.
5. Output directory: deixe vazio.
6. Deploy.

## Segurança

As regras atuais vinculam cada veículo ao campo `ownerUid`. Cada usuário autenticado só consegue ler, criar, editar e excluir os próprios veículos.
