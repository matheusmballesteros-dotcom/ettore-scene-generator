#!/bin/bash

# Script de Deploy Automatizado - Ettore Scene Generator
# Execute este script quando estiver no computador

set -e

echo "🚀 Iniciando deploy do Gerador de Cenas - Ettore Decor"
echo ""

# Verifica se gh esta instalado
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) nao encontrado. Instale em: https://cli.github.com/"
    exit 1
fi

# Verifica autenticacao
echo "🔑 Verificando autenticacao GitHub..."
if ! gh auth status &> /dev/null; then
    echo "⚠️  Voce precisa fazer login no GitHub CLI primeiro:"
    echo "Execute: gh auth login"
    exit 1
fi

cd /home/claude/ettore-scene-generator

# Inicializa git
echo "📦 Inicializando repositorio Git..."
git init
git add .
git commit -m "Initial commit - Gerador de Cenas Ettore Decor"

# Cria repositorio no GitHub
echo "🌐 Criando repositorio no GitHub..."
gh repo create ettore-scene-generator --public --source=. --remote=origin --push

echo ""
echo "✅ Repositorio criado e codigo enviado!"
echo ""
echo "📍 Proximo passo: Deploy no Render"
echo ""
echo "Acesse: https://dashboard.render.com/create?type=web"
echo ""
echo "Configure:"
echo "  - Repository: ettore-scene-generator"
echo "  - Build Command: npm install"
echo "  - Start Command: npm start"
echo "  - Environment: Node"
echo ""
echo "Ou use este link direto (depois de conectar o repo):"
gh repo view --web

echo ""
echo "🎉 Pronto! Quando o Render terminar o deploy, voce tera a URL do app."
