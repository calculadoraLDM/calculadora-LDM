const TRUCK_WIDTH = 1360; // 13.6m en cm
const TRUCK_HEIGHT = 244; // 2.44m en cm
const COLORS = ['#4a90e2', '#2ecc71', '#f39c12', '#9b59b6', '#e74c3c']; 
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
            color: COLORS[nextPalletId % COLORS.length],
            x: 0, 
            y: 0,
            placed: false
        });
    }

    renderTruck();
}

function findFit(pW, pL, currentPallet) {
    // Implementación First-Fit estable (prioriza izquierda/arriba)
    for (let y = 0; y <= TRUCK_HEIGHT - pW; y++) {
        for (let x = 0; x <= TRUCK_WIDTH - pL; x++) {
            
            const isColliding = pallets.some(other => {
                if (!other.placed) return false;
                
                // Las dimensiones del otro palet
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
    
    // 1. Reiniciar la colocación y recolocar todos los palets
    pallets.forEach(p => p.placed = false);

    pallets.forEach(pallet => {
        if (!pallet.placed) {
            // Colocación simple sin rotación
            let placement = findFit(pallet.width, pallet.length, pallet);
            
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
        palletDiv.id = `pallet-${pallet.id}`;
        
        palletDiv.style.backgroundColor = pallet.color;
        palletDiv.style.width = `${palletL}px`;
        palletDiv.style.height = `${palletW}px`;
        palletDiv.style.left = `${pallet.x}px`;
        palletDiv.style.top = `${pallet.y}px`;
        palletDiv.textContent = `${pallet.id + 1}`;
        
        // Manejador de doble clic (Si quieres la rotación, la añadiremos aquí)
        // palletDiv.addEventListener('dblclick', () => toggleRotation(pallet.id));
        
        truck.appendChild(palletDiv);
        
        maxX = Math.max(maxX, pallet.x + palletL);
    });

    // 3. Actualizar LDM
    const totalLinearMeters = maxX / 100;
    document.getElementById('result').textContent = `Metros lineales ocupados: ${totalLinearMeters.toFixed(2)} m`;
}

document.addEventListener('DOMContentLoaded', renderTruck);
