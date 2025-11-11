// scaneo.js - Escáner QR Universal MEJORADO Y CORREGIDO
document.addEventListener('DOMContentLoaded', function() {
    console.log("Iniciando escáner QR universal...");
    
    // Elementos DOM
    const video = document.getElementById('qr-video');
    const cameraStatus = document.getElementById('camera-status');
    const qrResult = document.getElementById('qr-result');
    const activateBtn = document.getElementById('btn-activate-camera');
    const switchBtn = document.getElementById('btn-switch-camera');
    const fileInput = document.getElementById('file-input');
    
    let stream = null;
    let scanning = false;
    let cameras = [];
    let currentCamera = 0;
    let scanHistory = JSON.parse(localStorage.getItem('qrScanHistory')) || [];
    
    // Configurar eventos
    activateBtn.addEventListener('click', activateCamera);
    switchBtn.addEventListener('click', switchCamera);
    fileInput.addEventListener('change', handleFileUpload);
    
    // =============================== CÁMARA ===============================
    async function activateCamera() {
        console.log("Activando cámara...");
        
        activateBtn.textContent = "Solicitando permiso...";
        activateBtn.disabled = true;
        cameraStatus.innerHTML = '<p>Solicitando acceso a la cámara...</p>';
        
        try {
            // Obtener lista de cámaras
            const devices = await navigator.mediaDevices.enumerateDevices();
            cameras = devices.filter(device => device.kind === 'videoinput');
            
            if (cameras.length === 0) {
                throw new Error('No se encontraron cámaras disponibles');
            }
            
            // Configurar cámara
            const constraints = {
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: currentCamera === 0 ? { ideal: "environment" } : { ideal: "user" }
                }
            };
            
            stream = await navigator.mediaDevices.getUserMedia(constraints);
            
            console.log("Permiso de cámara concedido");
            cameraStatus.innerHTML = '<p style="color: #27ae60;">Cámara activada - Enfoca cualquier código QR</p>';
            
            // Configurar video
            video.srcObject = stream;
            video.play();
            
            // Actualizar interfaz
            activateBtn.textContent = "🎥 Cámara Activada";
            activateBtn.disabled = true;
            switchBtn.disabled = cameras.length <= 1;
            
            // Iniciar escáner QR
            startQRScanner();
            
        } catch (err) {
            console.error("Error al acceder a la cámara:", err);
            handleCameraError(err);
        }
    }
    
    function handleCameraError(err) {
        activateBtn.textContent = "🎥 Activar Cámara";
        activateBtn.disabled = false;
        
        let errorMsg = "No se pudo acceder a la cámara.";
        if (err.name === 'NotAllowedError') {
            errorMsg += " Por favor, permite el acceso a la cámara en tu navegador.";
        } else if (err.name === 'NotFoundError') {
            errorMsg += " No se encontró ninguna cámara disponible.";
        } else {
            errorMsg += " Error: " + err.message;
        }
        
        cameraStatus.innerHTML = `<p style="color: #e74c3c;">${errorMsg}</p>`;
    }
    
    function switchCamera() {
        if (cameras.length <= 1) return;
        
        currentCamera = (currentCamera + 1) % cameras.length;
        restartCamera();
    }
    
    function restartCamera() {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
        activateCamera();
    }
    
    // =============================== ESCÁNER QR MEJORADO ===============================
    function startQRScanner() {
        scanning = true;
        scanQRCode();
    }
    
    function scanQRCode() {
        if (!scanning || !stream) return;
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height);
            
            if (code && code.data && code.data.trim().length > 0) {
                console.log("QR detectado:", code.data);
                processQRCode(code.data);
                return;
            }
        }
        
        requestAnimationFrame(scanQRCode);
    }
    
    function processQRCode(qrData) {
        scanning = false;
        
        // Detener cámara
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
        
        // Mostrar resultado
        cameraStatus.innerHTML = '<p style="color: #27ae60;">✅ QR detectado correctamente</p>';
        
        // Procesar cualquier tipo de QR
        processAnyQR(qrData);
    }
    
    function processAnyQR(qrData) {
        console.log("Procesando QR:", qrData);
        
        cameraStatus.innerHTML = '<p style="color: #3498db;">Analizando contenido del QR...</p>';
        
        // Analizar el tipo de QR y extraer información
        const qrInfo = analyzeQRContent(qrData);
        
        // Guardar en historial
        addToHistory(qrInfo);
        
        // Mostrar resultados
        displayQRResult(qrInfo);
    }
    
    // ANÁLISIS MEJORADO DE CONTENIDO QR
    function analyzeQRContent(qrData) {
        const info = {
            type: 'DESCONOCIDO',
            title: 'Código QR Escaneado',
            content: qrData,
            displayContent: qrData,
            icon: '🔍',
            rawData: qrData
        };

        // Detectar WhatsApp
        if (qrData.startsWith('https://wa.me/') || qrData.startsWith('https://api.whatsapp.com/')) {
            info.type = 'WHATSAPP';
            info.title = 'Enlace de WhatsApp';
            info.icon = '💬';
        }
        // Detectar Instagram
        else if (qrData.includes('instagram.com/') || qrData.startsWith('instagram://')) {
            info.type = 'INSTAGRAM';
            info.title = 'Perfil de Instagram';
            info.icon = '📷';
        }
        // Detectar URLs generales
        else if (qrData.startsWith('http://') || qrData.startsWith('https://')) {
            info.type = 'URL';
            info.title = 'Enlace Web';
            info.icon = '🌐';
        }
        // Detectar teléfonos
        else if (qrData.startsWith('tel:')) {
            info.type = 'TELÉFONO';
            info.title = 'Número de Teléfono';
            info.icon = '📞';
            info.displayContent = qrData.replace('tel:', '');
        }
        // Detectar emails
        else if (qrData.startsWith('mailto:')) {
            info.type = 'EMAIL';
            info.title = 'Dirección de Email';
            info.icon = '📧';
            info.displayContent = qrData.replace('mailto:', '');
        }
        // Detectar WiFi
        else if (qrData.startsWith('WIFI:')) {
            info.type = 'WIFI';
            info.title = 'Configuración WiFi';
            info.icon = '📶';
            const wifiInfo = parseWifiConfig(qrData);
            info.displayContent = wifiInfo;
        }
        // Detectar contactos vCard
        else if (qrData.startsWith('BEGIN:VCARD')) {
            info.type = 'CONTACTO';
            info.title = 'Tarjeta de Contacto';
            info.icon = '👤';
            info.displayContent = parseVCard(qrData);
        }
        // Detectar carnets UTB (CORREGIDO)
        else if (qrData.includes('key=') && (qrData.includes('utb.edu.ec') || qrData.includes('sai_utb.edu.ec'))) {
            info.type = 'CARNET_UTB';
            info.title = 'Carnet Estudiantil UTB';
            info.icon = '🎓';
            // Asegurar que la URL esté completa
            if (!qrData.startsWith('http')) {
                info.displayContent = 'https://' + qrData;
            }
        }
        // Detectar textos simples
        else if (qrData.match(/^[A-Za-z0-9\s\-\_\.\@]+$/)) {
            info.type = 'TEXTO';
            info.title = 'Texto Simple';
            info.icon = '📄';
        }
        
        return info;
    }
    
    // Función para parsear configuración WiFi
    function parseWifiConfig(wifiString) {
        const config = {};
        const params = wifiString.replace('WIFI:', '').split(';');
        
        params.forEach(param => {
            const [key, value] = param.split(':');
            if (key && value) {
                config[key.toLowerCase()] = value;
            }
        });
        
        let result = '';
        if (config.s) result += `Red: ${config.s}\n`;
        if (config.t) result += `Tipo: ${config.t}\n`;
        if (config.p) result += `Contraseña: ${'•'.repeat(config.p.length)}\n`;
        if (config.h) result += `Red oculta: ${config.h === 'true' ? 'Sí' : 'No'}\n`;
        
        return result || wifiString;
    }
    
    // Función para parsear vCard
    function parseVCard(vcardString) {
        const lines = vcardString.split('\n');
        let name = '', org = '', tel = '', email = '';
        
        lines.forEach(line => {
            if (line.startsWith('FN:')) name = line.replace('FN:', '');
            if (line.startsWith('ORG:')) org = line.replace('ORG:', '');
            if (line.startsWith('TEL:')) tel = line.replace('TEL:', '');
            if (line.startsWith('EMAIL:')) email = line.replace('EMAIL:', '');
        });
        
        let result = '';
        if (name) result += `Nombre: ${name}\n`;
        if (org) result += `Organización: ${org}\n`;
        if (tel) result += `Teléfono: ${tel}\n`;
        if (email) result += `Email: ${email}\n`;
        
        return result || 'Información de contacto (vCard)';
    }
    
    // MOSTRAR RESULTADO - VERSIÓN CORREGIDA
    function displayQRResult(qrInfo) {
        // Determinar qué botones mostrar según el tipo
        let actionButtons = `
            <button onclick="copyToClipboard('${escapeString(qrInfo.rawData)}')" class="btn-copy">
                📋 Copiar Texto
            </button>
        `;

        // Agregar botones específicos según el tipo
        if (qrInfo.type === 'WHATSAPP' || qrInfo.type === 'INSTAGRAM' || qrInfo.type === 'URL') {
            actionButtons += `
                <button onclick="window.open('${escapeString(qrInfo.rawData)}', '_blank')" class="btn-open">
                    ${qrInfo.type === 'WHATSAPP' ? '💬' : qrInfo.type === 'INSTAGRAM' ? '📷' : '🌐'} 
                    ${qrInfo.type === 'WHATSAPP' ? 'Abrir WhatsApp' : qrInfo.type === 'INSTAGRAM' ? 'Abrir Instagram' : 'Abrir Enlace'}
                </button>
            `;
        } 
        // BOTÓN CORREGIDO PARA CARNET UTB
        else if (qrInfo.type === 'CARNET_UTB') {
            let urlToOpen = qrInfo.rawData;
            // Si la URL no empieza con http, agregar https://
            if (!urlToOpen.startsWith('http')) {
                urlToOpen = 'https://' + urlToOpen;
            }
            actionButtons += `
                <button onclick="window.open('${escapeString(urlToOpen)}', '_blank')" class="btn-open">
                    🎓 Ver Carnet UTB
                </button>
            `;
        }
        else if (qrInfo.type === 'TELÉFONO') {
            actionButtons += `
                <button onclick="window.open('tel:${escapeString(qrInfo.displayContent)}', '_self')" class="btn-call">
                    📞 Llamar
                </button>
            `;
        } else if (qrInfo.type === 'EMAIL') {
            actionButtons += `
                <button onclick="window.open('mailto:${escapeString(qrInfo.displayContent)}', '_self')" class="btn-email">
                    📧 Enviar Email
                </button>
            `;
        }

        qrResult.innerHTML = `
            <div class="simple-qr-result">
                <div class="qr-header">
                    ${qrInfo.icon} ${qrInfo.title}
                </div>
                
                <div class="qr-content-box">
                    <div class="qr-type">
                        Tipo: <span class="qr-type-badge">${qrInfo.type}</span>
                    </div>
                    
                    <div class="qr-data-content">
                        <textarea readonly class="qr-textarea" id="qr-content-text">${qrInfo.displayContent}</textarea>
                    </div>
                    
                    <div class="qr-actions-simple">
                        ${actionButtons}
                    </div>
                </div>
                
                <div class="scan-info">
                    <strong>Escaneado el:</strong> ${new Date().toLocaleString('es-ES')}
                </div>
                
                <div class="action-buttons">
                    <button onclick="resetScanner()" class="btn-scan-again">
                        🔄 Escanear otro QR
                    </button>
                </div>
            </div>
        `;
        
        qrResult.style.display = 'block';
        cameraStatus.innerHTML = `<p style="color: #27ae60;">✅ QR detectado - ${qrInfo.type}</p>`;
        
        // Desplazar suavemente a los resultados
        qrResult.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // Función auxiliar para escapar strings
    function escapeString(str) {
        return str.replace(/'/g, "\\'").replace(/"/g, '&quot;');
    }
    
    // =============================== HISTORIAL ===============================
    function addToHistory(qrInfo) {
        const historyItem = {
            id: Date.now(),
            type: qrInfo.type,
            data: qrInfo.rawData,
            displayData: qrInfo.displayContent.substring(0, 100) + (qrInfo.displayContent.length > 100 ? '...' : ''),
            timestamp: new Date().toISOString()
        };
        
        scanHistory.unshift(historyItem);
        
        // Mantener solo los últimos 10 escaneos
        if (scanHistory.length > 10) {
            scanHistory = scanHistory.slice(0, 10);
        }
        
        localStorage.setItem('qrScanHistory', JSON.stringify(scanHistory));
    }
    
    // =============================== SUBIR ARCHIVO ===============================
    function handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        // Validar tipo de archivo
        if (!file.type.startsWith('image/')) {
            cameraStatus.innerHTML = '<p style="color: #e74c3c;">Por favor, selecciona una imagen válida</p>';
            return;
        }
        
        cameraStatus.innerHTML = '<p style="color: #3498db;">Procesando imagen...</p>';
        
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.width = img.width;
                canvas.height = img.height;
                context.drawImage(img, 0, 0);
                
                const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
                const code = jsQR(imageData.data, imageData.width, canvas.height);
                
                if (code) {
                    processQRCode(code.data);
                } else {
                    cameraStatus.innerHTML = '<p style="color: #e74c3c;">No se pudo detectar un código QR en la imagen</p>';
                    // Limpiar input
                    fileInput.value = '';
                }
            };
            img.onerror = function() {
                cameraStatus.innerHTML = '<p style="color: #e74c3c;">Error al cargar la imagen</p>';
                fileInput.value = '';
            };
            img.src = e.target.result;
        };
        reader.onerror = function() {
            cameraStatus.innerHTML = '<p style="color: #e74c3c;">Error al leer el archivo</p>';
            fileInput.value = '';
        };
        reader.readAsDataURL(file);
    }
    
    // Limpiar al cerrar
    window.addEventListener('beforeunload', () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
    });
});

// FUNCIONES GLOBALES MEJORADAS
function copyToClipboard(text) {
    // Limpiar texto para copiar (eliminar caracteres especiales)
    const cleanText = text.replace(/[^\x20-\x7E\n\r]/g, '');
    
    navigator.clipboard.writeText(cleanText).then(function() {
        showNotification('✅ Texto copiado al portapapeles');
    }).catch(function(err) {
        console.error('Error al copiar: ', err);
        // Fallback para navegadores antiguos
        const textArea = document.createElement('textarea');
        textArea.value = cleanText;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showNotification('✅ Texto copiado al portapapeles');
    });
}

function resetScanner() {
    location.reload();
}

function showNotification(message) {
    // Crear notificación temporal
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #27ae60;
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10000;
        font-weight: bold;
        animation: slideIn 0.3s ease;
    `;
    
    // Estilos para la animación
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Remover después de 3 segundos
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}