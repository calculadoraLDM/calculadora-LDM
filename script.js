// --- Módulos de Configuración Global ---
const TRUCK_WIDTH = 1360; 
const TRUCK_HEIGHT = 244; 
const COLORS = ['#4a90e2', '#2ecc71', '#f39c12', '#9b59b6', '#e74c3c', '#1abc9c', '#3498db', '#f1c40f', '#95a5a6', '#d35400']; 

// --- Módulos de Estado de Aplicación ---
let pallets = [];       
let nextPalletId = 0;   
let nextGroupId = 1;    
let colorIndex = 0;     
let currentPallet = null; // Para la gestión de arrastre (DND)

// --- Exposición de Funciones Globales ---
window.addPallets = addPallets;
window.clearPallets = clearPallets;
window.removeGroupByGroupid = removeGroupByGroupid;
window.toggleRotation = toggleRotation; // Hacemos la rotación accesible

// --- Funciones de Utilidad de Datos ---

function getNextColor() {
    const color = COLORS[colorIndex % COLORS.length];
    return color;
}

function validateInput(value) {
    const num = parseInt(value);
    return !isNaN(num) && num > 0;
}

// --- Lógica de Gestión de Carga (CRUD) ---

function clearPallets() {
    pallets = [];
    nextPalletId = 0;
    nextGroupId = 1; 
    colorIndex = 0; 
    renderTruck();
}

function removeGroupByGroupid(groupIdToRemove) {
    pallets = pallets.filter(p => p.groupId !== groupIdToRemove);
    renderTruck();
}

function addPallets() {
    const palletWidth = parseInt(document.getElementById('pallet-width').value);
    const palletLength = parseInt(document.getElementById('pallet-length').value);
    const palletQuantity = parseInt(document.getElementById('pallet-quantity').value);

    if (!validateInput(palletWidth) || !validateInput(palletLength) || !validateInput(palletQuantity)) {
        alert('ERROR: Todos los campos deben ser números positivos.');
        return;
    }

    if (palletWidth > TRUCK_HEIGHT || palletLength > TRUCK_WIDTH) {
         alert(`ERROR: El palet (${palletWidth}x${palletLength}) no cabe. Máximo ${TRUCK_WIDTH}x${TRUCK_HEIGHT}.`);
         return;
    }

    const color = getNextColor(); 
    const groupId = nextGroupId++; 
    colorIndex++;

    for (let i = 0; i < palletQuantity; i++) {
        pallets.push({
            id: nextPalletId++,
            groupId: groupId,
            width: palletWidth,
            length: palletLength,
            color: color,
            x: 0, 
            y: 0,
            placed: false,
            rotated: false // Valor inicial de rotación
        });
    }

    renderTruck();
}

// --- Algoritmos de Colocación (Packing Logic) ---

/**
 * CRÍTICO: Verifica la disponibilidad del espacio y los límites.
 */
function isPositionAvailable(x, y, pW, pL, currentPallet) {
    // 1. Verificación CRÍTICA de límites
    if (x < 0 || y < 0 || x + pL > TRUCK_WIDTH || y + pW > TRUCK_HEIGHT) {
        return false;
    }

    // 2. Verificación de solapamiento
    return !pallets.some(other => {
        if (!other.placed || other.id === currentPallet.id) return false;
        
        const otherW = other.rotated ? other.length : other.width;
        const otherL = other.rotated ? other.width : other.length;

        return (
            x < other.x + otherL &&
            x + pL > other.x &&
            y < other.y + otherW &&
            y + pW > other.y
        );
    });
}

/**
 * Lógica First-Fit optimizada (Prioriza Y luego X para llenar el ancho).
 */
function findBestFitPosition(pallet, tryRotation) {
    
    // Dimensiones en la orientación actual
    const dim1W = pallet.width;
    const dim1L = pallet.length;
    
    // 1. Intentar orientación principal
    let pos = findFitAtLocation(dim1W, dim1L, pallet);
    let bestPlacement = pos ? { x: pos.x, y: pos.y, rotated: false } : null;

    // 2. Intentar orientación rotada si se permite
    if (tryRotation && !bestPlacement) {
        const dim2W = pallet.length; // width se convierte en length
        const dim2L = pallet.width;  // length se convierte en width
        pos = findFitAtLocation(dim2W, dim2L, pallet);
        if (pos) {
             bestPlacement = { x: pos.x, y: pos.y, rotated: true };
        }
    }
    
    return bestPlacement;
}

function findFitAtLocation(pW, pL, currentPallet) {
    for (let x = 0; x <= TRUCK_WIDTH - pL; x++) {
        for (let y = 0; y <= TRUCK_HEIGHT - pW; y++) {
            if (isPositionAvailable(x, y, pW, pL, currentPallet)) {
                return { x, y };
            }
        }
    }
    return null;
}

// --- Gestión de Rotación y Arrastre (Interacción) ---

function toggleRotation(id) {
    const pallet = pallets.find(p => p.id === id);
    if (!pallet || !pallet.placed) return;

    // Calcular nuevas dimensiones si se rotara
    const newW = pallet.rotated ? pallet.width : pallet.length;
    const newL = pallet.rotated ? pallet.length : pallet.width;
    
    const tempPlaced = pallet.placed;
    pallet.placed = false; // Temporalmente fuera para verificación

    let newPos = findFitAtLocation(newW, newL, pallet);

    if (newPos) {
        pallet.rotated = !pallet.rotated;
        pallet.x = newPos.x;
        pallet.y = newPos.y;
        
        pallet.placed = tempPlaced;
        renderTruck(); 
    } else {
        alert('No se puede rotar aquí. No cabe en la nueva orientación.');
        pallet.placed = tempPlaced; // Restaurar
    }
}


// --- Función Principal de Renderizado ---

function renderTruck() {
    const truck = document.getElementById('truck');
    
    // Paso 1: Recalcular la colocación (incluyendo optimización de rotación)
    pallets.forEach(p => p.placed = false);

    pallets.forEach(pallet => {
        if (!pallet.placed) {
            let placement = findBestFitPosition(pallet, true); // True: intentar rotación
            
            if (placement) {
                pallet.x = placement.x;
                pallet.y = placement.y;
                pallet.rotated = placement.rotated;
                pallet.placed = true;
            }
        }
    });
    
    // Paso 2: Renderizar la Visualización
    truck.innerHTML = '';
    let maxX = 0;
    
    pallets.filter(p => p.placed).forEach(pallet => {
        // Usar las dimensiones correctas (rotadas o no)
        const palletW = pallet.rotated ? pallet.length : pallet.width;
        const palletL = pallet.rotated ? pallet.width : pallet.length;
        
        const palletDiv = document.createElement('div');
        palletDiv.className = 'pallet';
        palletDiv.id = `pallet-${pallet.id}`;
        palletDiv.style.backgroundColor = pallet.color; 
        palletDiv.style.width = `${palletL}px`;
        palletDiv.style.height = `${palletW}px`;
        palletDiv.style.left = `${pallet.x}px`;
        palletDiv.style.top = `${pallet.y}px`;
        palletDiv.textContent = `G${pallet.groupId}`; 
        
        // Eventos: Arrastre (si se implementa) y Doble Clic
        palletDiv.addEventListener('dblclick', () => toggleRotation(pallet.id));
        
        truck.appendChild(palletDiv);
        
        maxX = Math.max(maxX, pallet.x + palletL);
    });

    updateLinearMeters(maxX);
}

// --- Función de LDM ---

function updateLinearMeters(maxX) {
    let maxXTotal = maxX;
    
    const groups = pallets.reduce((acc, pallet) => {
        if (pallet.placed) {
            const groupKey = pallet.groupId;
            
            if (!acc[groupKey]) {
                acc[groupKey] = { groupId: groupKey, color: pallet.color, maxX: 0 };
            }
            
            const palletL = pallet.rotated ? pallet.width : pallet.length;
            acc[groupKey].maxX = Math.max(acc[groupKey].maxX, pallet.x + palletL);
        }
        return acc;
    }, {});

    // 2. Renderizar resumen LDM
    const groupSummaryDiv = document.getElementById('group-summary');
    const totalLdmValueSpan = document.getElementById('total-ldm-value');
    const resultParagraph = document.getElementById('result');

    const groupList = Object.values(groups).sort((a, b) => a.groupId - b.groupId);
    
    // ... [Lógica de renderizado del resumen de LDM] ...
    
    const totalLinearMeters = maxXTotal / 100;
    
    if (totalLdmValueSpan) totalLdmValueSpan.textContent = `${totalLinearMeters.toFixed(2)} m`;
    if (resultParagraph) resultParagraph.textContent = `Metros lineales ocupados: ${totalLinearMeters.toFixed(2)} m`;
}

document.addEventListener('DOMContentLoaded', renderTruck);
