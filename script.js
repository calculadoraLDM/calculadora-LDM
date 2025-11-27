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
window.toggleRotation = toggleRotation; 

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

    if (palletWidth > TRUCK_HEIGHT && palletLength > TRUCK_HEIGHT) { // El palet no cabe ni rotado
         alert(`ERROR: El palet (${palletWidth}x${palletLength}) es demasiado ancho. Máximo de ancho del camión: ${TRUCK_HEIGHT}cm.`);
         return;
    }
    
    if (palletLength > TRUCK_WIDTH || palletWidth > TRUCK_WIDTH) {
        alert(`ERROR: El palet (${palletWidth}x${palletLength}) es demasiado largo. Máximo de largo del camión: ${TRUCK_WIDTH}cm.`);
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
            rotated: false, // Valor inicial de rotación
            // Variables temporales para arrastre
            offsetX: 0, 
            offsetY: 0,
            tempX: 0,
            tempY: 0,
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
        // Solo verifica contra palets ya colocados y que no sea el mismo
        if (!other.placed || other.id === currentPallet.id) return false;
        
        // Obtener dimensiones reales del otro palet
        const otherW = other.rotated ? other.length : other.width;
        const otherL = other.rotated ? other.width : other.length;

        // Detección de colisión (separating axis theorem simplificado)
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
    
    // Dimensiones en la orientación principal
    const dim1W = pallet.width;
    const dim1L = pallet.length;
    
    // 1. Intentar orientación principal
    let pos = findFitAtLocation(dim1W, dim1L, pallet);
    let bestPlacement = pos ? { x: pos.x, y: pos.y, rotated: false } : null;

    // 2. Intentar orientación rotada si se permite
    if (tryRotation && !bestPlacement) {
        const dim2W = pallet.length; // width se convierte en length
        const dim2L = pallet.width;  // length se convierte en width
        
        // Solo intentar rotar si el palet rotado cabe en el ancho del camión
        if (dim2W <= TRUCK_HEIGHT) {
             pos = findFitAtLocation(dim2W, dim2L, pallet);
             if (pos) {
                  bestPlacement = { x: pos.x, y: pos.y, rotated: true };
             }
        }
    }
    
    return bestPlacement;
}

function findFitAtLocation(pW, pL, currentPallet) {
    for (let y = 0; y <= TRUCK_HEIGHT - pW; y++) {
        for (let x = 0; x <= TRUCK_WIDTH - pL; x++) {
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
    
    // Verificación de ancho CRÍTICA
    if (newW > TRUCK_HEIGHT) {
        alert('No se puede rotar. La nueva anchura es mayor que el ancho del remolque.');
        return;
    }
    
    const tempPlaced = pallet.placed;
    pallet.placed = false; // Temporalmente fuera para verificación de colisión

    // Intentar encontrar una nueva posición, priorizando la posición actual (pallet.x, pallet.y)
    let newPos = findFitAtLocation(newW, newL, pallet);

    if (newPos) {
        pallet.rotated = !pallet.rotated;
        pallet.x = newPos.x;
        pallet.y = newPos.y;
        
        pallet.placed = tempPlaced;
        renderTruck(); 
    } else {
        alert('No se puede rotar aquí. La nueva orientación colisiona con otros palets.');
        pallet.placed = tempPlaced; // Restaurar
    }
}

function startDrag(e, palletId) {
    currentPallet = pallets.find(p => p.id === palletId);
    if (!currentPallet) return;

    e.preventDefault();
    
    // Detener la propagación para evitar arrastrar la ventana en navegadores móviles
    e.stopPropagation(); 
    
    document.addEventListener('mousemove', onDrag);
    document.addEventListener('mouseup', endDrag);

    // Guardar el desplazamiento inicial del ratón
    currentPallet.offsetX = e.clientX - document.getElementById('truck').getBoundingClientRect().left - currentPallet.x;
    currentPallet.offsetY = e.clientY - document.getElementById('truck').getBoundingClientRect().top - currentPallet.y;
    
    // Darle mayor prioridad al arrastrar
    document.getElementById(`pallet-${palletId}`).style.zIndex = 1000;
    document.body.style.cursor = 'grabbing';
}

function onDrag(e) {
    if (!currentPallet) return;

    // Obtener las dimensiones del camión para calcular posiciones relativas
    const truckRect = document.getElementById('truck').getBoundingClientRect();

    // Obtener dimensiones actuales del palet
    const pW = currentPallet.rotated ? currentPallet.length : currentPallet.width;
    const pL = currentPallet.rotated ? currentPallet.width : currentPallet.length;

    // Calcular la nueva posición basada en el ratón, el offset y la posición del camión
    let newX = e.clientX - truckRect.left - currentPallet.offsetX;
    let newY = e.clientY - truckRect.top - currentPallet.offsetY;

    // Límite de posición: Asegurar que el palet no salga del camión
    newX = Math.max(0, Math.min(newX, TRUCK_WIDTH - pL));
    newY = Math.max(0, Math.min(newY, TRUCK_HEIGHT - pW));

    // Actualizar la posición visual (sin cambiar el modelo de datos todavía)
    const palletDiv = document.getElementById(`pallet-${currentPallet.id}`);
    palletDiv.style.left = `${newX}px`;
    palletDiv.style.top = `${newY}px`;
    
    // Almacenar la posición temporal en el modelo de datos
    currentPallet.tempX = newX;
    currentPallet.tempY = newY;
}

function endDrag() {
    if (!currentPallet) return;

    document.removeEventListener('mousemove', onDrag);
    document.removeEventListener('mouseup', endDrag);
    document.body.style.cursor = 'default';

    const palletId = currentPallet.id;
    
    // Obtener dimensiones actuales del palet
    const pW = currentPallet.rotated ? currentPallet.length : currentPallet.width;
    const pL = currentPallet.rotated ? currentPallet.width : currentPallet.length;
    
    // Guardar temporalmente el estado para la verificación
    const tempX = currentPallet.tempX || currentPallet.x;
    const tempY = currentPallet.tempY || currentPallet.y;
    
    const tempPlaced = currentPallet.placed;
    currentPallet.placed = false; // Temporalmente fuera para verificación

    // Verificar si la nueva posición temporal colisiona con otros palets
    const isAvailable = isPositionAvailable(tempX, tempY, pW, pL, currentPallet);

    if (isAvailable) {
        // Colocación válida: Actualizar la posición final
        currentPallet.x = tempX;
        currentPallet.y = tempY;
        currentPallet.placed = tempPlaced;
    } else {
        // Colisión: Revertir a la posición anterior y avisar
        alert("¡Colisión! No puedes colocar el palet aquí.");
        currentPallet.placed = tempPlaced; // Restaurar el estado
        // La posición (x, y) no se actualiza, el renderizado usará la última posición válida.
    }
    
    // Restaurar z-index
    document.getElementById(`pallet-${palletId}`).style.zIndex = '';
    
    // Limpiar el estado de arrastre y re-renderizar para calcular el nuevo LDM
    currentPallet = null;
    renderTruck(); // Vuelve a renderizar para actualizar el LDM
}


// --- Función Principal de Renderizado ---

function renderTruck() {
    const truck = document.getElementById('truck');
    
    // Paso 1: Recalcular la colocación (incluyendo optimización de rotación)
    // Solo hace el auto-fit inicial si el palet no ha sido colocado (placed: false)
    // Esto permite que los palets arrastrados (placed: true) permanezcan donde están.
    
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
        
        // Eventos: Arrastre y Doble Clic
        palletDiv.addEventListener('dblclick', () => toggleRotation(pallet.id));
        palletDiv.addEventListener('mousedown', (e) => startDrag(e, pallet.id)); 
        
        truck.appendChild(palletDiv);
        
        maxX = Math.max(maxX, pallet.x + palletL);
    });

    updateLinearMeters(maxX);
}

// --- Función de LDM ---

function updateLinearMeters(maxX) {
    let maxXTotal = maxX;
    
    // 1. Calcular LDM por grupo
    const groups = pallets.reduce((acc, pallet) => {
        if (pallet.placed) {
            const groupKey = pallet.groupId;
            
            if (!acc[groupKey]) {
                acc[groupKey] = { groupId: groupKey, color: pallet.color, maxX: 0, count: 0, width: pallet.width, length: pallet.length };
            }
            
            const palletL = pallet.rotated ? pallet.width : pallet.length;
            acc[groupKey].maxX = Math.max(acc[groupKey].maxX, pallet.x + palletL);
            acc[groupKey].count++; 
        }
        return acc;
    }, {});

    // 2. Renderizar resumen LDM
    const groupSummaryDiv = document.getElementById('group-summary');
    const totalLdmValueSpan = document.getElementById('total-ldm-value');
    const resultParagraph = document.getElementById('result');

    const groupList = Object.values(groups).sort((a, b) => a.groupId - b.groupId);
    
    // Lógica de renderizado del resumen de LDM
    groupSummaryDiv.innerHTML = ''; 

    if (groupList.length === 0) {
        groupSummaryDiv.innerHTML = '<p class="empty-message">Aún no hay lotes de carga.</p>';
    } else {
        groupList.forEach(group => {
            const ldm = (group.maxX / 100).toFixed(2);
            const itemHtml = `
                <div class="group-item">
                    <span style="display:flex; align-items:center;">
                        <span class="group-indicator" style="background-color: ${group.color};"></span>
                        Lote G${group.groupId} (${group.width}x${group.length}cm) x${group.count}
                    </span>
                    <span class="ldm-value">LDM: ${ldm} m</span>
                    <button class="remove-group-btn" onclick="removeGroupByGroupid(${group.groupId})">
                        &times;
                    </button>
                </div>
            `;
            groupSummaryDiv.insertAdjacentHTML('beforeend', itemHtml);
        });
    }
    
    const totalLinearMeters = maxXTotal / 100;
    
    if (totalLdmValueSpan) totalLdmValueSpan.textContent = `${totalLinearMeters.toFixed(2)} m`;
    if (resultParagraph) resultParagraph.textContent = `Metros lineales ocupados: ${totalLinearMeters.toFixed(2)} m`;
}

document.addEventListener('DOMContentLoaded', renderTruck);
