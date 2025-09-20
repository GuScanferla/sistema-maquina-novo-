// Sistema de Gestão de Produção - JavaScript

class DashboardManager {
    constructor() {
        this.currentLayout = '32';
        this.refreshInterval = null;
        this.init();
    }

    init() {
        this.setupLayoutToggle();
        this.setupMachineClicks();
        this.setupModal();
        this.startAutoRefresh();
        this.updateRefreshIndicator();
    }

    setupLayoutToggle() {
        const layoutButtons = document.querySelectorAll('.layout-btn');
        layoutButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const layout = e.target.dataset.layout;
                this.switchLayout(layout);
            });
        });
    }

    switchLayout(layout) {
        this.currentLayout = layout;
        
        // Atualizar botões ativos
        document.querySelectorAll('.layout-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-layout="${layout}"]`).classList.add('active');
        
        // Atualizar grid
        const gridContainer = document.querySelector('.grid-container');
        gridContainer.className = `grid-container grid-${layout}`;
        
        // Carregar máquinas do layout
        this.loadMachines(layout);
    }

    async loadMachines(layout) {
        try {
            const response = await fetch(`../api/machines.php?layout=${layout}`);
            const data = await response.json();
            
            if (data.success) {
                this.renderMachines(data.machines, layout);
            } else {
                console.error('Erro ao carregar máquinas:', data.message);
            }
        } catch (error) {
            console.error('Erro na requisição:', error);
        }
    }

    renderMachines(machines, layout) {
        const gridContainer = document.querySelector('.grid-container');
        
        // Limpar grid atual
        gridContainer.innerHTML = '';
        
        // Renderizar máquinas
        machines.forEach(machine => {
            const machineElement = document.createElement('div');
            machineElement.className = `machine-item ${machine.color_status}`;
            machineElement.dataset.machineId = machine.id;
            machineElement.textContent = machine.name;
            
            gridContainer.appendChild(machineElement);
        });
        
        // Reconfigurar eventos de clique
        this.setupMachineClicks();
    }

    setupMachineClicks() {
        const machineItems = document.querySelectorAll('.machine-item');
        machineItems.forEach(item => {
            item.addEventListener('click', (e) => {
                const machineId = e.target.dataset.machineId;
                this.showMachineModal(machineId);
            });
        });
    }

    async showMachineModal(machineId) {
        try {
            const response = await fetch(`../api/machine_details.php?id=${machineId}`);
            const data = await response.json();
            
            if (data.success) {
                this.populateModal(data.machine, data.order);
                this.openModal();
            } else {
                alert('Erro ao carregar detalhes da máquina');
            }
        } catch (error) {
            console.error('Erro ao carregar detalhes:', error);
            alert('Erro ao carregar detalhes da máquina');
        }
    }

    populateModal(machine, order) {
        document.getElementById('modalMachineName').textContent = machine.name;
        document.getElementById('modalMachineStatus').textContent = this.getStatusText(machine.status);
        document.getElementById('modalMachineStatus').className = `status-badge ${machine.color_status}`;
        
        const orderInfo = document.getElementById('modalOrderInfo');
        if (order) {
            orderInfo.innerHTML = `
                <h4>Ordem de Produção Ativa:</h4>
                <p><strong>Número:</strong> ${order.order_number}</p>
                <p><strong>Produto:</strong> ${order.product_name}</p>
                <p><strong>Quantidade:</strong> ${order.quantity}</p>
                <p><strong>Status:</strong> ${this.getOrderStatusText(order.status)}</p>
                ${order.start_time ? `<p><strong>Início:</strong> ${this.formatDateTime(order.start_time)}</p>` : ''}
                ${order.estimated_duration ? `<p><strong>Duração Estimada:</strong> ${order.estimated_duration} min</p>` : ''}
            `;
        } else {
            orderInfo.innerHTML = '<p>Nenhuma ordem de produção ativa</p>';
        }
        
        // Configurar botões baseado no status e permissões
        this.setupModalButtons(machine, order);
    }

    setupModalButtons(machine, order) {
        const buttonsContainer = document.getElementById('modalButtons');
        buttonsContainer.innerHTML = '';
        
        // Verificar permissões do usuário
        const userType = document.body.dataset.userType;
        
        if (machine.status === 'disponivel' && (userType === 'admin' || userType === 'interno')) {
            const startBtn = document.createElement('button');
            startBtn.className = 'btn btn-success';
            startBtn.textContent = 'Iniciar Produção';
            startBtn.onclick = () => this.showStartProductionForm(machine.id);
            buttonsContainer.appendChild(startBtn);
        }
        
        if (machine.status === 'em_producao' && order && (userType === 'admin' || userType === 'interno')) {
            const finishBtn = document.createElement('button');
            finishBtn.className = 'btn btn-primary';
            finishBtn.textContent = 'Finalizar Produção';
            finishBtn.onclick = () => this.finishProduction(order.id);
            buttonsContainer.appendChild(finishBtn);
        }
        
        if (userType === 'admin') {
            const maintenanceBtn = document.createElement('button');
            maintenanceBtn.className = 'btn btn-danger';
            maintenanceBtn.textContent = machine.status === 'manutencao' ? 'Sair da Manutenção' : 'Colocar em Manutenção';
            maintenanceBtn.onclick = () => this.toggleMaintenance(machine.id, machine.status);
            buttonsContainer.appendChild(maintenanceBtn);
        }
    }

    showStartProductionForm(machineId) {
        const formHtml = `
            <h3>Iniciar Nova Produção</h3>
            <form id="startProductionForm">
                <div class="form-group">
                    <label for="orderNumber">Número da Ordem:</label>
                    <input type="text" id="orderNumber" name="orderNumber" required>
                </div>
                <div class="form-group">
                    <label for="productName">Nome do Produto:</label>
                    <input type="text" id="productName" name="productName" required>
                </div>
                <div class="form-group">
                    <label for="quantity">Quantidade:</label>
                    <input type="number" id="quantity" name="quantity" min="1" required>
                </div>
                <div class="form-group">
                    <label for="estimatedDuration">Duração Estimada (minutos):</label>
                    <input type="number" id="estimatedDuration" name="estimatedDuration" min="1">
                </div>
                <div class="form-group">
                    <label for="notes">Observações:</label>
                    <textarea id="notes" name="notes" rows="3"></textarea>
                </div>
                <button type="submit" class="btn btn-success">Iniciar Produção</button>
                <button type="button" class="btn btn-secondary" onclick="dashboard.closeModal()">Cancelar</button>
            </form>
        `;
        
        document.getElementById('modalOrderInfo').innerHTML = formHtml;
        
        document.getElementById('startProductionForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.startProduction(machineId, new FormData(e.target));
        });
    }

    async startProduction(machineId, formData) {
        try {
            formData.append('machine_id', machineId);
            
            const response = await fetch('../api/start_production.php', {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            if (data.success) {
                alert('Produção iniciada com sucesso!');
                this.closeModal();
                this.refreshMachines();
            } else {
                alert('Erro ao iniciar produção: ' + data.message);
            }
        } catch (error) {
            console.error('Erro ao iniciar produção:', error);
            alert('Erro ao iniciar produção');
        }
    }

    async finishProduction(orderId) {
        if (!confirm('Deseja finalizar esta produção?')) return;
        
        try {
            const response = await fetch('../api/finish_production.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ order_id: orderId })
            });
            
            const data = await response.json();
            
            if (data.success) {
                alert('Produção finalizada com sucesso!');
                this.closeModal();
                this.refreshMachines();
            } else {
                alert('Erro ao finalizar produção: ' + data.message);
            }
        } catch (error) {
            console.error('Erro ao finalizar produção:', error);
            alert('Erro ao finalizar produção');
        }
    }

    async toggleMaintenance(machineId, currentStatus) {
        const action = currentStatus === 'manutencao' ? 'sair' : 'entrar';
        const message = action === 'entrar' ? 
            'Deseja colocar esta máquina em manutenção?' : 
            'Deseja tirar esta máquina da manutenção?';
        
        if (!confirm(message)) return;
        
        try {
            const response = await fetch('../api/toggle_maintenance.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    machine_id: machineId, 
                    action: action 
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                alert(`Máquina ${action === 'entrar' ? 'colocada em' : 'retirada da'} manutenção!`);
                this.closeModal();
                this.refreshMachines();
            } else {
                alert('Erro ao alterar status de manutenção: ' + data.message);
            }
        } catch (error) {
            console.error('Erro ao alterar manutenção:', error);
            alert('Erro ao alterar status de manutenção');
        }
    }

    setupModal() {
        const modal = document.getElementById('machineModal');
        const closeBtn = document.querySelector('.close');
        
        closeBtn.addEventListener('click', () => this.closeModal());
        
        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeModal();
            }
        });
    }

    openModal() {
        document.getElementById('machineModal').style.display = 'block';
    }

    closeModal() {
        document.getElementById('machineModal').style.display = 'none';
    }

    startAutoRefresh() {
        // Refresh a cada 30 segundos
        this.refreshInterval = setInterval(() => {
            this.refreshMachines();
            this.updateRefreshIndicator();
        }, 30000);
    }

    refreshMachines() {
        this.loadMachines(this.currentLayout);
    }

    updateRefreshIndicator() {
        const indicator = document.getElementById('refreshIndicator');
        if (indicator) {
            const now = new Date();
            indicator.textContent = `Última atualização: ${now.toLocaleTimeString()}`;
        }
    }

    getStatusText(status) {
        const statusMap = {
            'disponivel': 'Disponível',
            'em_producao': 'Em Produção',
            'manutencao': 'Manutenção',
            'parada': 'Parada'
        };
        return statusMap[status] || status;
    }

    getOrderStatusText(status) {
        const statusMap = {
            'pendente': 'Pendente',
            'em_producao': 'Em Produção',
            'finalizada': 'Finalizada',
            'cancelada': 'Cancelada'
        };
        return statusMap[status] || status;
    }

    formatDateTime(dateTime) {
        return new Date(dateTime).toLocaleString('pt-BR');
    }
}

// Inicializar dashboard quando a página carregar
let dashboard;
document.addEventListener('DOMContentLoaded', () => {
    dashboard = new DashboardManager();
});

// Função global para fechar modal (usada nos botões)
function closeModal() {
    if (dashboard) {
        dashboard.closeModal();
    }
}