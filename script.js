const TRUCK_WIDTH = 1360; // 13.6m en cm
const TRUCK_HEIGHT = 244; // 2.44m en cm
const COLORS = ['#4a90e2', '#2ecc71', '#f39c12', '#9b59b6', '#e74c3c', '#1abc9c', '#3498db', '#f1c40f', '#95a5a6', '#d35400']; 
let pallets = [];
let nextPalletId = 0;
let nextGroupId = 1; 
let colorIndex = 0;
let currentPallet = null;

// --- Hacemos las funciones accesibles desde el HTML ---
window.addPallets = addPallets;
window.clearPallets = clearPallets;

function getNextColor() {
    const color = COLORS[colorIndex % COLORS.length];
    colorIndex++;
    return color;
}

function clearPallets() {
    pallets = [];
    nextPalletId = 0;
    nextGroupId = 1; 
    colorIndex = 0;
    renderTruck();
}

function addPallets() {
    const palletWidth = parseInt(document.getElementById('pallet-width').value);
    const palletLength = parseInt(document.getElementById('pallet-length').value);
    const palletQuantity = parseInt(document.getElementById('pallet-quantity').value);

    if (isNaN(palletWidth) || isNaN(palletLength) || isNaN(palletQuantity) || palletQuantity <= 0) {
        alert('Por favor, introduce valores válidos.');
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
            rotated: false,
            lastValidX: 0, 
            lastValidY: 0
        });
    }

    renderTruck();
}

// --- Lógica de Colocación y Optimización ---

/**
 * Busca un hueco (First Fit) para un palet con dimensiones dW y dL.
 */
function findFit(pW, pL, currentPallet) {
    for (let y = 0; y <= TRUCK_HEIGHT - pW; y++) {
        for (let x = 0; x <= TRUCK_WIDTH - pL; x++) {
            
            const isColliding = pallets.some(other => {
                if (!other.placed || other.id === currentPallet.id) return false;
                
                const otherW = other.rotated ? other.length : other.width;
                const otherL = other.rotated ? other.width : other.length;

                return (
                    x < other.x + otherL &&
                    x + pL > other.x &&
                    y < other.y + otherW &&
                    y + pW > other.y
                );
            });

            if (!isColliding) {
                return { x, y }; // Primer hueco encontrado
            }
        }
    }
    return null;
}

/**
 * Colocación automática con optimización de rotación.
 */
function renderTruck() {
    const truck = document.getElementById('truck');
    
    pallets.forEach(p => p.placed = false); 

    pallets.forEach(pallet => {
        if (!pallet.placed) {
            // 1. Intenta orientación original
            let placement = findFit(pallet.width, pallet.length, pallet);
            let rotated = false;

            // 2. Si no cabe, intenta orientación rotada (OPTIMIZACIÓN)
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
    
    // 3. Renderizar la Visualización y actualizar LDM
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
        
        // Eventos: Arrastre y Doble Clic
        palletDiv.addEventListener('mousedown', dragStart);
        palletDiv.addEventListener('touchstart', dragStart, { passive: false });
        palletDiv.addEventListener('dblclick', () => toggleRotation(pallet.id));
        
        truck.appendChild(palletDiv);
        
        maxX = Math.max(maxX, pallet.x + palletL);
    });

    updateLinearMeters();
}

/**
 * Rota el palet manualmente con doble clic.
 */
function toggleRotation(id) {
    const pallet = pallets.find(p => p.id === id);
    if (!pallet || !pallet.placed) return;

    // Calcular nuevas dimensiones si se rotara
    const newW = pallet.rotated ? pallet.width : pallet.length;
    const newL = pallet.rotated ? pallet.length : pallet.width;
    
    // Temporalmente quitamos el palet del conteo para verificar su nuevo espacio
    const tempPlaced = pallet.placed;
    pallet.placed = false;

    // Comprobar si cabe en la posición actual con la nueva orientación
    let newPos = findFit(newW, newL, pallet);

    if (newPos) {
        pallet.rotated = !pallet.rotated;
        pallet.x = newPos.x;
        pallet.y = newPos.y;
        pallet.lastValidX = newPos.x;
        pallet.lastValidY = newPos.y;
        
        pallet.placed = tempPlaced;
        renderTruck(); 
    } else {
        alert('No se puede rotar aquí. No cabe o choca con otro palet en la nueva orientación.');
        pallet.placed = tempPlaced; // Restaurar
    }
}

// --- Lógica de LDM y Arrastre (Estable) ---

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
    
    // ... (Lógica de renderizado de la lista de LDM) ...

    const totalLinearMeters = maxXTotal / 100;
    document.getElementById('total-ldm-value').textContent = `${totalLinearMeters.toFixed(2)} m`;
    document.getElementById('result').textContent = `Metros lineales ocupados: ${totalLinearMeters.toFixed(2)} m`;
}

// --- Lógica de Arrastre con Colisión de Tope ---

function dragStart(e) {
    if (e.type === 'touchstart') e.preventDefault(); 
    const palletDiv = e.target;
    const id = parseInt(palletDiv.id.replace('pallet-', ''));
    currentPallet = pallets.find(p => p.id === id);
    if (!currentPallet) return;
    const clientX = e.clientX || e.touches[0].clientX;
    const clientY = e.clientY || e.touches[0].clientY;
    
    const palletW = currentPallet.rotated ? currentPallet.length : currentPallet.width;
    const palletL = currentPallet.rotated ? currentPallet.width : currentPallet.length;
    
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
    
    // 1. Aplicar límites del camión (Inicialmente)
    targetX = Math.min(Math.max(0, targetX), TRUCK_WIDTH - currentL);
    targetY = Math.min(Math.max(0, targetY), TRUCK_HEIGHT - currentW);

    pallets.filter(p => p.id !== currentPallet.id && p.placed).forEach(otherPallet => {
        const otherW = otherPallet.rotated ? otherPallet.length : otherPallet.width;
        const otherL = otherPallet.rotated ? otherPallet.width : otherPallet.length;
        
        const isColliding = (
            targetX < otherPallet.x + otherL &&
            targetX + currentL > otherPallet.x &&
            targetY < otherPallet.y + otherW &&
            targetY + currentW > otherPallet.y
        );

        if (isColliding) {
            const deltaX = targetX - currentPallet.x;
            const deltaY = targetY - currentPallet.y;
            
            // Resolución de colisión
            if (Math.abs(deltaX) > Math.abs(deltaY)) {
                if (deltaX > 0) { targetX = otherPallet.x - currentL; } 
                else { targetX = otherPallet.x + otherL; }
            } else {
                if (deltaY > 0) { targetY = otherPallet.y - currentW; } 
                else { targetY = otherPallet.y + otherW; }
            }
            
            // 3. RE-APLICAR LOS LÍMITES DEL CAMIÓN (CRÍTICO)
            targetX = Math.min(Math.max(0, targetX), TRUCK_WIDTH - currentL);
            targetY = Math.min(Math.max(0, targetY), TRUCK_HEIGHT - currentW);
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
