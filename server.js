const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fal = require('@fal-ai/serverless-client');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static('public'));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

const uploadsDir = path.join(__dirname, 'uploads');
const outputsDir = path.join(__dirname, 'outputs');

async function ensureDirectories() {
  await fs.mkdir(uploadsDir, { recursive: true });
  await fs.mkdir(outputsDir, { recursive: true });
}

ensureDirectories();

app.post('/api/generate', upload.single('image'), async (req, res) => {
  try {
    const { 
      ambiente, 
      iluminacao, 
      foco, 
      estilo, 
      cena, 
      variacoes,
      apiKey 
    } = req.body;

    if (!apiKey) {
      return res.status(400).json({ error: 'API key do fal.ai é necessária' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Imagem da luminária é necessária' });
    }

    fal.config({ credentials: apiKey });

    const imageBase64 = req.file.buffer.toString('base64');
    const imageDataUrl = `data:${req.file.mimetype};base64,${imageBase64}`;

    const numVariacoes = parseInt(variacoes) || 1;
    
    const estadoLuminaria = ['Noite', 'Luz ambiente suave'].includes(iluminacao) ? 'acesa' : 'apagada';

    const promptAngulos = {
      1: 'frontal view, eye-level perspective',
      3: ['frontal view, eye-level', 'slight side angle, 45 degrees', 'overhead view, birds eye perspective'],
      5: ['frontal view, eye-level', 'side angle 45 degrees right', 'side angle 45 degrees left', 'slightly low angle looking up', 'overhead birds eye view']
    };

    const angulosArray = numVariacoes === 1 
      ? [promptAngulos[1]] 
      : promptAngulos[numVariacoes];

    const results = [];

    for (let i = 0; i < numVariacoes; i++) {
      const anguloPrompt = Array.isArray(angulosArray) ? angulosArray[i] : angulosArray;
      
      const basePrompt = `Professional product photography of a decorative lamp in a ${ambiente.toLowerCase()} setting. 
${estilo} interior design style. 
${iluminacao === 'Dia' ? 'Bright natural daylight streaming through windows' : ''}
${iluminacao === 'Noite' ? 'Evening scene with warm ambient lighting' : ''}
${iluminacao === 'Crepusculo/golden hour' ? 'Golden hour light, warm sunset glow' : ''}
${iluminacao === 'Luz ambiente suave' ? 'Soft diffused ambient lighting' : ''}
${estadoLuminaria === 'acesa' ? 'Lamp is turned ON, glowing warmly' : 'Lamp is turned OFF'}.
${cena && cena.trim() !== '' ? cena : 'Clean, minimalist composition'}.
${anguloPrompt}.
${foco === 'Produto em destaque' ? 'Sharp focus on lamp, background slightly blurred, f/2.8' : ''}
${foco === 'Integrado ao ambiente' ? 'Everything in focus, f/8, balanced composition' : ''}
${foco === 'Plano de fundo' ? 'Lamp in background, foreground elements in focus' : ''}
High-end interior photography, professional lighting, cinematic quality, 8K resolution, photorealistic.`;

      console.log(`Gerando variação ${i + 1}/${numVariacoes}...`);
      console.log('Prompt:', basePrompt);

      const result = await fal.subscribe('fal-ai/flux-pro/v1.1-ultra', {
        input: {
          prompt: basePrompt,
          image_url: imageDataUrl,
          num_inference_steps: 28,
          guidance_scale: 3.5,
          num_images: 1,
          enable_safety_checker: false,
          output_format: 'jpeg',
          aspect_ratio: '4:5'
        },
        logs: true,
        onQueueUpdate: (update) => {
          if (update.status === 'IN_PROGRESS') {
            console.log('Progresso:', update.logs);
          }
        }
      });

      if (result.images && result.images.length > 0) {
        results.push({
          url: result.images[0].url,
          angulo: anguloPrompt,
          index: i + 1
        });
      }
    }

    res.json({ 
      success: true, 
      images: results,
      parametros: {
        ambiente,
        iluminacao,
        foco,
        estilo,
        estadoLuminaria,
        cena,
        variacoes: numVariacoes
      }
    });

  } catch (error) {
    console.error('Erro na geração:', error);
    res.status(500).json({ 
      error: 'Erro ao gerar imagens', 
      details: error.message 
    });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
