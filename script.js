const TRUCK_WIDTH = 1360; // 13.6m en cm
const TRUCK_HEIGHT = 244; // 2.44m en cm
// Paleta de colores variados para distinguir grupos
const COLORS = ['#ff7043', '#4caf50', '#2196f3', '#ffeb3b', '#9c27b0', '#00bcd4', '#795548', '#ffc107', '#424242', '#ad1457']; 

let pallets = [];
let nextPalletId = 0;
let nextGroupId = 1; 
let colorIndex = 0;
let currentPallet = null; 

// --- Funciones de Utilidad ---

/**
 * Genera un color rotativo para el nuevo grupo de palets.
 */
function getNextColor() {
    const color = COLORS[colorIndex % COLORS.length];
    colorIndex++;
    return color;
}

/**
 * Verifica si una posición (x, y) es válida para un palet (dentro de límites y sin solapamiento).
 */
function isPositionAvailable(x, y, pallet) {
    // 1. Verificar límites del camión
    if (x < 0 || y < 0 || x + pallet.length > TRUCK_WIDTH || y + pallet.width > TRUCK_HEIGHT) {
        return false;
    }

    // 2. Verificar solapamiento con otros palets ya colocados
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

// --- Funciones de Carga y Gestión ---

/**
 * Limpia todos los palets y reinicia contadores.
 */
function clearPallets() {
    pallets = [];
    nextPalletId = 0;
    nextGroupId = 1;
    colorIndex = 0;
    renderTruck();
}

/**
 * Añade un grupo de palets al modelo de datos.
 */
function addPallets() {
    const palletWidth = parseInt(document.getElementById('pallet-width').value);
    const palletLength = parseInt(document.getElementById('pallet-length').value);
    const palletQuantity = parseInt(document.getElementById('pallet-quantity').value);

    // Validación básica de entradas
    if (isNaN(palletWidth) || isNaN(palletLength) || isNaN(palletQuantity) || palletWidth <= 0 || palletLength <= 0 || palletQuantity <= 0) {
        alert('Por favor, introduce valores válidos y positivos.');
        return;
    }
    
    if (palletWidth > TRUCK_HEIGHT || palletLength > TRUCK_WIDTH) {
         alert(`El palet no cabe. Dimensiones máximas del camión: ${TRUCK_WIDTH}cm x ${TRUCK_HEIGHT}cm.`);
         return;
    }

    const color = getNextColor();
    const groupId = nextGroupId++;

    // Crear y añadir palets
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
 * Coloca los palets no colocados (Algoritmo de Prioridad Ancho/Izquierda).
 */
function renderTruck() {
    const truck = document.getElementById('truck');
    
    // Recalcular la colocación para palets NO colocados
    pallets.filter(p => !p.placed).forEach(p => {
        let placed = false;
        
        // Busca el primer hueco disponible (priorizando la izquierda y arriba)
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
            console.warn(`Palet ${p.id} no cabe en la colocación automática.`);
            p.placed = false; 
        }
    });
    
    // Renderizar la Visualización
    truck.innerHTML = '';
    
    pallets.filter(p => p.placed).forEach(pallet => {
        const palletDiv = document.createElement('div');
        palletDiv.className = 'pallet';
        palletDiv.id = `pallet-${pallet.id}`;
        
        palletDiv.style.backgroundColor = pallet.color;
        
        // Asignar dimensiones y posición en el DOM (usando cm como píxeles)
        palletDiv.style.width = `${pallet.length}px`;
        palletDiv.style.height = `${pallet.width}px`;
        palletDiv.style.left = `${pallet.x}px`;
        palletDiv.style.top = `${pallet.y}px`;
        palletDiv.textContent = `${pallet.id + 1}`;
        
        // Añadir eventos de arrastre
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
    let placedPalletCount = 0;
    
    const groups = pallets.reduce((acc, pallet) => {
        if (pallet.placed) {
            placedPalletCount++;
            const groupKey = pallet.groupId;
            
            if (!acc[groupKey]) {
                acc[groupKey] = { 
                    groupId: groupKey, 
                    color: pallet.color,
                    maxX: 0 
                };
            }
            
            acc[groupKey].maxX = Math.max(acc[groupKey].maxX, pallet.x + pallet.length);
            maxXTotal = Math.max(maxXTotal, pallet.x + pallet.length);
        }
        return acc;
    }, {});

    // Renderizar la lista de grupos
    const groupSummaryDiv = document.getElementById('group-summary');
    const groupList = Object.values(groups).sort((a, b) => a.groupId - b.groupId);
    
    if (groupList.length === 0) {
        groupSummaryDiv.innerHTML = '<p class="empty-message">Aún no hay cargas.</p>';
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
    
    const totalLinearMeters = maxXTotal / 100;
    
    // Actualización de métricas en el sidebar
    document.getElementById('total-ldm-value').textContent = `${totalLinearMeters.toFixed(2)} m`;
    document.getElementById('total-pallets-value').textContent = placedPalletCount;
    
    // Actualización del resultado bajo el camión
    document.getElementById('result').textContent = `Metros lineales ocupados (LDM Total): ${totalLinearMeters.toFixed(2)} m`;
}


// --- Lógica de Arrastrar y Soltar con Colisión de Tope ---

function dragStart(e) {
    if (e.type === 'touchstart') e.preventDefault(); 
    
    const palletDiv = e.target;
    const id = parseInt(palletDiv.id.replace('pallet-', ''));
    currentPallet = pallets.find(p => p.id === id);

    if (!currentPallet) return;

    const clientX = e.clientX || e.touches[0].clientX;
    const clientY = e.clientY || e.touches[0].clientY;
    
    // Calcular el desfase entre el cursor y el origen del palet
    currentPallet.offsetX = clientX - currentPallet.x;
    currentPallet.offsetY = clientY - currentPallet.y;

    palletDiv.style.zIndex = 10;
    
    // Añadir listeners al documento para capturar el movimiento y soltar
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

    // 1. Aplicar límites del camión (INICIALMENTE)
    targetX = Math.min(Math.max(0, targetX), TRUCK_WIDTH - currentPallet.length);
    targetY = Math.min(Math.max(0, targetY), TRUCK_HEIGHT - currentPallet.width);

    // 2. Comprobar y ajustar la colisión (Sistema de Tope Estricto)
    pallets.filter(p => p.id !== currentPallet.id && p.placed).forEach(otherPallet => {
        
        // Detección de colisión
        const isColliding = (
            targetX < otherPallet.x + otherPallet.length &&
            targetX + currentPallet.length > otherPallet.x &&
            targetY < otherPallet.y + otherPallet.width &&
            targetY + currentPallet.width > otherPallet.y
        );

        if (isColliding) {
            const deltaX = targetX - currentPallet.x;
            const deltaY = targetY - currentPallet.y;

            // Resolver colisión empujando el palet a la posición de 'tope'
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
            
            // 3. RE-APLICAR los límites del camión después del ajuste de colisión.
            targetX = Math.min(Math.max(0, targetX), TRUCK_WIDTH - currentPallet.length);
            targetY = Math.min(Math.max(0, targetY), TRUCK_HEIGHT - currentPallet.width);
        }
    });

    // 4. Aplicar la posición final (si ha cambiado)
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

    // Guardar la posición final (que ya es válida)
    currentPallet.lastValidX = currentPallet.x; 
    currentPallet.lastValidY = currentPallet.y;
    
    updateLinearMeters(); 
    
    // Eliminar listeners
    document.removeEventListener('mousemove', dragMove);
    document.removeEventListener('mouseup', dragEnd);
    document.removeEventListener('touchmove', dragMove);
    document.removeEventListener('touchend', dragEnd);
    currentPallet = null;
}

// Inicialización
document.addEventListener('DOMContentLoaded', renderTruck);
