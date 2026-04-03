// State
let selectedFile = null;
let currentQuickPack = null;

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    updateGreeting();
    loadLibrary();
    loadSettings();
    setupDragDrop();
    updateEstimate();
    setupFileInput();
});

// Greeting
function updateGreeting() {
    const hour = new Date().getHours();
    const greetingEl = document.getElementById('greetingText');
    
    if (!greetingEl) return;
    
    if (hour >= 5 && hour < 12) {
        greetingEl.textContent = 'Good morning, Guido';
    } else if (hour >= 12 && hour < 18) {
        greetingEl.textContent = 'Good afternoon, Guido';
    } else {
        greetingEl.textContent = 'Good evening, Guido';
    }
}

// Settings
function loadSettings() {
    const apiKey = localStorage.getItem('falai_api_key');
    if (apiKey) {
        document.getElementById('apiKeyInput').value = apiKey;
    }
}

function openSettings() {
    document.getElementById('settingsModal').classList.add('active');
}

function closeSettings() {
    document.getElementById('settingsModal').classList.remove('active');
}

function saveSettings() {
    const apiKey = document.getElementById('apiKeyInput').value.trim();
    if (!apiKey) {
        showToast('Please enter an API key', 'error');
        return;
    }
    localStorage.setItem('falai_api_key', apiKey);
    showToast('Settings saved successfully', 'success');
    closeSettings();
}

// Toast
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = 'toast ' + type + ' active';
    
    setTimeout(() => {
        toast.classList.remove('active');
    }, 3000);
}

// File Upload
function setupDragDrop() {
    const uploadZone = document.getElementById('uploadZone');
    
    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.classList.add('dragover');
    });
    
    uploadZone.addEventListener('dragleave', () => {
        uploadZone.classList.remove('dragover');
    });
    
    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFile(files[0]);
        }
    });
}

function setupFileInput() {
    document.getElementById('imageInput').addEventListener('change', function(e) {
        if (e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
    });
}

function handleFile(file) {
    // Validate type
    if (!file.type.match('image/jpeg') && !file.type.match('image/png')) {
        showToast('Please upload JPG or PNG only', 'error');
        return;
    }
    
    // Validate size (10MB)
    if (file.size > 10 * 1024 * 1024) {
        showToast('File must be less than 10MB', 'error');
        return;
    }
    
    selectedFile = file;
    
    // Preview
    const reader = new FileReader();
    reader.onload = (e) => {
        document.getElementById('imagePreview').src = e.target.result;
        document.getElementById('previewSection').classList.add('active');
        document.getElementById('uploadZone').style.display = 'none';
    };
    reader.readAsDataURL(file);
}

function removeImage() {
    selectedFile = null;
    document.getElementById('previewSection').classList.remove('active');
    document.getElementById('uploadZone').style.display = 'block';
    document.getElementById('imageInput').value = '';
}

// Accordion
function toggleAccordion(index) {
    const content = document.getElementById('content' + index);
    content.classList.toggle('active');
}

function updateSummary(index) {
    const summaries = [
        () => {
            const ambiente = document.getElementById('ambiente').selectedOptions[0].text;
            const iluminacao = document.getElementById('iluminacao').selectedOptions[0].text.split('(')[0].trim();
            return `${ambiente} · ${iluminacao}`;
        },
        () => {
            const estilo = document.getElementById('estilo').selectedOptions[0].text;
            const formato = document.getElementById('formato').value;
            return `${estilo} · ${formato}`;
        },
        () => {
            const variacoes = document.getElementById('variacoes').value;
            return `${variacoes} ${variacoes === '1' ? 'image' : 'angles'}`;
        }
    ];
    
    document.getElementById('summary' + index).textContent = summaries[index]();
}

// Quick Packs
function selectQuickPack(pack) {
    currentQuickPack = pack;
    
    const configs = {
        feed: {
            variacoes: '3',
            formato: '4:5'
        },
        stories: {
            variacoes: '3',
            formato: '9:16'
        },
        complete: {
            variacoes: '5',
            formato: '1:1'
        }
    };
    
    const config = configs[pack];
    document.getElementById('variacoes').value = config.variacoes;
    document.getElementById('formato').value = config.formato;
    
    updateSummary(1);
    updateSummary(2);
    updateEstimate();
    
    const packNames = {
        feed: 'Feed Pack',
        stories: 'Stories Pack',
        complete: 'Complete Pack'
    };
    
    showToast(`${packNames[pack]} selected`, 'success');
}

// Estimate
function updateEstimate() {
    const variacoes = parseInt(document.getElementById('variacoes').value);
    const pricePerImage = 0.20;
    const total = (variacoes * pricePerImage).toFixed(2);
    document.getElementById('estimatePrice').textContent = `R$ ${total}`;
}

// Preview
function showPreview() {
    if (!selectedFile) {
        showToast('Please upload a lamp photo first', 'error');
        return;
    }
    
    const name = document.getElementById('luminariaName').value.trim();
    if (!name) {
        showToast('Please enter a lamp name', 'error');
        document.getElementById('luminariaName').classList.add('error');
        return;
    }
    
    showToast('Preview feature coming soon', 'success');
}

// Generate
async function generateScenes() {
    // Validate
    const apiKey = localStorage.getItem('falai_api_key');
    if (!apiKey) {
        showToast('Please set your API key in Settings', 'error');
        openSettings();
        return;
    }
    
    if (!selectedFile) {
        showToast('Please upload a lamp photo', 'error');
        return;
    }
    
    const luminariaName = document.getElementById('luminariaName').value.trim();
    if (!luminariaName) {
        showToast('Please enter a lamp name', 'error');
        document.getElementById('luminariaName').classList.add('error');
        return;
    }
    
    // Show loading
    document.getElementById('loadingSection').classList.add('active');
    document.getElementById('generateBtn').disabled = true;
    
    // Prepare form data
    const formData = new FormData();
    formData.append('image', selectedFile);
    formData.append('luminariaName', luminariaName);
    formData.append('ambiente', document.getElementById('ambiente').value);
    formData.append('iluminacao', document.getElementById('iluminacao').value);
    formData.append('foco', document.getElementById('foco') ? document.getElementById('foco').value : 'Produto em destaque');
    formData.append('estilo', document.getElementById('estilo').value);
    formData.append('formato', document.getElementById('formato').value);
    formData.append('cena', document.getElementById('cena').value);
    formData.append('variacoes', document.getElementById('variacoes').value);
    formData.append('apiKey', apiKey);
    
    try {
        const response = await fetch('/api/generate', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Generation failed');
        }
        
        // Hide loading
        document.getElementById('loadingSection').classList.remove('active');
        document.getElementById('generateBtn').disabled = false;
        
        // Show results
        displayResults(data);
        showToast('Images generated successfully!', 'success');
        
        // Reload library
        loadLibrary();
        
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('loadingSection').classList.remove('active');
        document.getElementById('generateBtn').disabled = false;
        showToast(error.message || 'Generation failed', 'error');
    }
}

// Display Results
function displayResults(data) {
    const resultsSection = document.getElementById('resultsSection');
    resultsSection.innerHTML = '';
    resultsSection.classList.add('active');
    
    data.images.forEach((img, index) => {
        const item = document.createElement('div');
        item.className = 'result-item';
        item.innerHTML = `
            <h3 style="color: white; margin-bottom: 12px; font-size: 16px; font-weight: 600;">Image ${index + 1} of ${data.images.length}</h3>
            <img src="${img.url}" class="result-image" alt="Generated image ${index + 1}">
            <div class="result-actions">
                <a href="${img.url}" download class="btn btn-secondary" style="flex: 1; text-align: center; text-decoration: none; display: block;">Download</a>
                <button class="btn btn-secondary" onclick="editInCanva('${img.url}')" style="flex: 1;">Edit in Canva</button>
            </div>
        `;
        resultsSection.appendChild(item);
    });
    
    // Scroll to results
    resultsSection.scrollIntoView({ behavior: 'smooth' });
}

// Edit in Canva
function editInCanva(imageUrl) {
    const canvaUrl = `https://www.canva.com/design?create&type=Instagram&image=${encodeURIComponent(imageUrl)}`;
    window.open(canvaUrl, '_blank');
}

// Library
async function loadLibrary() {
    try {
        const response = await fetch('/api/library');
        const data = await response.json();
        
        const libraryItems = document.getElementById('libraryItems');
        const libraryCount = document.getElementById('libraryCount');
        
        libraryCount.textContent = data.length;
        
        if (data.length === 0) {
            libraryItems.innerHTML = '<p style="color: rgba(255,255,255,0.4); font-size: 12px; text-align: center; padding: 20px 0;">No lamps yet</p>';
            return;
        }
        
        const colors = ['#276F50', '#EE5F38', '#4A90E2', '#9B59B6', '#E74C3C', '#F39C12'];
        
        libraryItems.innerHTML = data.map((item, index) => {
            const color = colors[index % colors.length];
            
            return `
                <div class="library-item" onclick="selectLibraryItem('${item.slug}')">
                    <div class="library-item-inner">
                        <div class="library-thumbnail" style="background: linear-gradient(135deg, ${color} 0%, ${color}CC 100%);"></div>
                        <div class="library-info">
                            <div class="library-name">${item.name}</div>
                            <div class="library-meta">${item.totalImages} images</div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Error loading library:', error);
    }
}

function selectLibraryItem(slug) {
    showToast('Library viewer coming soon', 'success');
}

// Remove error on input
document.addEventListener('DOMContentLoaded', function() {
    const nameInput = document.getElementById('luminariaName');
    if (nameInput) {
        nameInput.addEventListener('input', function() {
            this.classList.remove('error');
        });
    }
});
