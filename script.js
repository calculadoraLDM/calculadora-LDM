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
 * Coloca los palets no colocados, priorizando el ancho del camión,
 * y actualiza la visualización y el LDM.
 */
function renderTruck() {
    const truck = document.getElementById('truck');
    
    // 1. Recalcular la colocación para TODOS los palets no colocados
    pallets.filter(p => !p.placed).forEach(p => {
        
        // Colocación: Intenta colocar el palet en la primera posición disponible (0,0), 
        // luego incrementando Y, luego incrementando X.
        let placed = false;
        
        // Iterar sobre las posiciones posibles (coordenadas x,y de la esquina superior izquierda)
        // La lógica de búsqueda de espacio es muy simple aquí, podemos mejorarla
        // con un algoritmo de "Next Fit" o "Best Fit" si es necesario, 
        // pero por ahora buscamos de izquierda a derecha, de arriba abajo.
        for (let x_pos = 0; x_pos <= TRUCK_WIDTH - p.length; x_pos++) {
            for (let y_pos = 0; y_pos <= TRUCK_HEIGHT - p.width; y_pos++) {
                
                if (isPositionAvailable(x_pos, y_pos, p)) {
                    p.x = x_pos;
                    p.y = y_pos;
                    p.placed = true;
                    p.lastValidX = x_pos;
                    p.lastValidY = y_pos;
                    placed = true;
                    // Romper el bucle interno (y) para priorizar el apilamiento a lo ancho (y)
                    break;
                }
            }
            if (placed) {
                // Si encontramos un lugar, salimos del bucle externo (x) 
                // para que el siguiente palet comience la búsqueda desde (0,0) 
                // y se fuerce a apilarse a la izquierda.
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


// --- Lógica de Arrastrar y Soltar (Drag and Drop) (SIN CAMBIOS) ---

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
    palletDiv.style.zIndex = 1; 

    // Si la nueva posición es válida
    if (isPositionAvailable(currentPallet.x, currentPallet.y, currentPallet)) {
        currentPallet.lastValidX = currentPallet.x;
        currentPallet.lastValidY = currentPallet.y;
        updateLinearMeters();
    } else {
        alert('¡Colisión! Por favor, mueve el palet a un espacio libre.');
        
        // Revierte a la última posición válida
        currentPallet.x = currentPallet.lastValidX; 
        currentPallet.y = currentPallet.lastValidY;
        
        // Forzar al DOM a volver a la posición válida
        palletDiv.style.left = `${currentPallet.x}px`;
        palletDiv.style.top = `${currentPallet.y}px`;
    }

    document.removeEventListener('mousemove', dragMove);
    document.removeEventListener('mouseup', dragEnd);
    document.removeEventListener('touchmove', dragMove);
    document.removeEventListener('touchend', dragEnd);
    currentPallet = null;
}

// Inicializar un render inicial al cargar la página
document.addEventListener('DOMContentLoaded', renderTruck);
