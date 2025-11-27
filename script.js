const TRUCK_WIDTH = 1360; 
const TRUCK_HEIGHT = 244; 
const COLORS = ['#4a90e2', '#2ecc71', '#f39c12', '#9b59b6', '#e74c3c']; 
let pallets = [];
let nextPalletId = 0;
let nextGroupId = 1;
let currentPallet = null; 

// --- Funciones de Acceso y Control (CRÍTICO: Definición para el HTML) ---
window.addPallets = function() {
    const palletWidth = parseInt(document.getElementById('pallet-width').value);
    const palletLength = parseInt(document.getElementById('pallet-length').value);
    const palletQuantity = parseInt(document.getElementById('pallet-quantity').value);

    if (isNaN(palletWidth) || isNaN(palletLength) || isNaN(palletQuantity) || palletQuantity <= 0) {
        alert('Por favor, introduce valores válidos.');
        return;
    }

    const color = COLORS[nextGroupId % COLORS.length];
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

window.clearPallets = function() {
    pallets = [];
    nextPalletId = 0;
    nextGroupId = 1; 
    renderTruck();
}

// ... [Las funciones findFit, renderTruck, updateLinearMeters se mantienen con la lógica correcta de colocación y LDM] ...

// --- El resto de la lógica de renderizado, colocación y arrastre se mantiene. ---

document.addEventListener('DOMContentLoaded', renderTruck);
