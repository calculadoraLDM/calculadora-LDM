const TRUCK_WIDTH = 1360; // 13.6m en cm
const TRUCK_HEIGHT = 244; // 2.44m en cm
const COLORS = ['#4a90e2', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#e74c3c', '#3498db', '#f1c40f', '#95a5a6', '#d35400']; 
let pallets = [];
let nextPalletId = 0;
let nextGroupId = 1; 
let colorIndex = 0;
let currentPallet = null; 

// --- Funciones de Utilidad y Carga (Definidas en window para HTML) ---
function getNextColor() {
    const color = COLORS[colorIndex % COLORS.length];
    colorIndex++;
    return color;
}

window.clearPallets = function() {
    pallets = [];
    nextPalletId = 0;
    nextGroupId = 1;
    colorIndex = 0;
    renderTruck();
}

window.isPositionAvailable = function(x, y, pallet) {
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

window.addPallets = function() {
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
            lastValidX: 0, 
            lastValidY: 0
        });
    }

    renderTruck();
}

/**
 * **CORRECCIÓN DE COLOCACIÓN:** Lógica de búsqueda estable (priorizando arriba-izquierda).
 */
function renderTruck() {
    const truck = document.getElementById('truck');
    
    pallets.forEach(p => p.placed = false); // Reseteamos la colocación

    pallets.forEach(p => {
        let placed = false;
        
        // Búsqueda estricta: X primero, luego Y. Esto garantiza que se apilen correctamente.
        for (let x_pos = 0; x_pos <= TRUCK_WIDTH - p.length; x_pos++) {
            for (let y_pos = 0; y_pos <= TRUCK_HEIGHT - p.width; y_pos++) {
                
                if (isPositionAvailable(x_pos, y_pos, p)) {
                    p.x = x_pos;
                    p.y = y_pos;
                    p.placed = true;
                    p.lastValidX = x_pos;
                    p.lastValidY = y_pos;
                    placed = true;
                    // Salimos del bucle Y (columna)
                    break; 
                }
            }
            if (placed) {
                // Salimos del bucle X (fila) para mantener la colocación compacta a la izquierda.
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

// ... [El resto de funciones (updateLinearMeters, dragStart, dragMove, dragEnd) se mantienen igual ya que contienen la lógica LDM y de colisión estable] ...

function updateLinearMeters() {
    let maxXTotal = 0;
    
    const groups = pallets.reduce((acc, pallet) => {
        if (pallet.placed) {
            const groupKey = pallet.groupId;
            
            if (!acc[groupKey]) {
                acc[groupKey] = { groupId: groupKey, color: pallet.color, maxX: 0 };
            }
            
            acc[groupKey].maxX = Math.max(acc[groupKey].maxX, pallet.x + pallet.length);
            maxXTotal = Math.max(maxXTotal, pallet.x + pallet.length);
        }
        return acc;
    }, {});

    const groupSummaryDiv = document.getElementById('group-summary');
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
    
    const totalLinearMeters = maxXTotal / 100;
    document.getElementById('total-ldm-value').textContent = `${totalLinearMeters.toFixed(2)} m`;
    document.getElementById('result').textContent = `Metros lineales ocupados (LDM Total): ${totalLinearMeters.toFixed(2)} m`;
}

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
    targetX = Math.min(Math.max(0, targetX), TRUCK_WIDTH - currentPallet.length);
    targetY = Math.min(Math.max(0, targetY), TRUCK_HEIGHT - currentPallet.width);

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
                if (deltaX > 0) { targetX = otherPallet.x - currentPallet.length; } 
                else { targetX = otherPallet.x + otherPallet.length; }
            } else {
                if (deltaY > 0) { targetY = otherPallet.y - currentPallet.width; } 
                else { targetY = otherPallet.y + otherPallet.width; }
            }
            targetX = Math.min(Math.max(0, targetX), TRUCK_WIDTH - currentPallet.length);
            targetY = Math.min(Math.max(0, targetY), TRUCK_HEIGHT - currentPallet.width);
        }
    });
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
    currentPallet.lastValidX = currentPallet.x; 
    currentPallet.lastValidY = currentPallet.y;
    updateLinearMeters(); 
    document.removeEventListener('mousemove', dragMove);
    document.removeEventListener('mouseup', dragEnd);
    document.removeEventListener('touchmove', dragMove);
    document.removeEventListener('touchend', dragEnd);
    currentPallet = null;
}

document.addEventListener('DOMContentLoaded', renderTruck);
