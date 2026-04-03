const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const fal = require('@fal-ai/serverless-client');

const app = express();
const PORT = process.env.PORT || 3000;

// Multer config
const upload = multer({
    dest: 'uploads/',
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
            cb(null, true);
        } else {
            cb(new Error('Only JPG and PNG files allowed'));
        }
    }
});

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Ensure outputs directory exists
async function ensureDirectories() {
    try {
        await fs.mkdir('outputs/luminarias', { recursive: true });
        await fs.mkdir('uploads', { recursive: true });
    } catch (error) {
        console.error('Error creating directories:', error);
    }
}

ensureDirectories();

// Helper: Slugify
function slugify(text) {
    return text
        .toString()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

// Helper: Get aspect ratio
function getAspectRatio(formato) {
    const ratios = {
        '1:1': '1:1',
        '4:5': '4:5',
        '9:16': '9:16',
        '16:9': '16:9',
        '2:3': '2:3',
        '3:2': '3:2'
    };
    return ratios[formato] || '4:5';
}

// API: Generate
app.post('/api/generate', upload.single('image'), async (req, res) => {
    try {
        const { luminariaName, ambiente, iluminacao, foco, estilo, formato, cena, variacoes, apiKey } = req.body;
        
        if (!req.file) {
            return res.status(400).json({ error: 'No image uploaded' });
        }
        
        if (!apiKey) {
            return res.status(400).json({ error: 'API key required' });
        }
        
        // Configure fal.ai
        fal.config({ credentials: apiKey });
        
        // Upload image to fal.ai
        const imageBuffer = await fs.readFile(req.file.path);
        const imageUrl = await fal.storage.upload(imageBuffer);
        
        // Create slug
        const slug = slugify(luminariaName);
        const timestamp = Date.now();
        
        // Create output directory
        const outputDir = path.join('outputs', 'luminarias', slug);
        await fs.mkdir(outputDir, { recursive: true });
        
        // Build prompt
        const basePrompt = `
Professional product photography of this EXACT lamp design in a ${estilo} ${ambiente}.
${iluminacao}.
${foco}.
${cena ? `Scene: ${cena}.` : ''}

CRITICAL INSTRUCTIONS (MUST FOLLOW):
1. IMPORTANT: Use the EXACT lamp design from the reference image - same shape, same materials, same proportions
2. IMPORTANT: The lamp must be IDENTICAL to the reference - do not change its design
3. IMPORTANT: Keep the lamp's original form - only change the environment around it

Environment style: ${estilo}, well-decorated, high-end interior design.
Lighting: ${iluminacao}, photorealistic lighting, professional photography.
Composition: ${foco}, professional framing, depth of field.

Technical specs: High resolution, sharp focus, professional color grading, architectural photography quality.
        `.trim();
        
        // Generate variations
        const numVariations = parseInt(variacoes);
        const results = [];
        
        for (let i = 0; i < numVariations; i++) {
            console.log(`Generating variation ${i + 1}/${numVariations}...`);
            
            const result = await fal.subscribe('fal-ai/flux-pro/v1.1', {
                input: {
                    prompt: basePrompt,
                    image_url: imageUrl,
                    strength: 0.75,
                    num_inference_steps: 28,
                    guidance_scale: 5.5,
                    num_images: 1,
                    enable_safety_checker: false,
                    output_format: 'jpeg',
                    aspect_ratio: getAspectRatio(formato),
                    seed: Math.floor(Math.random() * 1000000)
                },
                logs: true,
                onQueueUpdate: (update) => {
                    if (update.status === 'IN_PROGRESS') {
                        console.log(`Progress: ${i + 1}/${numVariations}`);
                    }
                }
            });
            
            if (result.data && result.data.images && result.data.images.length > 0) {
                const generatedImageUrl = result.data.images[0].url;
                
                // Download image
                const imageResponse = await fetch(generatedImageUrl);
                const imageArrayBuffer = await imageResponse.arrayBuffer();
                const imageBufferDownload = Buffer.from(imageArrayBuffer);
                
                // Save image
                const filename = `${slug}-${timestamp}-${i + 1}.jpg`;
                const filepath = path.join(outputDir, filename);
                await fs.writeFile(filepath, imageBufferDownload);
                
                results.push({
                    url: `/outputs/luminarias/${slug}/${filename}`,
                    filename: filename
                });
            }
        }
        
        // Save metadata
        const metadata = {
            name: luminariaName,
            slug: slug,
            timestamp: timestamp,
            parameters: {
                ambiente,
                iluminacao,
                foco,
                estilo,
                formato,
                cena,
                variacoes: numVariations
            },
            images: results
        };
        
        const metadataPath = path.join(outputDir, 'metadata.json');
        let allMetadata = [];
        
        try {
            const existingData = await fs.readFile(metadataPath, 'utf-8');
            allMetadata = JSON.parse(existingData);
        } catch (error) {
            // File doesn't exist yet
        }
        
        allMetadata.push(metadata);
        await fs.writeFile(metadataPath, JSON.stringify(allMetadata, null, 2));
        
        // Clean up uploaded file
        await fs.unlink(req.file.path);
        
        res.json({
            success: true,
            slug: slug,
            images: results
        });
        
    } catch (error) {
        console.error('Generation error:', error);
        
        // Clean up uploaded file on error
        if (req.file) {
            try {
                await fs.unlink(req.file.path);
            } catch (unlinkError) {
                console.error('Error deleting uploaded file:', unlinkError);
            }
        }
        
        res.status(500).json({ 
            error: error.message || 'Generation failed',
            details: error.toString()
        });
    }
});

// API: Library
app.get('/api/library', async (req, res) => {
    try {
        const luminariasDir = path.join('outputs', 'luminarias');
        
        // Check if directory exists
        try {
            await fs.access(luminariasDir);
        } catch {
            return res.json([]);
        }
        
        const folders = await fs.readdir(luminariasDir);
        const library = [];
        
        for (const folder of folders) {
            const metadataPath = path.join(luminariasDir, folder, 'metadata.json');
            
            try {
                const data = await fs.readFile(metadataPath, 'utf-8');
                const metadata = JSON.parse(data);
                
                // Get all images count
                const totalImages = metadata.reduce((sum, item) => sum + item.images.length, 0);
                
                // Get latest generation
                const latest = metadata[metadata.length - 1];
                
                library.push({
                    slug: folder,
                    name: latest.name,
                    totalImages: totalImages,
                    lastGeneration: latest.timestamp,
                    thumbnail: latest.images[0]?.url || null
                });
            } catch (error) {
                console.error(`Error reading metadata for ${folder}:`, error);
            }
        }
        
        // Sort by most recent
        library.sort((a, b) => b.lastGeneration - a.lastGeneration);
        
        res.json(library);
        
    } catch (error) {
        console.error('Library error:', error);
        res.status(500).json({ error: 'Failed to load library' });
    }
});

// API: Get lamp details
app.get('/api/lamp/:slug', async (req, res) => {
    try {
        const { slug } = req.params;
        const metadataPath = path.join('outputs', 'luminarias', slug, 'metadata.json');
        
        const data = await fs.readFile(metadataPath, 'utf-8');
        const metadata = JSON.parse(data);
        
        res.json(metadata);
        
    } catch (error) {
        console.error('Lamp details error:', error);
        res.status(404).json({ error: 'Lamp not found' });
    }
});

// Serve static files from outputs
app.use('/outputs', express.static('outputs'));

// Start server
app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════╗
║   Ettore Scene Generator - Server     ║
╚════════════════════════════════════════╝

✓ Server running on port ${PORT}
✓ Open http://localhost:${PORT}

Ready to generate scenes! 🚀
    `);
});
