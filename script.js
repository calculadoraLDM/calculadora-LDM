const TRUCK_WIDTH = 1360; // 13.6m en cm
const TRUCK_HEIGHT = 244; // 2.44m en cm
const COLORS = ['#ff7043', '#4caf50', '#2196f3', '#ffeb3b', '#9c27b0', '#00bcd4', '#795548', '#ffc107', '#424242', '#ad1457']; 
let pallets = [];
let nextPalletId = 0;
let nextGroupId = 1; // **IMPORTANTE: Contador para nombrar los grupos**
let colorIndex = 0;
let currentPallet = null; 

/**
 * Genera un color rotativo para el nuevo grupo de palets.
 * @returns {string} El código de color.
 */
function getNextColor() {
    const color = COLORS[colorIndex % COLORS.length];
    colorIndex++;
    return color;
}

/**
 * Añade un grupo de palets.
 */
function addPallets() {
    const palletWidth = parseInt(document.getElementById('pallet-width').value);
    const palletLength = parseInt(document.getElementById('pallet-length').value);
    const palletQuantity = parseInt(document.getElementById('pallet-quantity').value);

    if (isNaN(palletWidth) || isNaN(palletLength) || isNaN(palletQuantity) || palletWidth <= 0 || palletLength <= 0 || palletQuantity <= 0) {
        alert('Por favor, introduce valores válidos y positivos.');
        return;
    }
    
    if (palletWidth > TRUCK_HEIGHT || palletLength > TRUCK_WIDTH) {
         alert(`El palet no cabe. Dimensiones máximas del camión: ${TRUCK_WIDTH}cm x ${TRUCK_HEIGHT}cm.`);
         return;
    }

    const color = getNextColor();
    const groupId = nextGroupId++; // Asignar ID de grupo

    // Añadir palets al modelo de datos
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
            lastValidX: 0, 
            lastValidY: 0
        });
    }

    renderTruck();
}

/**
 * Verifica si una posición (x, y) es válida para un palet.
 */
function isPositionAvailable(x, y, pallet) {
    if (x < 0 || y < 0 || x + pallet.length > TRUCK_WIDTH || y + pallet.width > TRUCK_HEIGHT) {
        return false;
    }

    return !pallets.some(pos => {
        if (!pos.placed || pos.id === pallet.id) return false;

        return (
            x < pos.x + pos.length &&
            x + pallet.length > pos.x &&
            y < pos.y + pos.width &&
            y + pallet.width > pos.y
        );
    });
}

/**
 * Coloca los palets no colocados, priorizando el ancho del camión.
 */
function renderTruck() {
    const truck = document.getElementById('truck');
    
    // 1. Recalcular la colocación para TODOS los palets no colocados (Algoritmo de Prioridad Ancho/Izquierda)
    pallets.filter(p => !p.placed).forEach(p => {
        let placed = false;
        
        for (let x_pos = 0; x_pos <= TRUCK_WIDTH - p.length; x_pos++) {
            for (let y_pos = 0; y_pos <= TRUCK_HEIGHT - p.width; y_pos++) {
                
                if (isPositionAvailable(x_pos, y_pos, p)) {
                    p.x = x_pos;
                    p.y = y_pos;
                    p.placed = true;
                    p.lastValidX = x_pos;
                    p.lastValidY = y_pos;
                    placed = true;
                    break;
                }
            }
            if (placed) {
                break; 
            }
        }
        
        if (!placed) {
            console.warn(`Palet ${p.id} no cabe en el camión.`);
            p.placed = false; 
        }
    });
    
    // 2. Renderizar la Visualización
    truck.innerHTML = '';
    
    pallets.filter(p => p.placed).forEach(pallet => {
        const palletDiv = document.createElement('div');
        palletDiv.className = 'pallet';
        palletDiv.id = `pallet-${pallet.id}`;
        
        palletDiv.style.backgroundColor = pallet.color;
        
        palletDiv.style.width = `${pallet.length}px`;
        palletDiv.style.height = `${pallet.width}px`;
        palletDiv.style.left = `${pallet.x}px`;
        palletDiv.style.top = `${pallet.y}px`;
        palletDiv.textContent = `${pallet.id + 1}`;
        
        palletDiv.addEventListener('mousedown', dragStart);
        palletDiv.addEventListener('touchstart', dragStart, { passive: false });
        
        truck.appendChild(palletDiv);
    });

    updateLinearMeters();
}

/**
 * Calcula y muestra los Metros Lineales (LDM) ocupados, tanto totales como por grupo.
 */
function updateLinearMeters() {
    let maxXTotal = 0;
    
    // Agrupar palets por ID de grupo
    const groups = pallets.reduce((acc, pallet) => {
        if (pallet.placed) {
            const groupKey = pallet.groupId;
            
            // Inicializar el grupo si no existe
            if (!acc[groupKey]) {
                acc[groupKey] = { 
                    groupId: groupKey, 
                    color: pallet.color,
                    maxX: 0 
                };
            }
            
            // Actualizar el LDM máximo de este grupo
            acc[groupKey].maxX = Math.max(acc[groupKey].maxX, pallet.x + pallet.length);
            
            // Actualizar el LDM total
            maxXTotal = Math.max(maxXTotal, pallet.x + pallet.length);
        }
        return acc;
    }, {});

    // Renderizar la lista de grupos
    const groupSummaryDiv = document.getElementById('group-summary');
    // Aseguramos que la lista se ordene por el número de grupo
    const groupList = Object.values(groups).sort((a, b) => a.groupId - b.groupId);
    
    if (groupList.length === 0) {
        groupSummaryDiv.innerHTML = '<p class="empty-message">Aún no hay cargas añadidas.</p>';
    } else {
        groupSummaryDiv.innerHTML = groupList.map(group => {
            const ldm = (group.maxX / 100).toFixed(2);
            return `
                <div class="group-item">
                    <span>
                        <span class="group-indicator" style="background-color: ${group.color};"></span>
                        Grupo ${group.groupId}
                    </span>
                    <span class="ldm-value">${ldm} m</span>
                </div>
            `;
        }).join('');
    }
    
    // Actualizar el valor del LDM total en el resumen lateral
    const totalLinearMeters = maxXTotal / 100;
    document.getElementById('total-ldm-value').textContent = `${totalLinearMeters.toFixed(2)} m`;

    // Actualizar el resultado principal debajo del camión 
    document.getElementById('result').textContent = `Metros lineales ocupados (LDM Total): ${totalLinearMeters.toFixed(2)} m`;
}


// --- Lógica de Arrastrar y Soltar con Colisión en Movimiento (SIN CAMBIOS) ---
function dragStart(e) {
    if (e.type === 'touchstart') e.preventDefault(); 
    
    const palletDiv = e.target;
    const id = parseInt(palletDiv.id.replace('pallet-', ''));
    currentPallet = pallets.find(p => p.id === id);

    if (!currentPallet) return;

    const clientX = e.clientX || e.touches[0].clientX;
    const clientY = e.clientY || e.touches[0].clientY;
    
    currentPallet.offsetX = clientX - currentPallet.x;
    currentPallet.offsetY = clientY - currentPallet.y;

    palletDiv.style.zIndex = 10;
    
    document.addEventListener('mousemove', dragMove);
    document.addEventListener('mouseup', dragEnd);
    document.addEventListener('touchmove', dragMove, { passive: false });
    document.addEventListener('touchend', dragEnd);
}

function dragMove(e) {
    if (!currentPallet) return;
    
    if (e.type === 'touchmove') e.preventDefault();

    const clientX = e.clientX || e.touches[0].clientX;
    const clientY = e.clientY || e.touches[0].clientY;

    let targetX = clientX - currentPallet.offsetX;
    let targetY = clientY - currentPallet.offsetY;

    // 1. Aplicar límites del camión
    targetX = Math.min(Math.max(0, targetX), TRUCK_WIDTH - currentPallet.length);
    targetY = Math.min(Math.max(0, targetY), TRUCK_HEIGHT - currentPallet.width);

    // 2. Comprobar y ajustar la colisión (Sistema de Tope)
    pallets.filter(p => p.id !== currentPallet.id && p.placed).forEach(otherPallet => {
        
        const isColliding = (
            targetX < otherPallet.x + otherPallet.length &&
            targetX + currentPallet.length > otherPallet.x &&
            targetY < otherPallet.y + otherPallet.width &&
            targetY + currentPallet.width > otherPallet.y
        );

        if (isColliding) {
            const deltaX = targetX - currentPallet.x;
            const deltaY = targetY - currentPallet.y;

            if (Math.abs(deltaX) > Math.abs(deltaY)) {
                if (deltaX > 0) { 
                    targetX = otherPallet.x - currentPallet.length; 
                } else { 
                    targetX = otherPallet.x + otherPallet.length; 
                }
            } else {
                if (deltaY > 0) { 
                    targetY = otherPallet.y - currentPallet.width; 
                } else { 
                    targetY = otherPallet.y + otherPallet.width; 
                }
            }
            
            targetX = Math.min(Math.max(0, targetX), TRUCK_WIDTH - currentPallet.length);
            targetY = Math.min(Math.max(0, targetY), TRUCK_HEIGHT - currentPallet.width);
        }
    });

    // 3. Aplicar la posición final (ajustada por colisión)
    if (currentPallet.x !== targetX || currentPallet.y !== targetY) {
        currentPallet.x = targetX;
        currentPallet.y = targetY;

        const palletDiv = document.getElementById(`pallet-${currentPallet.id}`);
        palletDiv.style.left = `${targetX}px`;
        palletDiv.style.top = `${targetY}px`;
    }
}

function dragEnd() {
    if (!currentPallet) return;

    const palletDiv = document.getElementById(`pallet-${currentPallet.id}`);
    palletDiv.style.zIndex = 1; 

    // Guardar la posición final (válida)
    currentPallet.lastValidX = currentPallet.x; 
    currentPallet.lastValidY = currentPallet.y;
    
    updateLinearMeters(); // **IMPORTANTE: Actualizar LDM tras el movimiento**
    
    document.removeEventListener('mousemove', dragMove);
    document.removeEventListener('mouseup', dragEnd);
    document.removeEventListener('touchmove', dragMove);
    document.removeEventListener('touchend', dragEnd);
    currentPallet = null;
}

// Inicializar un render inicial al cargar la página
document.addEventListener('DOMContentLoaded', renderTruck);
