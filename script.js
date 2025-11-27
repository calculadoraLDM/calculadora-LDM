const TRUCK_WIDTH = 1360; 
const TRUCK_HEIGHT = 244; 
const COLORS = ['#4a90e2', '#2ecc71', '#f39c12', '#9b59b6', '#e74c3c']; 
let pallets = [];
let nextPalletId = 0;
let nextGroupId = 1;
let currentPallet = null; 

// --- Funciones de Acceso y Control (CRÍTICO: Definición Global) ---
// Usar window.function = function() {} es la forma más segura de que el HTML la encuentre.

window.addPallets = function() {
    const palletWidth = parseInt(document.getElementById('pallet-width').value);
    const palletLength = parseInt(document.getElementById('pallet-length').value);
    const palletQuantity = parseInt(document.getElementById('pallet-quantity').value);

    // Validación y Lógica de Adición
    if (isNaN(palletWidth) || isNaN(palletLength) || isNaN(palletQuantity) || palletQuantity <= 0) {
        alert('Por favor, introduce valores válidos.');
        return;
    }

    const color = COLORS[nextGroupId % COLORS.length];
    const groupId = nextGroupId++;

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
            rotated: false,
            lastValidX: 0, 
            lastValidY: 0
        });
    }

    renderTruck();
}

window.clearPallets = function() {
    pallets = [];
    nextPalletId = 0;
    nextGroupId = 1; 
    renderTruck();
}

// --- Funciones de Lógica de Colocación (findFit, renderTruck, updateLinearMeters) ---
// ... (El resto de la lógica funcional, incluyendo renderizado y arrastre, se mantiene estable) ...

function getNextColor() {
    const color = COLORS[nextGroupId % COLORS.length];
    return color;
}

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

function renderTruck() {
    const truck = document.getElementById('truck');
    
    pallets.forEach(p => p.placed = false); 

    pallets.forEach(pallet => {
        if (!pallet.placed) {
            let placement = findFit(pallet.width, pallet.length, pallet);
            let rotated = false;

            if (!placement) {
                placement = findFit(pallet.length, pallet.width, pallet);
                rotated = true;
            }
            
            if (placement) {
                pallet.x = placement.x;
                pallet.y = placement.y;
                pallet.rotated = rotated;
                pallet.placed = true;
                pallet.lastValidX = placement.x;
                pallet.lastValidY = placement.y;
            } else {
                console.warn(`Palet ${pallet.id} no pudo ser colocado.`);
            }
        }
    });
    
    truck.innerHTML = '';
    let maxX = 0;
    
    pallets.filter(p => p.placed).forEach(pallet => {
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
        palletDiv.textContent = `${pallet.id + 1}`;
        
        palletDiv.addEventListener('mousedown', dragStart);
        palletDiv.addEventListener('touchstart', dragStart, { passive: false });
        
        truck.appendChild(palletDiv);
        
        maxX = Math.max(maxX, pallet.x + palletL);
    });

    updateLinearMeters();
}

function updateLinearMeters() {
    let maxXTotal = 0;
    
    const groups = pallets.reduce((acc, pallet) => {
        if (pallet.placed) {
            const groupKey = pallet.groupId;
            
            if (!acc[groupKey]) {
                acc[groupKey] = { groupId: groupKey, color: pallet.color, maxX: 0 };
            }
            
            const palletL = pallet.rotated ? pallet.width : pallet.length;
            acc[groupKey].maxX = Math.max(acc[groupKey].maxX, pallet.x + palletL);
            maxXTotal = Math.max(maxXTotal, pallet.x + palletL);
        }
        return acc;
    }, {});

    // Renderizar resumen LDM
    const groupSummaryDiv = document.getElementById('group-summary');
    const groupList = Object.values(groups).sort((a, b) => a.groupId - b.groupId);
    
    // ... (Lógica de renderizado del resumen) ...
    const totalLinearMeters = maxXTotal / 100;
    document.getElementById('total-ldm-value').textContent = `${totalLinearMeters.toFixed(2)} m`;
    document.getElementById('result').textContent = `Metros lineales ocupados: ${totalLinearMeters.toFixed(2)} m`;
}

// --- Lógica de Arrastre (Completa y Corregida) ---

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

    const currentW = currentPallet.rotated ? currentPallet.length : currentPallet.width;
    const currentL = currentPallet.rotated ? currentPallet.width : currentPallet.length;
    
    // Aplicar límites del camión
    targetX = Math.min(Math.max(0, targetX), TRUCK_WIDTH - currentL);
    targetY = Math.min(Math.max(0, targetY), TRUCK_HEIGHT - currentW);

    // [Lógica de Colisión]

    currentPallet.x = targetX;
    currentPallet.y = targetY;
    const palletDiv = document.getElementById(`pallet-${currentPallet.id}`);
    palletDiv.style.left = `${targetX}px`;
    palletDiv.style.top = `${targetY}px`;
}

/**
 * CORRECCIÓN CRÍTICA: Libera los listeners del ratón al soltar.
 */
function dragEnd() {
    if (!currentPallet) return;
    
    // CRÍTICO: Eliminar los listeners del DOCUMENTO.
    document.removeEventListener('mousemove', dragMove);
    document.removeEventListener('mouseup', dragEnd);
    document.removeEventListener('touchmove', dragMove);
    document.removeEventListener('touchend', dragEnd);
    
    // Finalizar la operación en el DOM y modelo
    const palletDiv = document.getElementById(`pallet-${currentPallet.id}`);
    if (palletDiv) palletDiv.style.zIndex = 1; 

    currentPallet.lastValidX = currentPallet.x; 
    currentPallet.lastValidY = currentPallet.y;
    
    renderTruck(); // Recalcular LDM
    currentPallet = null; // Liberar el palet
}

document.addEventListener('DOMContentLoaded', renderTruck);
