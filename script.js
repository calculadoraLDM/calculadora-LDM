// --- Lógica de Arrastrar y Soltar con Colisión en Movimiento (CORREGIDA) ---

function dragMove(e) {
    if (!currentPallet) return;
    
    if (e.type === 'touchmove') e.preventDefault();

    const clientX = e.clientX || e.touches[0].clientX;
    const clientY = e.clientY || e.touches[0].clientY;

    let targetX = clientX - currentPallet.offsetX;
    let targetY = clientY - currentPallet.offsetY;

    // 1. Aplicar límites del camión (INICIALMENTE)
    targetX = Math.min(Math.max(0, targetX), TRUCK_WIDTH - currentPallet.length);
    targetY = Math.min(Math.max(0, targetY), TRUCK_HEIGHT - currentPallet.width);

    // 2. Comprobar y ajustar la colisión (Sistema de Tope)
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

            if (Math.abs(deltaX) > Math.abs(deltaY)) {
                if (deltaX > 0) { 
                    targetX = otherPallet.x - currentPallet.length; 
                } else { 
                    targetX = otherPallet.x + otherPallet.length; 
                }
            } else {
                if (deltaY > 0) { 
                    targetY = otherPallet.y - currentPallet.width; 
                } else { 
                    targetY = otherPallet.y + otherPallet.width; 
                }
            }
            
            // 3. RE-APLICAR los límites del camión después de resolver la colisión
            // ESTO ES CLAVE para evitar que el ajuste de colisión saque el palet
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

// ... [El resto de script.js se mantiene igual] ...
