const TRUCK_WIDTH = 1360; // 13.6m en cm
const TRUCK_HEIGHT = 244; // 2.44m en cm
const COLORS = ['#4a90e2', '#2ecc71', '#f39c12', '#9b59b6', '#e74c3c', '#1abc9c', '#3498db', '#f1c40f', '#95a5a6', '#d35400']; 
let pallets = [];
let nextPalletId = 0;
let nextGroupId = 1; // Variable crítica para los grupos
let colorIndex = 0;

window.addPallets = addPallets;
window.clearPallets = clearPallets;

function getNextColor() {
    // Usamos el colorIndex para rotar los colores
    const color = COLORS[colorIndex % COLORS.length];
    colorIndex++;
    return color;
}

function clearPallets() {
    pallets = [];
    nextPalletId = 0;
    nextGroupId = 1; // Reiniciamos el contador de grupo
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

    const color = getNextColor(); // Obtiene color y avanza el índice
    const groupId = nextGroupId++; // Obtiene ID de grupo y avanza el contador

    for (let i = 0; i < palletQuantity; i++) {
        pallets.push({
            id: nextPalletId++,
            groupId: groupId, // CRÍTICO: Asignación de ID de grupo
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
 * Lógica de búsqueda First-Fit (Prioriza Y luego X para llenar el ancho).
 */
function findFit(pW, pL, currentPallet) {
    // Iteramos sobre Y (ancho) primero, luego X (largo)
    for (let y = 0; y <= TRUCK_HEIGHT - pW; y++) {
        for (let x = 0; x <= TRUCK_WIDTH - pL; x++) {
            
            const isColliding = pallets.some(other => {
                if (!other.placed) return false;
                
                const otherW = other.width;
                const otherL = other.length;

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

function renderTruck() {
    const truck = document.getElementById('truck');
    
    pallets.forEach(p => p.placed = false);

    pallets.forEach(pallet => {
        if (!pallet.placed) {
            let placement = findBestFitY(pallet); // Llamamos a una función de colocación optimizada

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
        palletDiv.style.backgroundColor = pallet.color; // CRÍTICO: Usa el color de grupo
        palletDiv.style.width = `${palletL}px`;
        palletDiv.style.height = `${palletW}px`;
        palletDiv.style.left = `${pallet.x}px`;
        palletDiv.style.top = `${pallet.y}px`;
        palletDiv.textContent = `${pallet.id + 1}`;
        
        truck.appendChild(palletDiv);
        
        maxX = Math.max(maxX, pallet.x + palletL);
    });

    updateLinearMeters();
}

/**
 * CRÍTICO: Colocación First Fit (Optimización Y primero)
 */
function isPositionAvailable(x, y, pallet) {
    if (x < 0 || y < 0 || x + pallet.length > TRUCK_WIDTH || y + pallet.width > TRUCK_HEIGHT) {
        return false;
    }

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

function findBestFitY(currentPallet) {
    // Este algoritmo garantiza que se busque el hueco más a la izquierda (menor X) y más arriba (menor Y)
    for (let x = 0; x <= TRUCK_WIDTH - currentPallet.length; x++) {
        for (let y = 0; y <= TRUCK_HEIGHT - currentPallet.width; y++) {
            if (isPositionAvailable(x, y, currentPallet)) {
                return { x, y };
            }
        }
    }
    return null;
}

/**
 * Calcula LDM por Grupo.
 */
function updateLinearMeters() {
    let maxXTotal = 0;
    
    const groups = pallets.reduce((acc, pallet) => {
        if (pallet.placed) {
            const groupKey = pallet.groupId;
            
            if (!acc[groupKey]) {
                acc[groupKey] = { groupId: groupKey, color: pallet.color, maxX: 0 };
            }
            
            const palletL = pallet.length;
            acc[groupKey].maxX = Math.max(acc[groupKey].maxX, pallet.x + palletL);
            maxXTotal = Math.max(maxXTotal, pallet.x + palletL);
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
    document.getElementById('result').textContent = `Metros lineales ocupados: ${totalLinearMeters.toFixed(2)} m`;
}

document.addEventListener('DOMContentLoaded', renderTruck);
