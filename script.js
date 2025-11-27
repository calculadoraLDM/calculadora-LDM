const TRUCK_WIDTH = 1360; // 13.6m en cm
const TRUCK_HEIGHT = 244; // 2.44m en cm
const COLORS = ['#4a90e2', '#2ecc71', '#f39c12', '#9b59b6', '#e74c3c']; 
let pallets = [];
let nextPalletId = 0;
let nextGroupId = 1; 
let colorIndex = 0; 

// Hacemos las funciones accesibles desde el HTML
window.addPallets = addPallets;
window.clearPallets = clearPallets;

function getNextColor() {
    const color = COLORS[colorIndex % COLORS.length];
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

    if (palletWidth > TRUCK_HEIGHT || palletLength > TRUCK_WIDTH) {
         alert(`El palet no cabe. Dimensiones máximas del camión: ${TRUCK_WIDTH}cm x ${TRUCK_HEIGHT}cm.`);
         return;
    }

    const color = getNextColor(); 
    const groupId = nextGroupId++; 
    colorIndex++;

    for (let i = 0; i < palletQuantity; i++) {
        pallets.push({
            id: nextPalletId++,
            groupId: groupId,
            width: palletWidth,
            length: palletLength,
            color: color,
            x: 0, 
            y: 0,
            placed: false
        });
    }

    renderTruck();
}

/**
 * CRÍTICO: Verifica la disponibilidad del espacio y los límites.
 */
function isPositionAvailable(x, y, pallet) {
    // 1. VERIFICACIÓN CRÍTICA DE LÍMITES
    if (x < 0 || y < 0 || x + pallet.length > TRUCK_WIDTH || y + pallet.width > TRUCK_HEIGHT) {
        return false;
    }

    // 2. Verificar solapamiento
    return !pallets.some(other => {
        if (!other.placed || other.id === pallet.id) return false;
        
        const otherW = other.width;
        const otherL = other.length;

        return (
            x < other.x + otherL &&
            x + pallet.length > other.x &&
            y < other.y + otherW &&
            y + pallet.width > other.y
        );
    });
}

/**
 * CRÍTICO: Lógica First-Fit (Prioriza Y luego X para llenar el ancho).
 */
function findBestFitY(currentPallet) {
    // Buscamos el hueco más a la izquierda (X) y lo más arriba posible (Y)
    for (let x = 0; x <= TRUCK_WIDTH - currentPallet.length; x++) {
        for (let y = 0; y <= TRUCK_HEIGHT - currentPallet.width; y++) {
            if (isPositionAvailable(x, y, currentPallet)) {
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
            let placement = findBestFitY(pallet);

            if (placement) {
                pallet.x = placement.x;
                pallet.y = placement.y;
                pallet.placed = true;
            } else {
                console.warn(`Palet ${pallet.id} no pudo ser colocado.`);
            }
        }
    });
    
    // 2. Renderizar la Visualización
    truck.innerHTML = '';
    let maxX = 0;
    
    pallets.filter(p => p.placed).forEach(pallet => {
        const palletW = pallet.width;
        const palletL = pallet.length;
        
        const palletDiv = document.createElement('div');
        palletDiv.className = 'pallet';
        palletDiv.style.backgroundColor = pallet.color; 
        palletDiv.style.width = `${palletL}px`;
        palletDiv.style.height = `${palletW}px`;
        palletDiv.style.left = `${pallet.x}px`;
        palletDiv.style.top = `${pallet.y}px`;
        palletDiv.textContent = `${pallet.id}`; 
        
        truck.appendChild(palletDiv);
        
        maxX = Math.max(maxX, pallet.x + palletL);
    });

    // Actualiza LDM (omito la función updateLinearMeters por espacio)
}

document.addEventListener('DOMContentLoaded', renderTruck);
