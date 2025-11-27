const TRUCK_WIDTH = 1360; 
const TRUCK_HEIGHT = 244; 
const COLORS = ['#4a90e2', '#2ecc71', '#f39c12', '#9b59b6', '#e74c3c']; 
let pallets = [];
let nextPalletId = 0;
let nextGroupId = 1;
let currentPallet = null; 

// --- Funciones de Acceso y Lógica de Colocación (Mantenidas) ---
// (omito la mayoría de las funciones aquí, ya que son largas y la lógica es la que sabes que funciona)

window.addPallets = function() {
    // ... [código de addPallets] ...
    const palletWidth = parseInt(document.getElementById('pallet-width').value);
    const palletLength = parseInt(document.getElementById('pallet-length').value);
    const palletQuantity = parseInt(document.getElementById('pallet-quantity').value);

    if (isNaN(palletWidth) || isNaN(palletLength) || isNaN(palletQuantity) || palletQuantity <= 0) {
        alert('Por favor, introduce valores válidos.');
        return;
    }

    for (let i = 0; i < palletQuantity; i++) {
        pallets.push({
            id: nextPalletId++,
            groupId: nextGroupId,
            width: palletWidth,
            length: palletLength,
            color: COLORS[nextPalletId % COLORS.length],
            x: 0, 
            y: 0,
            placed: false,
            rotated: false,
            lastValidX: 0, 
            lastValidY: 0
        });
    }
    nextGroupId++;
    renderTruck();
}
window.clearPallets = function() {
    pallets = [];
    nextPalletId = 0;
    nextGroupId = 1;
    renderTruck();
}

// (Incluye las funciones findFit y renderTruck)
// ...

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
    
    // CRÍTICO: Añadir listeners al DOCUMENTO
    document.addEventListener('mousemove', dragMove);
    document.addEventListener('mouseup', dragEnd);
    document.addEventListener('touchmove', dragMove, { passive: false });
    document.addEventListener('touchend', dragEnd);
}

function dragMove(e) {
    // ... (la lógica de dragMove se mantiene igual) ...
    if (!currentPallet) return;
    if (e.type === 'touchmove') e.preventDefault();
    const clientX = e.clientX || e.touches[0].clientX;
    const clientY = e.clientY || e.touches[0].clientY;
    let targetX = clientX - currentPallet.offsetX;
    let targetY = clientY - currentPallet.offsetY;

    const currentW = currentPallet.rotated ? currentPallet.length : currentPallet.width;
    const currentL = currentPallet.rotated ? currentPallet.width : currentPallet.length;
    
    // 1. Aplicar límites del camión (Inicialmente)
    targetX = Math.min(Math.max(0, targetX), TRUCK_WIDTH - currentL);
    targetY = Math.min(Math.max(0, targetY), TRUCK_HEIGHT - currentW);

    // [Lógica de Colisión y Ajuste de Posición omitida por espacio]
    // ...
    
    currentPallet.x = targetX;
    currentPallet.y = targetY;
    const palletDiv = document.getElementById(`pallet-${currentPallet.id}`);
    palletDiv.style.left = `${targetX}px`;
    palletDiv.style.top = `${targetY}px`;
}


/**
 * CORRECCIÓN CRÍTICA FINAL: Libera el control del ratón y finaliza el arrastre.
 */
function dragEnd() {
    if (!currentPallet) return;
    
    // 1. CRÍTICO: Eliminar los listeners del DOCUMENTO.
    document.removeEventListener('mousemove', dragMove);
    document.removeEventListener('mouseup', dragEnd);
    document.removeEventListener('touchmove', dragMove);
    document.removeEventListener('touchend', dragEnd);
    
    // 2. Finalizar la operación en el DOM y modelo
    const palletDiv = document.getElementById(`pallet-${currentPallet.id}`);
    if (palletDiv) palletDiv.style.zIndex = 1; 

    currentPallet.lastValidX = currentPallet.x; 
    currentPallet.lastValidY = currentPallet.y;
    
    renderTruck(); // Recalcular LDM
    currentPallet = null; // ¡Liberar el palet!
}

// ... (Incluir el resto de funciones: findFit, renderTruck, updateLinearMeters) ...
// El código completo debe incluir la definición de todas las funciones necesarias.
