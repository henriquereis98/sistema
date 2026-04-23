// Dados Padrão
const defaultBarbers = [
    { id: 1, name: 'João' },
    { id: 2, name: 'Marcos' },
    { id: 3, name: 'Pedro' }
];

const services = [
    { id: 1, name: 'Corte Social', defaultPrice: 35.00 },
    { id: 2, name: 'Corte Degradê', defaultPrice: 45.00 },
    { id: 3, name: 'Barba Terapia', defaultPrice: 30.00 },
    { id: 4, name: 'Combo (Corte + Barba)', defaultPrice: 70.00 },
    { id: 5, name: 'Sobrancelha', defaultPrice: 15.00 },
    { id: 6, name: 'Pigmentação', defaultPrice: 25.00 }
];

const defaultUsers = [
    { id: 1, username: 'guilherme', password: '123' }
];

// Estado da Aplicação
let barbers = [];
let allServices = [];
let users = [];
let currentUser = null;
let currentReportPeriod = 'today';
let currentFinanceiroPeriod = 'today';
let currentComissoesPeriod = 'today';
let currentComissoesBarber = 'all';
let cashHistory = JSON.parse(localStorage.getItem('barbearia_cash_history')) || [];
let allConsumption = JSON.parse(localStorage.getItem('barbearia_consumption')) || [];

// ---- Helpers de Data ----
function getTodayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDateBR(dateStr) {
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
}

function formatWeekdayBR(dateStr) {
    const [y, m, d] = dateStr.split('-');
    const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    let weekday = date.toLocaleDateString('pt-BR', { weekday: 'long' });
    return weekday.charAt(0).toUpperCase() + weekday.slice(1);
}

function getTodayServices() {
    const today = getTodayKey();
    return allServices.filter(s => s.date === today);
}

function getServicesByDateRange(startDate, endDate) {
    return allServices.filter(s => s.date >= startDate && s.date <= endDate);
}

function getDateNDaysAgo(n) {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getFirstDayOfMonth() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function getDateRange(period, startInput, endInput) {
    const today = getTodayKey();
    switch (period) {
        case 'today': return { start: today, end: today };
        case '7days': return { start: getDateNDaysAgo(6), end: today };
        case '30days': return { start: getDateNDaysAgo(29), end: today };
        case 'month': return { start: getFirstDayOfMonth(), end: today };
        case 'custom': return { start: startInput?.value || today, end: endInput?.value || today };
        default: return { start: today, end: today };
    }
}

// Elementos do DOM - Auth
const loginContainer = document.getElementById('login-container');
const appContainer = document.getElementById('app-container');
const loginForm = document.getElementById('login-form');
const loginUsernameInput = document.getElementById('login-username');
const loginPasswordInput = document.getElementById('login-password');
const loginError = document.getElementById('login-error');
const btnLogout = document.getElementById('btn-logout');
const currentUserAvatar = document.getElementById('current-user-avatar');
const currentUserName = document.getElementById('current-user-name');

// Elementos do DOM - Navegação
const navDashboard = document.getElementById('nav-dashboard');
const navBarbeiros = document.getElementById('nav-barbeiros');
const navFinanceiro = document.getElementById('nav-financeiro');
const navRelatorios = document.getElementById('nav-relatorios');
const navConfig = document.getElementById('nav-config');
const viewDashboard = document.getElementById('view-dashboard');
const viewBarbeiros = document.getElementById('view-barbeiros');
const viewFinanceiro = document.getElementById('view-financeiro');
const viewRelatorios = document.getElementById('view-relatorios');
const viewConfig = document.getElementById('view-configuracoes');
const pageTitle = document.getElementById('page-title');

// Elementos do DOM - Dashboard
const barberSelect = document.getElementById('barber-select');
const serviceSelect = document.getElementById('service-select');
const timeInput = document.getElementById('time-input');
const priceInput = document.getElementById('price-input');
const serviceForm = document.getElementById('service-form');
const scheduleHeader = document.getElementById('schedule-header');
const scheduleBody = document.getElementById('schedule-body');
const paymentMethodSelect = document.getElementById('payment-method');

const currentDateEl = document.getElementById('current-date');

// Elementos do DOM - Barbeiros
const barberForm = document.getElementById('barber-form');
const newBarberName = document.getElementById('new-barber-name');
const barbersListContainer = document.getElementById('barbers-list-container');

// Elementos do DOM - Config
const newUserForm = document.getElementById('new-user-form');
const newSystemUsername = document.getElementById('new-system-username');
const newSystemPassword = document.getElementById('new-system-password');
const usersListContainer = document.getElementById('users-list-container');
const changePasswordForm = document.getElementById('change-password-form');
const changePasswordNew = document.getElementById('change-password-new');

// Elementos do DOM - Relatórios
const rankingContainer = document.getElementById('ranking-container');
const reportHistoryContainer = document.getElementById('report-history-container');
const customDateRange = document.getElementById('custom-date-range');
const dateStartInput = document.getElementById('date-start');
const dateEndInput = document.getElementById('date-end');
const btnApplyFilter = document.getElementById('btn-apply-filter');

// Elementos do DOM - Financeiro
const finTotalRevenue = document.getElementById('fin-total-revenue');
const finTotalServices = document.getElementById('fin-total-services');
const finAvgTicket = document.getElementById('fin-avg-ticket');
const finCustomDateRange = document.getElementById('fin-custom-date-range');
const finDateStartInput = document.getElementById('fin-date-start');
const finBtnApplyFilter = document.getElementById('fin-btn-apply-filter');
const paymentMethodsGrid = document.getElementById('payment-methods-grid');

// Elementos do DOM - Comissões
const navComissoes = document.getElementById('nav-comissoes');
const viewComissoes = document.getElementById('view-comissoes');
const comBarberSelect = document.getElementById('com-barber-select');
const comTotalProduction = document.getElementById('com-total-production');
const comTotalCommission = document.getElementById('com-total-commission');
const comServiceCount = document.getElementById('com-service-count');
const comHistoryContainer = document.getElementById('com-history-container');
const comCustomDateRange = document.getElementById('com-custom-date-range');
const comDateStartInput = document.getElementById('com-date-start');
const comDateEndInput = document.getElementById('com-date-end');
const comBtnApplyFilter = document.getElementById('com-btn-apply-filter');
const comTotalConsumo = document.getElementById('com-total-consumo');
const comNetTotal = document.getElementById('com-net-total');

// Elementos do DOM - Consumo
const navConsumo = document.getElementById('nav-consumo');
const viewConsumo = document.getElementById('view-consumo');
const consumoForm = document.getElementById('consumo-form');
const consumoBarberSelect = document.getElementById('consumo-barber-select');
const consumoProductSelect = document.getElementById('consumo-product-select');
const consumoPriceInput = document.getElementById('consumo-price-input');
const consumoDateInput = document.getElementById('consumo-date-input');
const consumoHistoryList = document.getElementById('consumo-history-list');

// Elementos do DOM - Caixa
const btnCaixa = document.getElementById('btn-caixa');
const modalCaixa = document.getElementById('modal-caixa');
const modalCaixaClose = document.getElementById('modal-caixa-close');
const caixaForm = document.getElementById('caixa-form');
const caixaDateInput = document.getElementById('caixa-date');
const caixaValueInput = document.getElementById('caixa-value');
const caixaObsInput = document.getElementById('caixa-obs');
const caixaStatus = document.getElementById('caixa-status');
const caixaStatusDate = document.getElementById('caixa-status-date');
const caixaStatusObs = document.getElementById('caixa-status-obs');
const caixaValAbertura = document.getElementById('caixa-val-abertura');
const caixaValServicos = document.getElementById('caixa-val-servicos');
const caixaValTotal = document.getElementById('caixa-val-total');
const btnFecharCaixa = document.getElementById('btn-fechar-caixa');
const caixaBadge = document.getElementById('caixa-badge');
const cashHistoryTable = document.getElementById('cash-history-body');
const cashHistoryEmpty = document.getElementById('cash-history-empty');

// Inicialização
function init() {
    loadFromLocalStorage();
    
    // Injeta usuários padrão se vazio
    if (users.length === 0) {
        users = [...defaultUsers];
        saveUsersToStorage();
    }
    
    if (barbers.length === 0) {
        barbers = [...defaultBarbers];
        saveBarbersToStorage();
    }

    checkAuth();
}

// ---- Autenticação ----
function checkAuth() {
    const session = sessionStorage.getItem('barbearia_logged_in');
    if (session) {
        currentUser = JSON.parse(session);
        showApp();
    } else {
        showLogin();
    }
}

function showLogin() {
    appContainer.style.display = 'none';
    loginContainer.style.display = 'flex';
}

function showApp() {
    loginContainer.style.display = 'none';
    appContainer.style.display = 'flex';
    
    // Setup Profile
    currentUserName.textContent = currentUser.username.charAt(0).toUpperCase() + currentUser.username.slice(1);
    currentUserAvatar.textContent = currentUser.username.charAt(0).toUpperCase();

    // Init App Logic
    displayCurrentDate();
    populateSelects();
    updateDashboard();
    setupNavigation();
    setupReportFilters();
    setupFinanceiroFilters();
    setupComissoesFilters();
    setupConsumo();
    setupCaixa();
}

loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const user = loginUsernameInput.value.trim().toLowerCase();
    const pass = loginPasswordInput.value;

    const validUser = users.find(u => u.username.toLowerCase() === user && u.password === pass);
    
    if (validUser) {
        loginError.style.display = 'none';
        sessionStorage.setItem('barbearia_logged_in', JSON.stringify(validUser));
        currentUser = validUser;
        showApp();
    } else {
        loginError.style.display = 'block';
    }
});

btnLogout.addEventListener('click', () => {
    sessionStorage.removeItem('barbearia_logged_in');
    currentUser = null;
    loginUsernameInput.value = '';
    loginPasswordInput.value = '';
    showLogin();
});

function displayCurrentDate() {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const today = new Date();
    let formattedDate = today.toLocaleDateString('pt-BR', options);
    formattedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
    currentDateEl.textContent = formattedDate;
}

// ---- Navegação ----
function setupNavigation() {
    navDashboard.addEventListener('click', (e) => { e.preventDefault(); switchView('dashboard'); });
    navBarbeiros.addEventListener('click', (e) => { e.preventDefault(); switchView('barbeiros'); });
    navFinanceiro.addEventListener('click', (e) => { e.preventDefault(); switchView('financeiro'); });
    if (navComissoes) navComissoes.addEventListener('click', (e) => { e.preventDefault(); switchView('comissoes'); });
    if (navConsumo) navConsumo.addEventListener('click', (e) => { e.preventDefault(); switchView('consumo'); });
    navRelatorios.addEventListener('click', (e) => { e.preventDefault(); switchView('relatorios'); });
    navConfig.addEventListener('click', (e) => { e.preventDefault(); switchView('config'); });
}

function switchView(viewName) {
    navDashboard.classList.remove('active');
    navBarbeiros.classList.remove('active');
    if (navFinanceiro) navFinanceiro.classList.remove('active');
    if (navComissoes) navComissoes.classList.remove('active');
    if (navConsumo) navConsumo.classList.remove('active');
    navRelatorios.classList.remove('active');
    navConfig.classList.remove('active');
    viewDashboard.style.display = 'none';
    viewBarbeiros.style.display = 'none';
    if (viewFinanceiro) viewFinanceiro.style.display = 'none';
    if (viewComissoes) viewComissoes.style.display = 'none';
    if (viewConsumo) viewConsumo.style.display = 'none';
    viewRelatorios.style.display = 'none';
    viewConfig.style.display = 'none';

    if (viewName === 'dashboard') {
        navDashboard.classList.add('active');
        viewDashboard.style.display = 'block';
        pageTitle.textContent = 'Dashboard do Dia';
        updateDashboard();
    } else if (viewName === 'barbeiros') {
        navBarbeiros.classList.add('active');
        viewBarbeiros.style.display = 'block';
        pageTitle.textContent = 'Gerenciar Equipe';
        renderBarbersList();
    } else if (viewName === 'financeiro') {
        if (navFinanceiro) navFinanceiro.classList.add('active');
        if (viewFinanceiro) viewFinanceiro.style.display = 'block';
        pageTitle.textContent = 'Painel Financeiro';
        updateFinanceiro();
    } else if (viewName === 'comissoes') {
        if (navComissoes) navComissoes.classList.add('active');
        if (viewComissoes) viewComissoes.style.display = 'block';
        pageTitle.textContent = 'Controle de Comissões';
        updateComissoes();
    } else if (viewName === 'consumo') {
        if (navConsumo) navConsumo.classList.add('active');
        if (viewConsumo) viewConsumo.style.display = 'block';
        pageTitle.textContent = 'Consumo Interno';
        renderConsumoList();
    } else if (viewName === 'relatorios') {
        navRelatorios.classList.add('active');
        viewRelatorios.style.display = 'block';
        pageTitle.textContent = 'Relatórios';
        updateReports();
    } else if (viewName === 'config') {
        navConfig.classList.add('active');
        viewConfig.style.display = 'block';
        pageTitle.textContent = 'Configurações do Sistema';
        renderUsersList();
    }
}

// ---- Dashboard (Serviços) ----
function populateSelects() {
    const barberOptions = '<option value="" disabled selected>Selecione quem atendeu</option>';
    const comBarberOptions = '<option value="all">Todos os Barbeiros</option>';
    const consumoBarberOptions = '<option value="" disabled selected>Selecione o barbeiro</option>';
    
    barberSelect.innerHTML = barberOptions;
    if (comBarberSelect) comBarberSelect.innerHTML = comBarberOptions;
    if (consumoBarberSelect) consumoBarberSelect.innerHTML = consumoBarberOptions;

    barbers.forEach(barber => {
        const option = document.createElement('option');
        option.value = barber.name;
        option.textContent = barber.name;
        barberSelect.appendChild(option);

        if (comBarberSelect) {
            const comOption = document.createElement('option');
            comOption.value = barber.name;
            comOption.textContent = barber.name;
            comBarberSelect.appendChild(comOption);
        }

        if (consumoBarberSelect) {
            const consOption = document.createElement('option');
            consOption.value = barber.name;
            consOption.textContent = barber.name;
            consumoBarberSelect.appendChild(consOption);
        }
    });

    if(serviceSelect.options.length <= 1) {
        services.forEach(service => {
            const option = document.createElement('option');
            option.value = service.id;
            option.textContent = `${service.name} - R$ ${service.defaultPrice.toFixed(2)}`;
            serviceSelect.appendChild(option);
        });
    }
}

serviceSelect.addEventListener('change', (e) => {
    const selectedId = parseInt(e.target.value);
    const service = services.find(s => s.id === selectedId);
    if (service) { priceInput.value = service.defaultPrice.toFixed(2); }
});

serviceForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const barberName = barberSelect.value;
    const serviceId = parseInt(serviceSelect.value);
    const service = services.find(s => s.id === serviceId);
    const price = parseFloat(priceInput.value);
    const timeValue = timeInput.value;
    const paymentMethod = paymentMethodSelect.value;

    if (!barberName || !service || isNaN(price) || !timeValue || !paymentMethod) {
        alert("Por favor, preencha todos os campos.");
        return;
    }

    const newEntry = {
        id: Date.now(),
        barber: barberName,
        serviceName: service.name,
        price: price,
        time: timeValue,
        paymentMethod: paymentMethod,
        date: getTodayKey()
    };

    allServices.unshift(newEntry);
    saveServicesToStorage();
    updateDashboard();
    if(navFinanceiro && navFinanceiro.classList.contains('active')) updateFinanceiro();
    
    serviceSelect.value = '';
    priceInput.value = '';
    timeInput.value = '';
    paymentMethodSelect.value = '';
});

function updateDashboard() {
    renderDailySchedule();
    updateCaixaStatus();
}

function renderDailySchedule() {
    const todayServices = getTodayServices();
    scheduleHeader.innerHTML = '<th>Horário</th>';
    
    // Create header with barbers
    barbers.forEach(barber => {
        const th = document.createElement('th');
        th.textContent = barber.name;
        scheduleHeader.appendChild(th);
    });

    scheduleBody.innerHTML = '';
    
    // Generate times from 08:00 to 20:00 (every 30 mins)
    const times = [];
    for(let h = 8; h <= 20; h++) {
        const hourStr = h.toString().padStart(2, '0');
        times.push(`${hourStr}:00`);
        if(h < 20) times.push(`${hourStr}:30`);
    }

    times.forEach(time => {
        const tr = document.createElement('tr');
        const tdTime = document.createElement('td');
        tdTime.className = 'time-col';
        tdTime.textContent = time;
        tr.appendChild(tdTime);

        barbers.forEach(barber => {
            const td = document.createElement('td');
            
            // Check if there is a service for this barber at this time
            const existingService = todayServices.find(s => s.barber === barber.name && s.time === time);
            
            if (existingService) {
                td.className = 'slot-occupied';
                td.innerHTML = `${existingService.serviceName}<br><small>R$ ${existingService.price.toFixed(2).replace('.', ',')}</small>`;
                td.title = 'Serviço já registrado';
            } else {
                td.className = 'slot-free';
                td.title = 'Clique para registrar serviço neste horário';
                td.onclick = () => {
                    barberSelect.value = barber.name;
                    timeInput.value = time;
                    serviceSelect.focus();
                };
            }
            tr.appendChild(td);
        });

        scheduleBody.appendChild(tr);
    });
}
// Financeiro
function setupFinanceiroFilters() {
    const chips = document.querySelectorAll('.chip[data-fin-period]');
    chips.forEach(chip => {
        chip.addEventListener('click', () => {
            chips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            currentFinanceiroPeriod = chip.dataset.finPeriod;

            if (currentFinanceiroPeriod === 'custom') {
                finCustomDateRange.style.display = 'flex';
            } else {
                finCustomDateRange.style.display = 'none';
                updateFinanceiro();
            }
        });
    });

    if (finBtnApplyFilter) {
        finBtnApplyFilter.addEventListener('click', () => {
            if (finDateStartInput.value && finDateEndInput.value) {
                updateFinanceiro();
            } else {
                alert('Selecione as datas de início e fim.');
            }
        });
    }
}

function getFinanceiroDateRange() {
    return getDateRange(currentFinanceiroPeriod, finDateStartInput, finDateEndInput);
}

function updateFinanceiro() {
    const { start, end } = getFinanceiroDateRange();
    const filtered = getServicesByDateRange(start, end);
    
    const totalRevenue = filtered.reduce((acc, curr) => acc + curr.price, 0);
    const totalCount = filtered.length;
    const avgTicket = totalCount > 0 ? totalRevenue / totalCount : 0;

    if(finTotalRevenue) finTotalRevenue.textContent = `R$ ${totalRevenue.toFixed(2).replace('.', ',')}`;
    if(finTotalServices) finTotalServices.textContent = totalCount;
    if(finAvgTicket) finAvgTicket.textContent = `R$ ${avgTicket.toFixed(2).replace('.', ',')}`;

    // Resumo por forma de pagamento
    renderPaymentBreakdown(filtered);
}

function renderPaymentBreakdown(servicesList) {
    if (!paymentMethodsGrid) return;
    
    const methods = ['Dinheiro', 'PIX', 'Débito', 'Crédito'];
    const stats = {};
    methods.forEach(m => stats[m] = { revenue: 0, count: 0 });
    
    servicesList.forEach(s => {
        const method = s.paymentMethod;
        if (method && stats[method]) {
            stats[method].revenue += s.price;
            stats[method].count++;
        }
    });
    
    paymentMethodsGrid.innerHTML = '';
    
    Object.entries(stats).forEach(([method, data]) => {
        const card = document.createElement('div');
        card.className = 'payment-stats-card';
        card.innerHTML = `
            <div class="payment-stats-info">
                <span>${method}</span>
                <strong>R$ ${data.revenue.toFixed(2).replace('.', ',')}</strong>
                <small>${data.count} serviço${data.count !== 1 ? 's' : ''}</small>
            </div>
        `;
        paymentMethodsGrid.appendChild(card);
    });
}

// ---- Aba Comissões ----
function setupComissoesFilters() {
    const chips = document.querySelectorAll('.chip[data-com-period]');
    chips.forEach(chip => {
        chip.addEventListener('click', () => {
            chips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            currentComissoesPeriod = chip.dataset.comPeriod;

            if (currentComissoesPeriod === 'custom') {
                comCustomDateRange.style.display = 'flex';
            } else {
                comCustomDateRange.style.display = 'none';
                updateComissoes();
            }
        });
    });

    if (comBarberSelect) {
        comBarberSelect.addEventListener('change', () => {
            currentComissoesBarber = comBarberSelect.value;
            updateComissoes();
        });
    }

    if (comBtnApplyFilter) {
        comBtnApplyFilter.addEventListener('click', () => {
            if (comDateStartInput.value && comDateEndInput.value) {
                updateComissoes();
            } else {
                alert('Selecione as datas de início e fim.');
            }
        });
    }
}

function getComissoesDateRange() {
    return getDateRange(currentComissoesPeriod, comDateStartInput, comDateEndInput);
}

function updateComissoes() {
    const { start, end } = getComissoesDateRange();
    let filteredServices = getServicesByDateRange(start, end);
    let filteredConsumo = getConsumptionByDateRange(start, end);
    
    if (currentComissoesBarber !== 'all') {
        filteredServices = filteredServices.filter(s => s.barber === currentComissoesBarber);
        filteredConsumo = filteredConsumo.filter(c => c.barber === currentComissoesBarber);
    }
    
    const production = filteredServices.reduce((acc, curr) => acc + curr.price, 0);
    const commission = production * 0.5;
    const consumptionTotal = filteredConsumo.reduce((acc, curr) => acc + curr.price, 0);
    const netTotal = commission - consumptionTotal;
    
    if (comTotalProduction) comTotalProduction.textContent = `R$ ${production.toFixed(2).replace('.', ',')}`;
    if (comTotalCommission) comTotalCommission.textContent = `R$ ${commission.toFixed(2).replace('.', ',')}`;
    if (comServiceCount) comServiceCount.textContent = filteredServices.length;
    if (comTotalConsumo) comTotalConsumo.textContent = `R$ ${consumptionTotal.toFixed(2).replace('.', ',')}`;
    if (comNetTotal) comNetTotal.textContent = `R$ ${netTotal.toFixed(2).replace('.', ',')}`;
    
    renderComissoesHistory(filteredServices, filteredConsumo);
}

function getConsumptionByDateRange(start, end) {
    return allConsumption.filter(c => c.date >= start && c.date <= end);
}

function renderComissoesHistory(servicesList, consumptionList = []) {
    if (!comHistoryContainer) return;
    comHistoryContainer.innerHTML = '';

    if (servicesList.length === 0 && consumptionList.length === 0) {
        comHistoryContainer.innerHTML = '<p class="empty-state">Nenhum lançamento encontrado para este filtro.</p>';
        return;
    }

    let html = '';

    if (servicesList.length > 0) {
        html += `
            <h4 style="margin-bottom: 10px; color: var(--text-muted);">Serviços Realizados</h4>
            <table>
                <thead>
                    <tr>
                        <th>Data</th>
                        <th>Horário</th>
                        <th>Barbeiro</th>
                        <th>Serviço</th>
                        <th>Valor</th>
                        <th>Comissão</th>
                    </tr>
                </thead>
                <tbody>
                    ${servicesList.map(s => `
                        <tr>
                            <td>${formatDateBR(s.date)}</td>
                            <td>${s.time || '--'}</td>
                            <td>${s.barber}</td>
                            <td>${s.serviceName}</td>
                            <td>R$ ${s.price.toFixed(2).replace('.', ',')}</td>
                            <td style="color: #27ae60; font-weight: 600;">R$ ${(s.price * 0.5).toFixed(2).replace('.', ',')}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    if (consumptionList.length > 0) {
        html += `
            <h4 style="margin: 25px 0 10px; color: var(--danger-color);">Descontos de Consumo</h4>
            <table>
                <thead>
                    <tr>
                        <th>Data</th>
                        <th>Barbeiro</th>
                        <th>Produto</th>
                        <th>Valor Descontado</th>
                    </tr>
                </thead>
                <tbody>
                    ${consumptionList.map(c => `
                        <tr>
                            <td>${formatDateBR(c.date)}</td>
                            <td>${c.barber}</td>
                            <td>${c.product}</td>
                            <td style="color: var(--danger-color); font-weight: 600;">- R$ ${c.price.toFixed(2).replace('.', ',')}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    comHistoryContainer.innerHTML = html;
}

// ---- Aba Consumo ----
function setupConsumo() {
    if (consumoProductSelect) {
        consumoProductSelect.addEventListener('change', (e) => {
            const selectedOption = e.target.options[e.target.selectedIndex];
            const price = selectedOption.dataset.price;
            if (price) consumoPriceInput.value = price;
        });
    }

    if (consumoForm) {
        consumoForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const barber = consumoBarberSelect.value;
            const product = consumoProductSelect.value;
            const price = parseFloat(consumoPriceInput.value);
            const date = consumoDateInput.value;

            if (!barber || !product || isNaN(price) || !date) {
                alert('Preencha todos os campos.');
                return;
            }

            const newConsumo = {
                id: Date.now(),
                barber,
                product,
                price,
                date
            };

            allConsumption.unshift(newConsumo);
            localStorage.setItem('barbearia_consumption', JSON.stringify(allConsumption));
            
            consumoForm.reset();
            renderConsumoList();
            alert('Consumo registrado com sucesso!');
        });
    }
    
    if (consumoDateInput) consumoDateInput.value = getTodayKey();
}

function renderConsumoList() {
    if (!consumoHistoryList) return;
    consumoHistoryList.innerHTML = '';
    
    const recent = allConsumption.slice(0, 10);
    
    if (recent.length === 0) {
        consumoHistoryList.innerHTML = '<p class="empty-state">Nenhum consumo registrado.</p>';
        return;
    }

    recent.forEach(c => {
        const item = document.createElement('div');
        item.className = 'barber-card';
        item.innerHTML = `
            <div class="barber-info">
                <div class="avatar-small">${c.barber.charAt(0)}</div>
                <div>
                    <h4>${c.barber}</h4>
                    <small>${c.product} - ${formatDateBR(c.date)}</small>
                </div>
            </div>
            <div class="barber-right">
                <div class="barber-stats">
                    <p>R$ ${c.price.toFixed(2).replace('.', ',')}</p>
                </div>
                <button class="btn-delete" onclick="deleteConsumo(${c.id})"><i class="fa-solid fa-trash"></i></button>
            </div>
        `;
        consumoHistoryList.appendChild(item);
    });
}

window.deleteConsumo = function(id) {
    if (confirm('Deseja excluir este lançamento?')) {
        allConsumption = allConsumption.filter(c => c.id !== id);
        localStorage.setItem('barbearia_consumption', JSON.stringify(allConsumption));
        renderConsumoList();
    }
}

// ---- Aba Barbeiros ----
barberForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = newBarberName.value.trim();
    if(name) {
        barbers.push({ id: Date.now(), name: name });
        saveBarbersToStorage();
        newBarberName.value = '';
        renderBarbersList();
        populateSelects();
    }
});

function deleteBarber(id) {
    if(confirm('Remover este barbeiro?')) {
        barbers = barbers.filter(b => b.id !== id);
        saveBarbersToStorage();
        renderBarbersList();
        populateSelects();
    }
}

function renderBarbersList() {
    const todayServices = getTodayServices();
    barbersListContainer.innerHTML = '';
    if (barbers.length === 0) {
        barbersListContainer.innerHTML = '<p class="empty-state">Nenhum barbeiro cadastrado.</p>';
        return;
    }

    barbers.forEach(barber => {
        const barberServices = todayServices.filter(s => s.barber === barber.name);
        const revenue = barberServices.reduce((acc, curr) => acc + curr.price, 0);
        const initial = barber.name.charAt(0).toUpperCase();

        const div = document.createElement('div');
        div.className = 'barber-card';
        div.innerHTML = `
            <div class="barber-info">
                <div class="avatar-small">${initial}</div>
                <h4>${barber.name}</h4>
            </div>
            <div class="barber-right">
                <div class="barber-stats">
                    <p>R$ ${revenue.toFixed(2).replace('.', ',')}</p>
                    <span>${barberServices.length} serviços hoje</span>
                </div>
                <button class="btn-delete" onclick="deleteBarber(${barber.id})" title="Remover"><i class="fa-solid fa-trash"></i></button>
            </div>
        `;
        barbersListContainer.appendChild(div);
    });
}

// ---- Aba Relatórios ----
function setupReportFilters() {
    const chips = document.querySelectorAll('.chip[data-period]');
    chips.forEach(chip => {
        chip.addEventListener('click', () => {
            chips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            currentReportPeriod = chip.dataset.period;

            if (currentReportPeriod === 'custom') {
                customDateRange.style.display = 'flex';
            } else {
                customDateRange.style.display = 'none';
                updateReports();
            }
        });
    });

    btnApplyFilter.addEventListener('click', () => {
        if (dateStartInput.value && dateEndInput.value) {
            updateReports();
        } else {
            alert('Selecione as datas de início e fim.');
        }
    });
}

function getReportDateRange() {
    return getDateRange(currentReportPeriod, dateStartInput, dateEndInput);
}

function updateReports() {
    const { start, end } = getReportDateRange();
    const filtered = getServicesByDateRange(start, end);

    renderRanking(filtered);
    renderCashHistory(start, end);
    renderReportHistory(filtered);
}

function renderCashHistory(start, end) {
    const filteredCash = cashHistory.filter(c => c.date >= start && c.date <= end).sort((a, b) => b.date.localeCompare(a.date));
    cashHistoryTable.innerHTML = '';
    
    if (filteredCash.length === 0) {
        cashHistoryTable.parentElement.style.display = 'none';
        cashHistoryEmpty.style.display = 'block';
        return;
    }

    cashHistoryTable.parentElement.style.display = 'table';
    cashHistoryEmpty.style.display = 'none';

    filteredCash.forEach(c => {
        const tr = document.createElement('tr');
        const statusText = c.status === 'aberto' ? '<span style="color: #27ae60; font-weight: 600;">Aberto</span>' : '<span style="color: #7f8c8d; font-weight: 600;">Fechado</span>';
        const fechamentoText = c.status === 'fechado' ? c.closedAt : '--';
        const finalValue = c.status === 'fechado' ? c.finalValue : (c.openingValue + (c.servicesValue || 0));
        
        // Calculate services if not closed yet
        let servicesTotal = c.servicesValue;
        if (c.status === 'aberto') {
            const todayServices = allServices.filter(s => s.date === c.date);
            servicesTotal = todayServices.reduce((acc, curr) => acc + curr.price, 0);
            finalValue = c.openingValue + servicesTotal;
        }

        tr.innerHTML = `
            <td>${formatDateBR(c.date)}</td>
            <td>${statusText}</td>
            <td>R$ ${c.openingValue.toFixed(2).replace('.', ',')} <br><small class="text-muted">às ${c.openedAt}</small></td>
            <td>R$ ${servicesTotal.toFixed(2).replace('.', ',')}</td>
            <td><strong>R$ ${finalValue.toFixed(2).replace('.', ',')}</strong> <br><small class="text-muted">${c.status === 'fechado' ? 'às ' + c.closedAt : ''}</small></td>
            <td>
                <button class="btn-delete" onclick="deleteCashHistory(${c.id})" title="Excluir Caixa">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        `;
        cashHistoryTable.appendChild(tr);
    });
}

window.deleteCashHistory = function(id) {
    if (confirm('Tem certeza que deseja excluir o histórico deste caixa? Essa ação não pode ser desfeita.')) {
        cashHistory = cashHistory.filter(c => c.id !== id);
        saveCashRegisterToStorage();
        
        // Atualiza a interface
        updateReports();
        updateDashboard();
        updateCaixaButton();
        alert('Histórico de caixa excluído!');
    }
};

function renderRanking(servicesList) {
    rankingContainer.innerHTML = '';

    if (servicesList.length === 0) {
        rankingContainer.innerHTML = '<div class="report-empty"><i class="fa-regular fa-chart-bar"></i><p>Sem dados para o período selecionado.</p></div>';
        return;
    }

    // Agrupar por barbeiro
    const barberMap = {};
    servicesList.forEach(s => {
        if (!barberMap[s.barber]) barberMap[s.barber] = { revenue: 0, count: 0 };
        barberMap[s.barber].revenue += s.price;
        barberMap[s.barber].count++;
    });

    // Ordenar por faturamento (maior primeiro)
    const sorted = Object.entries(barberMap)
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.revenue - a.revenue);

    const maxRevenue = sorted[0]?.revenue || 1;

    sorted.forEach((barber, index) => {
        const pct = (barber.revenue / maxRevenue) * 100;
        const div = document.createElement('div');
        div.className = 'ranking-item';
        div.innerHTML = `
            <div class="ranking-position">${index + 1}º</div>
            <div class="ranking-details">
                <div class="ranking-name">${barber.name}</div>
                <div class="ranking-bar-container">
                    <div class="ranking-bar" style="width: 0%"></div>
                </div>
            </div>
            <div class="ranking-value">
                <p>R$ ${barber.revenue.toFixed(2).replace('.', ',')}</p>
                <span>${barber.count} serviço${barber.count !== 1 ? 's' : ''}</span>
            </div>
        `;
        rankingContainer.appendChild(div);

        // Animar barra após renderizar
        requestAnimationFrame(() => {
            div.querySelector('.ranking-bar').style.width = `${pct}%`;
        });
    });
}

function renderReportHistory(servicesList) {
    reportHistoryContainer.innerHTML = '';

    if (servicesList.length === 0) {
        reportHistoryContainer.innerHTML = '<div class="report-empty"><i class="fa-regular fa-folder-open"></i><p>Nenhum serviço encontrado no período.</p></div>';
        return;
    }

    // Agrupar por data
    const dateMap = {};
    servicesList.forEach(s => {
        const key = s.date || 'sem-data';
        if (!dateMap[key]) dateMap[key] = [];
        dateMap[key].push(s);
    });

    // Ordenar datas (mais recente primeiro)
    const sortedDates = Object.keys(dateMap).sort((a, b) => b.localeCompare(a));

    sortedDates.forEach(dateKey => {
        const entries = dateMap[dateKey];
        const subtotal = entries.reduce((acc, curr) => acc + curr.price, 0);
        const dateLabel = dateKey === 'sem-data' ? 'Data desconhecida' : `${formatWeekdayBR(dateKey)}, ${formatDateBR(dateKey)}`;

        const group = document.createElement('div');
        group.className = 'date-group';

        let tableRows = '';
        entries.forEach(entry => {
            tableRows += `
                <tr>
                    <td>${entry.time || '--'}</td>
                    <td>${entry.barber}</td>
                    <td>${entry.serviceName}</td>
                    <td>${entry.paymentMethod || '--'}</td>
                    <td>R$ ${entry.price.toFixed(2).replace('.', ',')}</td>
                </tr>
            `;
        });

        group.innerHTML = `
            <div class="date-group-header">
                <i class="fa-regular fa-calendar"></i>
                <span>${dateLabel}</span>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>Horário</th>
                        <th>Barbeiro</th>
                        <th>Serviço</th>
                        <th>Pagamento</th>
                        <th>Valor</th>
                    </tr>
                </thead>
                <tbody>${tableRows}</tbody>
            </table>
            <div class="date-group-subtotal">
                ${entries.length} serviço${entries.length !== 1 ? 's' : ''} — Subtotal: <strong>R$ ${subtotal.toFixed(2).replace('.', ',')}</strong>
            </div>
        `;

        reportHistoryContainer.appendChild(group);
    });
}

// ---- Aba Configurações (Usuários) ----
newUserForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const uname = newSystemUsername.value.trim().toLowerCase();
    const upass = newSystemPassword.value;
    
    if (users.find(u => u.username === uname)) {
        alert('Este usuário já existe!');
        return;
    }
    
    users.push({ id: Date.now(), username: uname, password: upass });
    saveUsersToStorage();
    newSystemUsername.value = '';
    newSystemPassword.value = '';
    renderUsersList();
    alert('Usuário criado com sucesso!');
});

function deleteUser(id) {
    const userToDelete = users.find(u => u.id === id);
    if (userToDelete && userToDelete.username === currentUser.username) {
        alert('Você não pode excluir a si mesmo!');
        return;
    }
    
    if(confirm('Tem certeza que deseja remover este acesso?')) {
        users = users.filter(u => u.id !== id);
        saveUsersToStorage();
        renderUsersList();
    }
}

changePasswordForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const newPass = changePasswordNew.value;
    
    const index = users.findIndex(u => u.username === currentUser.username);
    if (index !== -1) {
        users[index].password = newPass;
        saveUsersToStorage();
        currentUser.password = newPass;
        sessionStorage.setItem('barbearia_logged_in', JSON.stringify(currentUser));
        changePasswordNew.value = '';
        alert('Senha redefinida com sucesso!');
    }
});

function renderUsersList() {
    usersListContainer.innerHTML = '';
    users.forEach(user => {
        const isMe = user.username === currentUser.username;
        const initial = user.username.charAt(0).toUpperCase();

        const div = document.createElement('div');
        div.className = 'barber-card';
        div.innerHTML = `
            <div class="barber-info">
                <div class="avatar-small" style="background: #ccc; color: #333;">${initial}</div>
                <h4>${user.username} ${isMe ? '(Você)' : ''}</h4>
            </div>
            <div class="barber-right">
                ${!isMe ? `<button class="btn-delete" onclick="deleteUser(${user.id})" title="Remover Acesso"><i class="fa-solid fa-trash"></i></button>` : ''}
            </div>
        `;
        usersListContainer.appendChild(div);
    });
}

// ---- Local Storage ----
function saveServicesToStorage() { localStorage.setItem('barbearia_ze_services', JSON.stringify(allServices)); }
function saveBarbersToStorage() { localStorage.setItem('barbearia_ze_barbers', JSON.stringify(barbers)); }
function saveUsersToStorage() { localStorage.setItem('barbearia_ze_users', JSON.stringify(users)); }
function saveCashRegisterToStorage() { localStorage.setItem('barbearia_ze_cash_history', JSON.stringify(cashHistory)); }

function loadFromLocalStorage() {
    const savedServices = localStorage.getItem('barbearia_ze_services');
    if (savedServices) {
        try {
            allServices = JSON.parse(savedServices);
            // Migração: adiciona campo date para entradas antigas que não possuem
            const today = getTodayKey();
            allServices = allServices.map(s => {
                if (!s.date) {
                    return { ...s, date: today };
                }
                return s;
            });
            saveServicesToStorage();
        } catch(e) {}
    }

    const savedBarbers = localStorage.getItem('barbearia_ze_barbers');
    if (savedBarbers) { try { barbers = JSON.parse(savedBarbers); } catch(e) {} }
    
    const savedUsers = localStorage.getItem('barbearia_ze_users');
    if (savedUsers) { try { users = JSON.parse(savedUsers); } catch(e) {} }

    const savedCash = localStorage.getItem('barbearia_ze_cash'); // Legacy migration
    const savedCashHistory = localStorage.getItem('barbearia_ze_cash_history');
    
    if (savedCashHistory) {
        try { cashHistory = JSON.parse(savedCashHistory); } catch(e) {}
    } else if (savedCash) {
        // Migrate old object to array
        try { 
            const oldCash = JSON.parse(savedCash); 
            if (oldCash) {
                oldCash.id = Date.now();
                oldCash.status = 'aberto';
                cashHistory.push(oldCash);
                saveCashRegisterToStorage();
                localStorage.removeItem('barbearia_ze_cash');
            }
        } catch(e) {}
    }
}

// ---- Backup (Exportar/Importar) ----
const btnExport = document.getElementById('btn-export');
const btnImport = document.getElementById('btn-import');
const importFileInput = document.getElementById('import-file-input');

btnExport.addEventListener('click', async () => {
    const data = {
        version: 1,
        exportedAt: new Date().toISOString(),
        services: allServices,
        barbers: barbers,
        users: users,
        cashHistory: cashHistory
    };

    const json = JSON.stringify(data, null, 2);
    const today = getTodayKey();
    const fileName = `barbearia_backup_${today}.json`;

    // Tenta usar a API moderna que abre "Salvar como" (escolher pasta)
    if (window.showSaveFilePicker) {
        try {
            const handle = await window.showSaveFilePicker({
                suggestedName: fileName,
                types: [{
                    description: 'Arquivo JSON',
                    accept: { 'application/json': ['.json'] }
                }]
            });
            const writable = await handle.createWritable();
            await writable.write(json);
            await writable.close();
            alert('Backup salvo com sucesso!');
            return;
        } catch (err) {
            // Usuário cancelou o diálogo
            if (err.name === 'AbortError') return;
        }
    }

    // Fallback para navegadores sem suporte
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    alert('Backup exportado! Verifique sua pasta de Downloads.');
});

btnImport.addEventListener('click', () => {
    importFileInput.click();
});

importFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const data = JSON.parse(event.target.result);

            if (!data.services || !data.barbers || !data.users) {
                alert('Arquivo inválido! Não contém os dados esperados.');
                return;
            }

            if (!confirm(`Importar backup de ${data.exportedAt ? new Date(data.exportedAt).toLocaleString('pt-BR') : 'data desconhecida'}?\n\nIsso substituirá TODOS os dados atuais.\n\nServiços: ${data.services.length}\nBarbeiros: ${data.barbers.length}\nUsuários: ${data.users.length}`)) {
                return;
            }

            allServices = data.services;
            barbers = data.barbers;
            users = data.users;
            
            // Suporte para backup antigo e novo
            if (data.cashHistory) {
                cashHistory = data.cashHistory;
            } else if (data.cashRegister) {
                data.cashRegister.id = Date.now();
                data.cashRegister.status = 'aberto';
                cashHistory = [data.cashRegister];
            } else {
                cashHistory = [];
            }

            saveServicesToStorage();
            saveBarbersToStorage();
            saveUsersToStorage();
            saveCashRegisterToStorage();

            // Atualiza tudo na tela
            populateSelects();
            updateDashboard();
            updateCaixaButton();
            renderUsersList();

            alert('Dados importados com sucesso!');
        } catch (err) {
            alert('Erro ao ler o arquivo. Verifique se é um backup válido.');
        }
    };
    reader.readAsText(file);
    importFileInput.value = '';
});

// ---- Limpar Dados Financeiros (Teste) ----
const btnClearFinancial = document.getElementById('btn-clear-financial');

if (btnClearFinancial) {
    btnClearFinancial.addEventListener('click', () => {
        const confirm1 = confirm('ATENÇÃO: Isso apagará todos os serviços registrados e o histórico de caixa.');
        if (!confirm1) return;

        const confirm2 = confirm('TEM CERTEZA? Barbeiros e usuários serão mantidos, mas todo o faturamento será zerado. Esta ação não tem volta.');
        if (!confirm2) return;

        // Limpa arrays
        allServices = [];
        cashHistory = [];

        // Salva estados vazios
        saveServicesToStorage();
        saveCashRegisterToStorage();

        // Atualiza Interface
        updateDashboard();
        updateFinanceiro();
        updateReports();
        updateCaixaButton();

        alert('Dados financeiros resetados com sucesso! O sistema está limpo para novos testes.');
    });
}

// ---- Caixa ----
function setupCaixa() {
    caixaDateInput.value = getTodayKey();

    btnCaixa.addEventListener('click', () => {
        const today = getTodayKey();
        const todayCash = cashHistory.find(c => c.date === today);
        
        if (todayCash) {
            switchView('dashboard');
        } else {
            caixaDateInput.value = getTodayKey();
            caixaValueInput.value = '100.00';
            caixaObsInput.value = '';
            modalCaixa.style.display = 'flex';
        }
    });

    modalCaixaClose.addEventListener('click', () => { modalCaixa.style.display = 'none'; });
    modalCaixa.addEventListener('click', (e) => { if (e.target === modalCaixa) modalCaixa.style.display = 'none'; });

    caixaForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const date = caixaDateInput.value;
        const value = parseFloat(caixaValueInput.value);
        const obs = caixaObsInput.value.trim();

        if (!date || isNaN(value)) {
            alert('Preencha a data e o valor.');
            return;
        }

        const newCash = {
            id: Date.now(),
            date: date,
            openingValue: value,
            observation: obs,
            openedAt: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            status: 'aberto'
        };

        cashHistory.push(newCash);
        saveCashRegisterToStorage();
        modalCaixa.style.display = 'none';
        updateDashboard();
        updateCaixaButton();
        alert('Caixa aberto com sucesso!');
    });

    btnFecharCaixa.addEventListener('click', () => {
        const today = getTodayKey();
        const todayCash = cashHistory.find(c => c.date === today);
        
        if (!todayCash || todayCash.status === 'fechado') return;

        if (confirm('Tem certeza que deseja encerrar o expediente de hoje?\nIsso fechará o caixa e os valores não poderão mais ser alterados.')) {
            const todayServices = getTodayServices();
            const servicesRevenue = todayServices.reduce((acc, curr) => acc + curr.price, 0);
            
            todayCash.status = 'fechado';
            todayCash.closedAt = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            todayCash.servicesValue = servicesRevenue;
            todayCash.finalValue = todayCash.openingValue + servicesRevenue;
            
            saveCashRegisterToStorage();
            updateDashboard();
            updateCaixaButton();
            alert('Expediente encerrado! Caixa fechado.');
        }
    });

    updateCaixaButton();
}

function updateCaixaButton() {
    const today = getTodayKey();
    const todayCash = cashHistory.find(c => c.date === today);
    
    if (todayCash) {
        if (todayCash.status === 'aberto') {
            btnCaixa.classList.add('caixa-aberto');
            btnCaixa.classList.remove('caixa-fechado');
            btnCaixa.innerHTML = '<i class="fa-solid fa-cash-register"></i> Caixa Aberto';
        } else {
            btnCaixa.classList.add('caixa-fechado');
            btnCaixa.classList.remove('caixa-aberto');
            btnCaixa.innerHTML = '<i class="fa-solid fa-lock"></i> Caixa Fechado';
        }
    } else {
        btnCaixa.classList.remove('caixa-aberto', 'caixa-fechado');
        btnCaixa.innerHTML = '<i class="fa-solid fa-cash-register"></i> Abrir Caixa';
    }
}

function updateCaixaStatus() {
    const today = getTodayKey();
    const todayCash = cashHistory.find(c => c.date === today);
    
    if (todayCash) {
        caixaStatus.style.display = 'flex';
        caixaStatusDate.textContent = `Aberto às ${todayCash.openedAt} — ${formatDateBR(todayCash.date)}`;
        caixaStatusObs.textContent = todayCash.observation || '';
        caixaStatusObs.style.display = todayCash.observation ? 'block' : 'none';

        const opening = todayCash.openingValue;
        let servicesRevenue = todayCash.servicesValue;
        let total = todayCash.finalValue;

        if (todayCash.status === 'aberto') {
            const todayServices = getTodayServices();
            servicesRevenue = todayServices.reduce((acc, curr) => acc + curr.price, 0);
            total = opening + servicesRevenue;
            
            caixaBadge.innerHTML = '<i class="fa-solid fa-cash-register"></i> Caixa Aberto';
            caixaBadge.classList.remove('fechado');
            caixaStatus.classList.remove('fechado');
            btnFecharCaixa.style.display = 'block';
        } else {
            caixaBadge.innerHTML = '<i class="fa-solid fa-lock"></i> Caixa Fechado';
            caixaBadge.classList.add('fechado');
            caixaStatus.classList.add('fechado');
            btnFecharCaixa.style.display = 'none';
        }

        caixaValAbertura.textContent = `R$ ${opening.toFixed(2).replace('.', ',')}`;
        caixaValServicos.textContent = `R$ ${servicesRevenue.toFixed(2).replace('.', ',')}`;
        caixaValTotal.textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;
    } else {
        caixaStatus.style.display = 'none';
    }
}

// Iniciar
init();
