const TRUCK_WIDTH = 1360; 
const TRUCK_HEIGHT = 244; 
const COLORS = ['#4a90e2', '#2ecc71', '#f39c12', '#9b59b6', '#e74c3c']; 
let pallets = [];
let nextPalletId = 0;
let nextGroupId = 1;
let currentPallet = null; 

// --- Hacemos las funciones accesibles desde el HTML ---
window.addPallets = addPallets;
window.clearPallets = clearPallets;

// [Funciones getNextColor, clearPallets, addPallets, findFit, renderTruck, updateLinearMeters - Se mantienen estables y correctas]
// ... (omito el código de estas funciones por espacio) ...

// Función findFit (incluye chequeo de rotación)
function findFit(pW, pL, currentPallet) {
    for (let y = 0; y <= TRUCK_HEIGHT - pW; y++) {
        for (let x = 0; x <= TRUCK_WIDTH - pL; x++) {
            const isColliding = pallets.some(other => {
                if (!other.placed || other.id === currentPallet.id) return false;
                const otherW = other.rotated ? other.length : other.width;
                const otherL = other.rotated ? other.width : other.length;
                return (x < other.x + otherL && x + pL > other.x && y < other.y + otherW && y + pW > other.y);
            });
            if (!isColliding) {
                return { x, y };
            }
        }
    }
    return null;
}

// Función renderTruck (incluye lógica de colocación)
function renderTruck() {
    // ... (la lógica completa de renderizado y colocación estable) ...
    
    // 3. Actualizar LDM
    // ...
    // document.getElementById('result').textContent = `Metros lineales ocupados: ${totalLinearMeters.toFixed(2)} m`;
    // ...
}

// --- Lógica de Arrastre (Drag and Drop) ---

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
    
    // Añadir listeners al DOCUMENTO (Necesario para el Drag)
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

    // ... (Lógica de límites y colisión, la misma que la última versión estable) ...
    // Aquí el código es largo, pero la lógica de tope es la correcta.
    
    // Actualizamos la posición en el DOM
    const currentW = currentPallet.rotated ? currentPallet.length : currentPallet.width;
    const currentL = currentPallet.rotated ? currentPallet.width : currentPallet.length;
    
    // Aplicar límites del camión
    targetX = Math.min(Math.max(0, targetX), TRUCK_WIDTH - currentL);
    targetY = Math.min(Math.max(0, targetY), TRUCK_HEIGHT - currentW);

    // [Lógica de Colisión y Ajuste de Posición omitida por espacio]
    
    currentPallet.x = targetX;
    currentPallet.y = targetY;
    const palletDiv = document.getElementById(`pallet-${currentPallet.id}`);
    palletDiv.style.left = `${targetX}px`;
    palletDiv.style.top = `${targetY}px`;
}


/**
 * CORRECCIÓN CRÍTICA: Libera los eventos del ratón al soltar.
 */
function dragEnd() {
    if (!currentPallet) return;
    
    // CRÍTICO: Eliminar los listeners del DOCUMENTO para liberar el ratón.
    document.removeEventListener('mousemove', dragMove);
    document.removeEventListener('mouseup', dragEnd);
    document.removeEventListener('touchmove', dragMove);
    document.removeEventListener('touchend', dragEnd);
    
    // Asegurar que el palet vuelva a su estado normal
    const palletDiv = document.getElementById(`pallet-${currentPallet.id}`);
    if (palletDiv) palletDiv.style.zIndex = 1; 

    // Guardar la posición final y recalcular LDM
    currentPallet.lastValidX = currentPallet.x; 
    currentPallet.lastValidY = currentPallet.y;
    
    renderTruck(); // Recalcular LDM
    currentPallet = null; // Liberar el palet
}

document.addEventListener('DOMContentLoaded', renderTruck);
// ... [El resto de funciones se definen como en el código de la última respuesta funcional]
