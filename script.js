// ... (Todas las constantes y variables globales se mantienen) ...

// **NUEVA FUNCIÓN:** Cambia entre modo claro y oscuro
function toggleTheme() {
    const body = document.body;
    body.classList.toggle('dark-mode');
    
    const isDarkMode = body.classList.contains('dark-mode');
    const toggleButton = document.getElementById('theme-toggle');
    
    // Actualiza el texto del botón
    if (isDarkMode) {
        toggleButton.textContent = '☀️ Modo Claro';
    } else {
        toggleButton.textContent = '🌙 Modo Oscuro';
    }
}

// ... [Funciones getNextColor, clearPallets, addPallets, isPositionAvailable, renderTruck, updateLinearMeters se mantienen iguales] ...


// --- ARREGLO CRÍTICO: Lógica de movimiento y colisión con CORRECCIÓN ESTRICTA de límites ---

function dragMove(e) {
    if (!currentPallet) return;
    
    if (e.type === 'touchmove') e.preventDefault();

    const clientX = e.clientX || e.touches[0].clientX;
    const clientY = e.clientY || e.touches[0].clientY;

    let targetX = clientX - currentPallet.offsetX;
    let targetY = clientY - currentPallet.offsetY;

    // 1. APLICAR LÍMITES DEL CAMIÓN (INICIALMENTE)
    // Esto asegura que el objetivo inicial del cursor esté dentro del camión.
    targetX = Math.min(Math.max(0, targetX), TRUCK_WIDTH - currentPallet.length);
    targetY = Math.min(Math.max(0, targetY), TRUCK_HEIGHT - currentPallet.width);

    // 2. Comprobar y ajustar la colisión (Sistema de Tope Estricto)
    pallets.filter(p => p.id !== currentPallet.id && p.placed).forEach(otherPallet => {
        
        const isColliding = (
            targetX < otherPallet.x + otherPallet.length &&
            targetX + currentPallet.length > otherPallet.x &&
            targetY < otherPallet.y + otherPallet.width &&
            targetY + currentPallet.width > otherPallet.y
        );

        if (isColliding) {
            const deltaX = targetX - currentPallet.x;
            const deltaY = targetY - currentPallet.y;

            // ... (Lógica de resolución de colisiones) ...

            // 3. RE-APLICAR LOS LÍMITES DEL CAMIÓN (CORRECCIÓN CRÍTICA)
            // Después de resolver la colisión con otro palet, debemos verificar nuevamente
            // que la nueva posición no haya empujado al palet fuera del remolque.
            targetX = Math.min(Math.max(0, targetX), TRUCK_WIDTH - currentPallet.length);
            targetY = Math.min(Math.max(0, targetY), TRUCK_HEIGHT - currentPallet.width);
        }
    });

    // 4. Aplicar la posición final
    if (currentPallet.x !== targetX || currentPallet.y !== targetY) {
        currentPallet.x = targetX;
        currentPallet.y = targetY;

        const palletDiv = document.getElementById(`pallet-${currentPallet.id}`);
        palletDiv.style.left = `${targetX}px`;
        palletDiv.style.top = `${targetY}px`;
    }
}

// ... [Funciones dragEnd y Inicialización se mantienen iguales] ...
