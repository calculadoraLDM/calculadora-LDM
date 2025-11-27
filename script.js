// --- Definiciones Globales y Constantes ---
const TRUCK_WIDTH = 1360; // Ancho máximo del camión en cm
const TRUCK_HEIGHT = 244; // Altura máxima del camión en cm
const COLORS = ['#4a90e2', '#2ecc71', '#f39c12', '#9b59b6', '#e74c3c', '#1abc9c', '#3498db', '#f1c40f', '#95a5a6', '#d35400']; 

let pallets = [];       // Array principal de objetos palet
let nextPalletId = 0;   // Contador global de palets
let nextGroupId = 1;    // Contador global para agrupar lotes
let colorIndex = 0;     // Índice para rotar colores de grupo
let currentPallet = null; // Objeto temporal para el arrastre (si se implementa)

// --- Exposición de Funciones al Ámbito Global (CRÍTICO) ---
window.addPallets = addPallets;
window.clearPallets = clearPallets;
window.removeGroupByGroupid = removeGroupByGroupid; // Función de eliminación de lotes

// --- Funciones de Utilidad y Control ---

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

function removeGroupByGroupid(groupIdToRemove) {
    pallets = pallets.filter(p => p.groupId !== groupIdToRemove);
    renderTruck();
}

function addPallets() {
    const palletWidth = parseInt(document.getElementById('pallet-width').value);
    const palletLength = parseInt(document.getElementById('pallet-length').value);
    const palletQuantity = parseInt(document.getElementById('pallet-quantity').value);

    if (isNaN(palletWidth) || isNaN(palletLength) || isNaN(palletQuantity) || palletQuantity <= 0) {
        alert('Por favor, introduce valores válidos y positivos.');
        return;
    }

    // 1. Verificación de límites iniciales
    if (palletWidth > TRUCK_HEIGHT || palletLength > TRUCK_WIDTH) {
         alert(`El palet no cabe. Dimensiones máximas del camión: ${TRUCK_WIDTH}cm x ${TRUCK_HEIGHT}cm.`);
         return;
    }

    // 2. Asignación de grupo y color
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
 * **CRÍTICO:** Verifica si la posición está disponible y si respeta los límites del camión.
 * @param {number} x, y - Coordenadas de prueba
 * @param {object} pallet - Palet a colocar
 * @returns {boolean}
 */
function isPositionAvailable(x, y, pallet) {
    // 1. Verificación CRÍTICA de límites
    if (x < 0 || y < 0 || x + pallet.length > TRUCK_WIDTH || y + pallet.width > TRUCK_HEIGHT) {
        return false;
    }

    // 2. Verificación de solapamiento con otros palets
    return !pallets.some(other => {
        if (!other.placed || other.id === pallet.id) return false;
        
        const otherW = other.width;
        const otherL = other.length;

        // Detección de colisión 2D (Separating Axis Theorem simplificado)
        return (
            x < other.x + otherL &&
            x + pallet.length > other.x &&
            y < other.y + otherW &&
            y + pallet.width > other.y
        );
    });
}

/**
 * **CRÍTICO:** Implementa la lógica First-Fit (Prioriza Y luego X para llenar el ancho).
 * @param {object} currentPallet - El palet que se intenta colocar.
 * @returns {{x: number, y: number} | null}
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

// --- Funciones de Renderizado y Actualización ---

function renderTruck() {
    const truck = document.getElementById('truck');
    
    // 1. Resetear y volver a colocar todos los palets
    pallets.forEach(p => p.placed = false);

    pallets.forEach(pallet => {
        if (!pallet.placed) {
            let placement = findBestFitY(pallet); // Colocación optimizada Y-first

            if (placement) {
                pallet.x = placement.x;
                pallet.y = placement.y;
                pallet.placed = true;
            } else {
                console.warn(`Palet ${pallet.id} no pudo ser colocado.`);
            }
        }
    });
    
    // 2. Renderizar la Visualización en el DOM
    truck.innerHTML = '';
    let maxX = 0;
    
    pallets.filter(p => p.placed).forEach(pallet => {
        const palletW = pallet.width;
        const palletL = pallet.length;
        
        const palletDiv = document.createElement('div');
        palletDiv.className = 'pallet';
        palletDiv.id = `pallet-${pallet.id}`;
        palletDiv.style.backgroundColor = pallet.color; 
        palletDiv.style.width = `${palletL}px`;
        palletDiv.style.height = `${palletW}px`;
        palletDiv.style.left = `${pallet.x}px`;
        palletDiv.style.top = `${pallet.y}px`;
        palletDiv.textContent = `${pallet.groupId}`; 
        
        // Aquí se implementarían los eventos de arrastre si fuera necesario
        // palletDiv.addEventListener('mousedown', dragStart);
        
        truck.appendChild(palletDiv);
        
        maxX = Math.max(maxX, pallet.x + palletL);
    });

    updateLinearMeters(maxX);
}

function updateLinearMeters(maxX) {
    let maxXTotal = maxX;
    
    // 1. Calcular métricas por grupo
    const groups = pallets.reduce((acc, pallet) => {
        if (pallet.placed) {
            const groupKey = pallet.groupId;
            
            if (!acc[groupKey]) {
                acc[groupKey] = { groupId: groupKey, color: pallet.color, maxX: 0 };
            }
            
            const palletL = pallet.length;
            acc[groupKey].maxX = Math.max(acc[groupKey].maxX, pallet.x + palletL);
        }
        return acc;
    }, {});

    // 2. Renderizar resumen LDM
    const groupSummaryDiv = document.getElementById('group-summary');
    const totalLdmValueSpan = document.getElementById('total-ldm-value');
    const resultParagraph = document.getElementById('result');

    const groupList = Object.values(groups).sort((a, b) => a.groupId - b.groupId);
    
    if (groupSummaryDiv) {
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
                        <button onclick="removeGroupByGroupid(${group.groupId})" class="remove-group-btn">🗑️</button>
                    </div>
                `;
            }).join('');
        }
    }
    
    // 3. Actualizar totales
    const totalLinearMeters = maxXTotal / 100;
    
    if (totalLdmValueSpan) totalLdmValueSpan.textContent = `${totalLinearMeters.toFixed(2)} m`;
    if (resultParagraph) resultParagraph.textContent = `Metros lineales ocupados: ${totalLinearMeters.toFixed(2)} m`;
}

document.addEventListener('DOMContentLoaded', renderTruck);
