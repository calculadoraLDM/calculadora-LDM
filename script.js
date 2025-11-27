const TRUCK_WIDTH = 1360; // 13.6m en cm
const TRUCK_HEIGHT = 244; // 2.44m en cm
const COLORS = ['#4a90e2', '#2ecc71', '#f39c12', '#9b59b6', '#e74c3c']; // Paleta simple
let pallets = [];
let nextPalletId = 0;

// Hacemos las funciones accesibles desde el HTML
window.addPallets = addPallets;
window.clearPallets = clearPallets;

function clearPallets() {
    pallets = [];
    nextPalletId = 0;
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

    for (let i = 0; i < palletQuantity; i++) {
        pallets.push({
            id: nextPalletId++,
            width: palletWidth,
            length: palletLength,
            color: COLORS[nextPalletId % COLORS.length], // Color simple
            x: 0, 
            y: 0,
            placed: false,
            rotated: false // Nuevo estado para la rotación
        });
    }

    renderTruck();
}

/**
 * Verifica si una posición es válida, permitiendo opcionalmente la rotación.
 * Retorna {x, y, rotated} si encuentra un lugar, o null.
 */
function findBestPosition(pallet) {
    // Intentar orientación original (sin rotar)
    let pos = findFit(pallet.width, pallet.length, pallet);
    if (pos) return { x: pos.x, y: pos.y, rotated: false };

    // Intentar orientación rotada
    pos = findFit(pallet.length, pallet.width, pallet);
    if (pos) return { x: pos.x, y: pos.y, rotated: true };
    
    return null;
}

/**
 * Función de búsqueda de espacio estable (First Fit)
 * @param {number} pW - El ancho del palet a probar
 * @param {number} pL - El largo del palet a probar
 * @param {object} currentPallet - El objeto palet a colocar
 * @returns {{x: number, y: number}|null}
 */
function findFit(pW, pL, currentPallet) {
    // Iteración First-Fit simple y estable (prioriza izquierda/arriba)
    for (let y = 0; y <= TRUCK_HEIGHT - pW; y++) {
        for (let x = 0; x <= TRUCK_WIDTH - pL; x++) {
            
            const isColliding = pallets.some(other => {
                if (!other.placed || other.id === currentPallet.id) return false;
                
                // Las dimensiones del otro palet ya están ajustadas por su estado 'rotated'
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

function renderTruck() {
    const truck = document.getElementById('truck');
    
    // 1. Reiniciar la colocación y recolocar todos los palets
    pallets.forEach(p => p.placed = false);

    pallets.forEach(pallet => {
        if (!pallet.placed) {
            const placement = findBestPosition(pallet);
            
            if (placement) {
                pallet.x = placement.x;
                pallet.y = placement.y;
                pallet.rotated = placement.rotated;
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
        // Dimensiones basadas en el estado de rotación
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
        
        // Manejador de doble clic para la rotación
        palletDiv.addEventListener('dblclick', (e) => toggleRotation(pallet.id, e.target));
        
        truck.appendChild(palletDiv);
        
        maxX = Math.max(maxX, pallet.x + palletL);
    });

    // 3. Actualizar LDM
    const totalLinearMeters = maxX / 100;
    document.getElementById('result').textContent = `Metros lineales ocupados: ${totalLinearMeters.toFixed(2)} m`;
}

/**
 * Permite al usuario rotar un palet con doble clic.
 */
function toggleRotation(id, element) {
    const pallet = pallets.find(p => p.id === id);
    if (!pallet || !pallet.placed) return;

    // Calcular nuevas dimensiones y posición
    const newW = pallet.rotated ? pallet.length : pallet.width; // width -> length
    const newL = pallet.rotated ? pallet.width : pallet.length; // length -> width
    
    // Verificar si la nueva orientación cabe en la posición actual
    // Temporalmente quitamos el palet del conteo
    const tempPlaced = pallet.placed;
    pallet.placed = false;

    // Comprobar colisión en la posición (pallet.x, pallet.y) con las nuevas dimensiones
    let canRotate = findFit(newW, newL, pallet);

    // Si puede rotar y cabe en la posición actual
    if (canRotate) {
        pallet.rotated = !pallet.rotated;
        pallet.x = canRotate.x;
        pallet.y = canRotate.y;
        
        // Actualizar el DOM inmediatamente para una mejor experiencia
        element.style.width = `${newL}px`;
        element.style.height = `${newW}px`;
        element.style.left = `${canRotate.x}px`;
        element.style.top = `${canRotate.y}px`;

        // Llamar a renderTruck para recalcular el LDM
        pallet.placed = tempPlaced;
        renderTruck(); 
    } else {
        alert('No se puede rotar aquí. No cabe o choca con otro palet.');
    }
    
    // Restaurar el estado de colocación si no se rotó
    pallet.placed = tempPlaced;
}

document.addEventListener('DOMContentLoaded', renderTruck);
