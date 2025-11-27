const TRUCK_WIDTH = 1360; // 13.6m en cm
const TRUCK_HEIGHT = 244; // 2.44m en cm
const COLORS = ['#ff7043', '#4caf50', '#2196f3', '#ffeb3b', '#9c27b0', '#00bcd4', '#795548', '#ffc107', '#424242', '#ad1457']; // Más colores
let pallets = [];
let nextPalletId = 0;
let colorIndex = 0;
let currentPallet = null; // Palet que se está arrastrando

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
 * Añade un grupo de palets al array de datos con un color de lote único.
 */
function addPallets() {
    // 1. Obtener y validar entradas
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

    // 2. Añadir palets al modelo de datos
    for (let i = 0; i < palletQuantity; i++) {
        pallets.push({
            id: nextPalletId++,
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

    // 3. Renderizar (coloca los nuevos palets y redibuja todo)
    renderTruck();
}

/**
 * Verifica si una posición (x, y) es válida para un palet.
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

/**
 * Coloca los palets no colocados, priorizando el ancho del camión.
 */
function renderTruck() {
    const truck = document.getElementById('truck');
    
    // 1. Recalcular la colocación para TODOS los palets no colocados (Algoritmo de Prioridad Ancho/Izquierda)
    pallets.filter(p => !p.placed).forEach(p => {
        let placed = false;
        
        // Buscar el primer hueco disponible (arriba a la izquierda)
        for (let x_pos = 0; x_pos <= TRUCK_WIDTH - p.length; x_pos++) {
            for (let y_pos = 0; y_pos <= TRUCK_HEIGHT - p.width; y_pos++) {
                
                if (isPositionAvailable(x_pos, y_pos, p)) {
                    p.x = x_pos;
                    p.y = y_pos;
                    p.placed = true;
                    p.lastValidX = x_pos;
                    p.lastValidY = y_pos;
                    placed = true;
                    // Ya que encontramos un lugar, salimos del bucle Y para apilar el siguiente
                    break;
                }
            }
            if (placed) {
                // Ya que encontramos un lugar, salimos del bucle X para mantener el apilamiento a la izquierda
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
 * Calcula y muestra los Metros Lineales (LDM) ocupados.
 */
function updateLinearMeters() {
    let maxX = 0;
    pallets.filter(p => p.placed).forEach(pallet => {
        maxX = Math.max(maxX, pallet.x + pallet.length);
    });

    const totalLinearMeters = maxX / 100; // Convertimos de cm a metros
    document.getElementById('result').textContent = `Metros lineales ocupados (LDM): ${totalLinearMeters.toFixed(2)} m`;
}


// --- Lógica de Arrastrar y Soltar con Colisión en Movimiento (Sistema de Tope) ---

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

    // 2. Comprobar y ajustar la colisión con otros palets (Sistema de Tope/Pared)
    pallets.filter(p => p.id !== currentPallet.id && p.placed).forEach(otherPallet => {
        
        // Comprobación de colisión: Si la nueva posición Causa solapamiento
        const isColliding = (
            targetX < otherPallet.x + otherPallet.length &&
            targetX + currentPallet.length > otherPallet.x &&
            targetY < otherPallet.y + otherPallet.width &&
            targetY + currentPallet.width > otherPallet.y
        );

        if (isColliding) {
            // Si hay colisión, ajustamos la posición de destino a la de "tope"
            
            // Calculamos el movimiento real que se hizo en este paso
            const deltaX = targetX - currentPallet.x;
            const deltaY = targetY - currentPallet.y;

            // Resolvemos la colisión en la dirección del movimiento más fuerte
            if (Math.abs(deltaX) > Math.abs(deltaY)) {
                // Intentando moverse en X
                if (deltaX > 0) { // Moviéndose a la derecha
                    targetX = otherPallet.x - currentPallet.length; // Posición de tope a la izquierda del otro
                } else { // Moviéndose a la izquierda
                    targetX = otherPallet.x + otherPallet.length; // Posición de tope a la derecha del otro
                }
            } else {
                // Intentando moverse en Y
                if (deltaY > 0) { // Moviéndose hacia abajo
                    targetY = otherPallet.y - currentPallet.width; // Posición de tope arriba del otro
                } else { // Moviéndose hacia arriba
                    targetY = otherPallet.y + otherPallet.width; // Posición de tope abajo del otro
                }
            }
            
            // Volvemos a aplicar límites del camión después del ajuste
            targetX = Math.min(Math.max(0, targetX), TRUCK_WIDTH - currentPallet.length);
            targetY = Math.min(Math.max(0, targetY), TRUCK_HEIGHT - currentPallet.width);
        }
    });

    // 3. Aplicar la posición final (ajustada por colisión)
    
    // Si la posición ha cambiado, actualizamos
    if (currentPallet.x !== targetX || currentPallet.y !== targetY) {
        // Actualizar modelo
        currentPallet.x = targetX;
        currentPallet.y = targetY;

        // Actualizar DOM
        const palletDiv = document.getElementById(`pallet-${currentPallet.id}`);
        palletDiv.style.left = `${targetX}px`;
        palletDiv.style.top = `${targetY}px`;
    }
}

function dragEnd() {
    if (!currentPallet) return;

    const palletDiv = document.getElementById(`pallet-${currentPallet.id}`);
    palletDiv.style.zIndex = 1; 

    // Al soltar, la posición ya es válida gracias a dragMove
    currentPallet.lastValidX = currentPallet.x; 
    currentPallet.lastValidY = currentPallet.y;
    
    updateLinearMeters();
    
    document.removeEventListener('mousemove', dragMove);
    document.removeEventListener('mouseup', dragEnd);
    document.removeEventListener('touchmove', dragMove);
    document.removeEventListener('touchend', dragEnd);
    currentPallet = null;
}

// Inicializar un render inicial al cargar la página
document.addEventListener('DOMContentLoaded', renderTruck);
