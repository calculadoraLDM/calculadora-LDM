const TRUCK_WIDTH = 1360; // 13.6m en cm
const TRUCK_HEIGHT = 244; // 2.44m en cm
const COLORS = ['#ff7043', '#4caf50', '#2196f3', '#ffeb3b', '#9c27b0', '#00bcd4', '#795548', '#ffc107'];
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
            lastValidX: 0, // Posición para revertir en caso de colisión
            lastValidY: 0
        });
    }

    // 3. Renderizar (coloca los nuevos palets y redibuja todo)
    renderTruck();
}

/**
 * Verifica si una posición (x, y) es válida para un palet.
 * Usada tanto para la colocación inicial como para la validación de arrastre.
 */
function isPositionAvailable(x, y, pallet) {
    // 1. Verificar límites del camión
    if (x < 0 || y < 0 || x + pallet.length > TRUCK_WIDTH || y + pallet.width > TRUCK_HEIGHT) {
        return false;
    }

    // 2. Verificar solapamiento con otros palets ya colocados
    return !pallets.some(pos => {
        // Ignorar palets que aún no han sido colocados o el palet que estamos comprobando
        if (!pos.placed || pos.id === pallet.id) return false;

        // Comprobación de colisión (separating axis theorem simplificado)
        return (
            x < pos.x + pos.length &&
            x + pallet.length > pos.x &&
            y < pos.y + pos.width &&
            y + pallet.width > pos.y
        );
    });
}

/**
 * Coloca los palets no colocados, actualiza la visualización y el LDM.
 */
function renderTruck() {
    const truck = document.getElementById('truck');
    
    // --- Lógica de Colocación Inicial (Naive Bin Packing) ---
    let currentX = 0;
    let currentY = 0;
    let rowHeight = 0;
    
    pallets.filter(p => !p.placed).forEach(pallet => {
        let placed = false;
        
        // Intentar colocar en la posición actual (currentX, currentY)
        if (isPositionAvailable(currentX, currentY, pallet)) {
            pallet.x = currentX;
            pallet.y = currentY;
            pallet.placed = true;
            rowHeight = Math.max(rowHeight, pallet.width);
            currentX += pallet.length;
            placed = true;
        } 
        
        // Si no cabe en lo que queda de fila, intenta en la siguiente (si hay espacio)
        if (!placed && currentY + rowHeight + pallet.width <= TRUCK_HEIGHT) {
            currentY += rowHeight;
            currentX = 0;
            rowHeight = pallet.width;
            
            if (isPositionAvailable(currentX, currentY, pallet)) {
                pallet.x = currentX;
                pallet.y = currentY;
                pallet.placed = true;
                currentX += pallet.length;
                placed = true;
            }
        }
        
        if (placed) {
            // Guardar la posición inicial como válida
            pallet.lastValidX = pallet.x;
            pallet.lastValidY = pallet.y;
        } else {
            console.warn(`Palet ${pallet.id} no cabe en la colocación automática.`);
            // Si el palet no cabe automáticamente, lo marcamos como "no colocado"
            pallet.placed = false; 
        }
    });
    
    // --- Renderizar la Visualización Completa ---
    truck.innerHTML = '';
    
    pallets.filter(p => p.placed).forEach(pallet => {
        const palletDiv = document.createElement('div');
        palletDiv.className = 'pallet';
        palletDiv.id = `pallet-${pallet.id}`;
        
        palletDiv.style.backgroundColor = pallet.color;
        
        // Dimensiones y posición del DOM
        palletDiv.style.width = `${pallet.length}px`;
        palletDiv.style.height = `${pallet.width}px`;
        palletDiv.style.left = `${pallet.x}px`;
        palletDiv.style.top = `${pallet.y}px`;
        palletDiv.textContent = `${pallet.id + 1}`;
        
        // Añadir manejadores de eventos para arrastrar
        palletDiv.addEventListener('mousedown', dragStart);
        palletDiv.addEventListener('touchstart', dragStart, { passive: false }); // {passive: false} permite preventDefault
        
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


// --- Lógica de Arrastrar y Soltar (Drag and Drop) ---

function dragStart(e) {
    // Para dispositivos táctiles, previene el desplazamiento de la pantalla
    if (e.type === 'touchstart') e.preventDefault(); 
    
    const palletDiv = e.target;
    const id = parseInt(palletDiv.id.replace('pallet-', ''));
    currentPallet = pallets.find(p => p.id === id);

    if (!currentPallet) return;

    // Determinar las coordenadas del evento (ratón o táctil)
    const clientX = e.clientX || e.touches[0].clientX;
    const clientY = e.clientY || e.touches[0].clientY;
    
    // Calcular el desfase entre el puntero y la esquina superior izquierda del palet
    currentPallet.offsetX = clientX - currentPallet.x;
    currentPallet.offsetY = clientY - currentPallet.y;

    // Elevar el z-index para que se vea por encima de otros palets
    palletDiv.style.zIndex = 10;
    
    // Añadir los eventos de movimiento y soltar al DOCUMENTO
    document.addEventListener('mousemove', dragMove);
    document.addEventListener('mouseup', dragEnd);
    document.addEventListener('touchmove', dragMove, { passive: false });
    document.addEventListener('touchend', dragEnd);
}

function dragMove(e) {
    if (!currentPallet) return;
    
    // Para dispositivos táctiles, previene el desplazamiento de la pantalla
    if (e.type === 'touchmove') e.preventDefault();

    const clientX = e.clientX || e.touches[0].clientX;
    const clientY = e.clientY || e.touches[0].clientY;

    let newX = clientX - currentPallet.offsetX;
    let newY = clientY - currentPallet.offsetY;

    // Aplicar límites del camión
    newX = Math.min(Math.max(0, newX), TRUCK_WIDTH - currentPallet.length);
    newY = Math.min(Math.max(0, newY), TRUCK_HEIGHT - currentPallet.width);

    // Actualizar la posición del palet en el DOM
    const palletDiv = document.getElementById(`pallet-${currentPallet.id}`);
    palletDiv.style.left = `${newX}px`;
    palletDiv.style.top = `${newY}px`;

    // Actualizar las coordenadas del palet en el modelo TEMPORALMENTE
    currentPallet.x = newX;
    currentPallet.y = newY;
}

function dragEnd() {
    if (!currentPallet) return;

    const palletDiv = document.getElementById(`pallet-${currentPallet.id}`);
    palletDiv.style.zIndex = 1; // Restaurar el z-index

    // --- Validación de Solapamiento al soltar ---
    
    // Si la nueva posición es válida
    if (isPositionAvailable(currentPallet.x, currentPallet.y, currentPallet)) {
        // Movimiento válido: actualiza la última posición válida
        currentPallet.lastValidX = currentPallet.x;
        currentPallet.lastValidY = currentPallet.y;
        updateLinearMeters();
    } else {
        // Colisión: revierte a la última posición válida conocida
        alert('¡Colisión! Por favor, mueve el palet a un espacio libre.');
        
        currentPallet.x = currentPallet.lastValidX; 
        currentPallet.y = currentPallet.lastValidY;
        
        // Forzar al DOM a volver a la posición válida
        palletDiv.style.left = `${currentPallet.x}px`;
        palletDiv.style.top = `${currentPallet.y}px`;
    }

    // Limpiar manejadores y el palet actual
    document.removeEventListener('mousemove', dragMove);
    document.removeEventListener('mouseup', dragEnd);
    document.removeEventListener('touchmove', dragMove);
    document.removeEventListener('touchend', dragEnd);
    currentPallet = null;
}

// Inicializar un render inicial al cargar la página
document.addEventListener('DOMContentLoaded', renderTruck);
