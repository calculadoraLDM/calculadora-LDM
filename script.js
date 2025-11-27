const TRUCK_WIDTH = 1360; // 13.6m en cm
const TRUCK_HEIGHT = 244; // 2.44m en cm
const COLORS = ['#4a90e2', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#e74c3c', '#3498db', '#f1c40f', '#95a5a6', '#d35400']; 
let pallets = [];
let nextPalletId = 0;
let nextGroupId = 1; 
let colorIndex = 0;
let currentPallet = null; 

// --- Funciones de Utilidad y Carga (Definidas en window para HTML) ---
// ... [getNextColor, clearPallets, isPositionAvailable, addPallets se mantienen] ...
// (Se asume que estas funciones están definidas como window.function para accesibilidad)

/**
 * **COLOCACIÓN CORRECTA:** Lógica de búsqueda estable (priorizando el apilamiento Y).
 */
function renderTruck() {
    const truck = document.getElementById('truck');
    
    pallets.forEach(p => p.placed = false); 

    pallets.forEach(p => {
        let placed = false;
        
        // --- Lógica de Colocación 2D Next Fit (Prioridad Y) ---
        let bestX = -1;
        let bestY = -1;
        
        // Iteramos sobre todos los espacios posibles para encontrar el mejor lugar
        for (let x_pos = 0; x_pos <= TRUCK_WIDTH - p.length; x_pos++) {
            for (let y_pos = 0; y_pos <= TRUCK_HEIGHT - p.width; y_pos++) {
                
                if (isPositionAvailable(x_pos, y_pos, p)) {
                    // Si encontramos un lugar, lo usamos inmediatamente (First Fit)
                    // Esto asegura la compactación lateral (eje Y)
                    bestX = x_pos;
                    bestY = y_pos;
                    placed = true;
                    break;
                }
            }
            if (placed) {
                break; 
            }
        }
        
        if (placed) {
            p.x = bestX;
            p.y = bestY;
            p.placed = true;
            p.lastValidX = bestX;
            p.lastValidY = bestY;
        } else {
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

// ... [El resto de funciones (updateLinearMeters, dragStart, dragMove, dragEnd) se mantienen estables] ...
