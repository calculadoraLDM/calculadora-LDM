const TRUCK_WIDTH = 1360; // 13.6m en cm
const TRUCK_HEIGHT = 244; // 2.44m en cm
const COLORS = ['#4a90e2', '#2ecc71', '#f39c12', '#9b59b6', '#e74c3c']; // Paleta simple
let pallets = [];
let nextPalletId = 0;

// Hacemos las funciones accesibles desde el HTML
window.addPallets = addPallets;
window.clearPallets = clearPallets;
window.renderTruck = renderTruck; // Hacemos renderTruck global por si acaso

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
            color: COLORS[nextPalletId % COLORS.length],
            x: 0, 
            y: 0,
            placed: false,
            rotated: false // Nuevo estado para la rotación
        });
    }

    renderTruck();
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

/**
 * Colocación automática con optimización de rotación.
 */
function renderTruck() {
    const truck = document.getElementById('truck');
    
    // 1. Reiniciar la colocación y recolocar todos los palets
    pallets.forEach(p => p.placed = false);

    pallets.forEach(pallet => {
        if (!pallet.placed) {
            // Intenta orientación original (sin rotar)
            let placement = findFit(pallet.width, pallet.length, pallet);
            let rotated = false;

            // Si no cabe, intenta orientación rotada
            if (!placement) {
                placement = findFit(pallet.length, pallet.width, pallet);
                rotated = true;
            }
            
            if (placement) {
                pallet.x = placement.x;
                pallet.y = placement.y;
                pallet.rotated = rotated;
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
        palletDiv.addEventListener('dblclick', () => toggleRotation(pallet.id));
        
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

    // Si puede rotar y cabe en algún lugar (debería ser su posición actual si no hay colisión)
    if (newPos) {
        pallet.rotated = !pallet.rotated;
        pallet.x = newPos.x;
        pallet.y = newPos.y;
        
        // Llamar a renderTruck para aplicar el cambio y recalcular el LDM
        pallet.placed = tempPlaced;
        renderTruck(); 
    } else {
        alert('No se puede rotar aquí. No cabe o choca con otro palet en la nueva orientación.');
    }
    
    // Restaurar el estado de colocación si no se rotó
    pallet.placed = tempPlaced;
}

document.addEventListener('DOMContentLoaded', renderTruck);
