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

    // Nota: La lógica original añadía palets a la lista global 'pallets' en cada llamada.
    // Para evitar que los palets se apilen sin control si el usuario pulsa varias veces,
    // se podría considerar vaciar 'pallets' aquí o añadir una función 'clearPallets()'.
    // Por ahora, seguimos con la lógica de añadir al arreglo existente.

    for (let i = 0; i < palletQuantity; i++) {
        pallets.push({ width: palletWidth, length: palletLength });
    }

    renderTruck();
}

function renderTruck() {
    const truck = document.getElementById('truck');
    truck.innerHTML = '';

    let positions = []; // Lista de posiciones ocupadas
    let maxX = 0; // Para calcular los metros lineales

    pallets.forEach((pallet, index) => {
        let placed = false;
        let x = 0, y = 0;

        // Encuentra un lugar disponible para el pallet
        // Itera sobre las posibles posiciones (x, y)
        findPosition:
        for (let i = 0; i <= truckWidth - pallet.length; i++) {
            for (let j = 0; j <= truckHeight - pallet.width; j++) {
                if (isPositionAvailable(i, j, pallet, positions)) {
                    x = i;
                    y = j;
                    placed = true;
                    break findPosition; // Sale de ambos bucles
                }
            }
        }

        if (!placed) {
            alert(`No caben más palets en el camión. Se han colocado ${index} de ${pallets.length}.`);
            // Se detiene el procesamiento de palets restantes
            pallets.splice(index); // Mantiene solo los palets que sí se colocaron
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
    });

    const totalLinearMeters = maxX / 100; // Convertimos a metros (100px = 1m)
    document.getElementById('result').textContent = `Metros lineales ocupados: ${totalLinearMeters.toFixed(2)} m`;
}

function isPositionAvailable(x, y, pallet, positions) {
    // Comprueba si el nuevo palet colisiona con alguno de los ya colocados
    return !positions.some(pos => 
        x < pos.x + pos.length && // El nuevo palet empieza antes de que termine el palet existente
        x + pallet.length > pos.x && // El nuevo palet termina después de que empiece el palet existente
        y < pos.y + pos.width && // Ídem para el eje Y
        y + pallet.width > pos.y
    );
}
