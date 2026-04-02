# Éttore Decor - Gerador de Cenas de Produto

Sistema automatizado para gerar imagens profissionais de luminárias em ambientes reais.

## 🚀 Deploy no Render

### Passo 1: Criar repositório no GitHub
1. Crie um novo repositório chamado `ettore-scene-generator`
2. Faça push de todos os arquivos

### Passo 2: Deploy no Render
1. Acesse https://render.com
2. Clique em "New +" → "Web Service"
3. Conecte seu repositório GitHub `ettore-scene-generator`
4. Configurações:
   - **Name**: `ettore-scene-generator`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`

5. Clique em "Create Web Service"
6. Aguarde o deploy (3-5 minutos)

### Passo 3: Usar o sistema
1. Acesse a URL gerada (ex: `ettore-scene-generator.onrender.com`)
2. Cole a API key do fal.ai (salva automaticamente no navegador)
3. Faça upload da foto da luminária
4. Configure os parâmetros
5. Gere as imagens

## 🔑 API Key fal.ai

Pegue sua key em: https://fal.ai/dashboard/keys

## 📦 Parâmetros disponíveis

- **Ambiente**: Sala, quarto, banheiro, cozinha, home office, varanda, hall, sala de jantar
- **Iluminação**: Dia (apagada), Noite (acesa), Golden hour (apagada), Luz suave (acesa)
- **Foco**: Produto destaque, Integrado, Plano de fundo
- **Estilo**: Minimalista, Industrial, Boho, Contemporâneo, Aconchegante
- **Cena/Ação**: Campo livre (pessoa lendo, tomando café, vazio, etc)
- **Variações**: 1, 3 ou 5 ângulos diferentes

## 🛠️ Tecnologias

- Node.js + Express
- fal.ai (flux-pro/v1.1-ultra)
- Multer (upload de arquivos)
- HTML/CSS/JS (interface)

## 📝 Notas

- A API key fica salva no localStorage do navegador
- Suporta PNG e JPG (fundo branco/estúdio)
- Cada variação gera um ângulo diferente da mesma cena
- Tempo de geração: ~30s por imagem
