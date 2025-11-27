const TRUCK_WIDTH = 1360; // 13.6m en cm
const TRUCK_HEIGHT = 244; // 2.44m en cm
// Paleta de colores variados para distinguir grupos
const COLORS = ['#ff7043', '#4caf50', '#2196f3', '#ffeb3b', '#9c27b0', '#00bcd4', '#795548', '#ffc107', '#424242', '#ad1457']; 

let pallets = [];
let nextPalletId = 0;
let nextGroupId = 1; 
let colorIndex = 0;
let currentPallet = null; 

// --- Funciones de Lógica de UI ---

/**
 * **CORRECCIÓN CRÍTICA**
 * Inicializa los listeners del botón de tema al cargar el DOM.
 */
document.addEventListener('DOMContentLoaded', () => {
    renderTruck();
    const toggleButton = document.getElementById('theme-toggle');
    if (toggleButton) {
        toggleButton.addEventListener('click', toggleTheme);
    }
});

/**
 * **ARREGLO DE BOTÓN**
 * Cambia entre modo claro y oscuro.
 */
function toggleTheme() {
    const body = document.body;
    body.classList.toggle('dark-mode');
    
    const isDarkMode = body.classList.contains('dark-mode');
    const toggleButton = document.getElementById('theme-toggle');
    
    if (isDarkMode) {
        toggleButton.textContent = '☀️ Modo Claro';
    } else {
        toggleButton.textContent = '🌙 Modo Oscuro';
    }
}

// ... [Funciones getNextColor, isPositionAvailable, clearPallets, addPallets, renderTruck - Se mantienen] ...

/**
 * Calcula y muestra los Metros Lineales (LDM) ocupados.
 */
function updateLinearMeters() {
    let maxXTotal = 0;
    let placedPalletCount = 0;
    
    const groups = pallets.reduce((acc, pallet) => {
        if (pallet.placed) {
            placedPalletCount++;
            const groupKey = pallet.groupId;
            
            if (!acc[groupKey]) {
                acc[groupKey] = { groupId: groupKey, color: pallet.color, maxX: 0 };
            }
            
            acc[groupKey].maxX = Math.max(acc[groupKey].maxX, pallet.x + pallet.length);
            maxXTotal = Math.max(maxXTotal, pallet.x + pallet.length);
        }
        return acc;
    }, {});

    // **ARREGLO DE CÁLCULO:** Aseguramos que la suma del LDM se actualice en todas las métricas.
    const totalLinearMeters = maxXTotal / 100;
    
    // ... [Lógica de renderizado de #group-summary] ...
    const groupSummaryDiv = document.getElementById('group-summary');
    const groupList = Object.values(groups).sort((a, b) => a.groupId - b.groupId);
    
    if (groupList.length === 0) {
        groupSummaryDiv.innerHTML = '<p class="empty-message">Aún no hay cargas.</p>';
    } else {
        groupSummaryDiv.innerHTML = groupList.map(group => {
            const ldm = (group.maxX / 100).toFixed(2);
            return `
                <div class="group-item">
                    <span>
                        <span class="group-indicator" style="background-color: ${group.color};"></span>
                        Grupo ${group.groupId}
                    </span>
                    <span class="ldm-value">${ldm} m</span>
                </div>
            `;
        }).join('');
    }
    
    // Actualización de métricas
    document.getElementById('total-ldm-value').textContent = `${totalLinearMeters.toFixed(2)} m`;
    document.getElementById('total-pallets-value').textContent = placedPalletCount;
    document.getElementById('result').textContent = `Metros lineales ocupados (LDM Total): ${totalLinearMeters.toFixed(2)} m`;
}


// --- Lógica de Arrastrar y Soltar con Colisión de Tope (CORRECCIÓN CRÍTICA) ---

// ... [Función dragStart se mantiene] ...

function dragMove(e) {
    if (!currentPallet) return;
    
    if (e.type === 'touchmove') e.preventDefault();

    const clientX = e.clientX || e.touches[0].clientX;
    const clientY = e.clientY || e.touches[0].clientY;

    let targetX = clientX - currentPallet.offsetX;
    let targetY = clientY - currentPallet.offsetY;

    // 1. APLICAR LÍMITES DEL CAMIÓN (Inicialmente)
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

            // Resolución de colisiones
            if (Math.abs(deltaX) > Math.abs(deltaY)) {
                if (deltaX > 0) { targetX = otherPallet.x - currentPallet.length; } 
                else { targetX = otherPallet.x + otherPallet.length; }
            } else {
                if (deltaY > 0) { targetY = otherPallet.y - currentPallet.width; } 
                else { targetY = otherPallet.y + otherPallet.width; }
            }
            
            // 3. RE-APLICAR LOS LÍMITES DEL CAMIÓN (CRÍTICO)
            // Esto evita que el palet sea empujado fuera de los bordes del remolque
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

// ... [Función dragEnd se mantiene] ...
