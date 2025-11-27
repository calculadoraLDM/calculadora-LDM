const truckWidth = 1360; // 13.6m en cm
const truckHeight = 244; // 2.44m en cm
let pallets = [];

function addPallets() {
    const palletWidth = parseInt(document.getElementById('pallet-width').value);
    const palletLength = parseInt(document.getElementById('pallet-length').value);
    const palletQuantity = parseInt(document.getElementById('pallet-quantity').value);

    if (isNaN(palletWidth) || isNaN(palletLength) || isNaN(palletQuantity)) {
        alert('Por favor, introduce valores válidos.');
        return;
    }

    for (let i = 0; i < palletQuantity; i++) {
        pallets.push({ width: palletWidth, length: palletLength });
    }

    renderTruck();
}

function renderTruck() {
    const truck = document.getElementById('truck');
    truck.innerHTML = '';

    let positions = []; // Lista de posiciones ocupadas
    let x = 0, y = 0, maxX = 0, totalLinearMeters = 0;

    pallets.forEach((pallet, index) => {
        let placed = false;

        // Encuentra un lugar disponible para el pallet
        for (let i = 0; i <= truckWidth - pallet.length; i++) {
            for (let j = 0; j <= truckHeight - pallet.width; j++) {
                if (isPositionAvailable(i, j, pallet, positions)) {
                    x = i;
                    y = j;
                    placed = true;
                    break;
                }
            }
            if (placed) break;
        }

        if (!placed) {
            alert('No caben más palets en el camión.');
            return;
        }

        // Guarda la posición del pallet
        positions.push({ x, y, width: pallet.width, length: pallet.length });

        const palletDiv = document.createElement('div');
        palletDiv.className = 'pallet';
        palletDiv.style.width = `${pallet.length}px`;
        palletDiv.style.height = `${pallet.width}px`;
        palletDiv.style.left = `${x}px`;
        palletDiv.style.top = `${y}px`;
        palletDiv.textContent = `${index + 1}`;
        truck.appendChild(palletDiv);

        // Actualiza el cálculo de metros lineales
        maxX = Math.max(maxX, x + pallet.length);
        totalLinearMeters = maxX / 100; // Convertimos a metros
    });

    document.getElementById('result').textContent = `Metros lineales ocupados: ${totalLinearMeters.toFixed(2)} m`;
}

function isPositionAvailable(x, y, pallet, positions) {
    return !positions.some(pos => 
        x < pos.x + pos.length &&
        x + pallet.length > pos.x &&
        y < pos.y + pos.width &&
        y + pallet.width > pos.y
    );
}
