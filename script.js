const TRUCK_WIDTH = 1360; // 13.6m en cm
const TRUCK_HEIGHT = 244; // 2.44m en cm
const COLORS = ['#4a90e2', '#2ecc71', '#f39c12', '#9b59b6', '#e74c3c', '#1abc9c', '#3498db', '#f1c40f']; // Expanded color list
let pallets = [];
let nextPalletId = 0;
let nextGroupId = 1; // CRITICAL: Tracks the group ID
let colorIndex = 0; // CRITICAL: Tracks the color index

// Hacemos las funciones accesibles desde el HTML
window.addPallets = addPallets;
window.clearPallets = clearPallets;

function getNextColor() {
    // Gets the color for the current group and ensures rotation
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

    const color = getNextColor(); // Get color before advancing index
    const groupId = nextGroupId++; 
    colorIndex++; // Advance color index only once per batch (CRITICAL for groups)

    for (let i = 0; i < palletQuantity; i++) {
        pallets.push({
            id: nextPalletId++,
            groupId: groupId, // Assign Group ID
            width: palletWidth,
            length: palletLength,
            color: color, // Assign Group Color
            x: 0, 
            y: 0,
            placed: false
        });
    }

    renderTruck();
}

/**
 * Checks for collision and boundary infringement.
 */
function isPositionAvailable(x, y, pW, pL, currentPallet) {
    // Check boundaries
    if (x < 0 || y < 0 || x + pL > TRUCK_WIDTH || y + pW > TRUCK_HEIGHT) {
        return false;
    }

    // Check for overlaps with already placed palets
    return !pallets.some(other => {
        if (!other.placed || other.id === currentPallet.id) return false;
        
        const otherW = other.width;
        const otherL = other.length;

        return (
            x < other.x + otherL &&
            x + pL > other.x &&
            y < other.y + otherW &&
            y + pW > other.y
        );
    });
}


/**
 * CRITICAL FIX: Finds the next available position, prioritizing Y (width) before X (length).
 */
function findFit(pW, pL, currentPallet) {
    // Iterates X (length) on the outer loop to ensure we check all possibilities to the right
    for (let x = 0; x <= TRUCK_WIDTH - pL; x++) {
        // Iterates Y (width) on the inner loop to fill the truck's width first
        for (let y = 0; y <= TRUCK_HEIGHT - pW; y++) {
            if (isPositionAvailable(x, y, pW, pL, currentPallet)) {
                return { x, y }; // Found the highest and left-most spot
            }
        }
    }
    return null;
}

function renderTruck() {
    const truck = document.getElementById('truck');
    
    // Reset placement status for all palets
    pallets.forEach(p => p.placed = false);

    pallets.forEach(pallet => {
        if (!pallet.placed) {
            // Placement logic
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
    
    // 2. Render and Calculate LDM
    truck.innerHTML = '';
    let maxX = 0;
    
    pallets.filter(p => p.placed).forEach(pallet => {
        const palletW = pallet.width;
        const palletL = pallet.length;
        
        const palletDiv = document.createElement('div');
        palletDiv.className = 'pallet';
        palletDiv.style.backgroundColor = pallet.color; // CRITICAL: Uses the correct group color
        palletDiv.style.width = `${palletL}px`;
        palletDiv.style.height = `${palletW}px`;
        palletDiv.style.left = `${pallet.x}px`;
        palletDiv.style.top = `${pallet.y}px`;
        palletDiv.textContent = `${pallet.groupId}`; // Shows Group ID for verification
        
        truck.appendChild(palletDiv);
        
        maxX = Math.max(maxX, pallet.x + palletL);
    });

    // Final LDM Update
    const totalLinearMeters = maxX / 100;
    document.getElementById('result').textContent = `Metros lineales ocupados: ${totalLinearMeters.toFixed(2)} m`;
    
    // Placeholder for Group Summary (requires update to the HTML structure for visualization)
    console.log('LDM Total (cm):', maxX);
}

document.addEventListener('DOMContentLoaded', renderTruck);
