import { createClient } from '@supabase/supabase-js';
import Chart from 'chart.js/auto';

// Configuração Supabase via Variáveis de Ambiente (Vite)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
let supabaseClient = null;
let currentTenantId = null;
let currentUser = null;

// Inicializa o Supabase
function initSupabase() {
    try {
        supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
            auth: {
                persistSession: true,
                storage: window.sessionStorage
            }
        });
        return true;
    } catch (e) {
        console.error('Erro ao inicializar Supabase:', e);
        return false;
    }
}


// Dados Padrão (Serão substituídos por dados do banco)
const defaultBarbers = [
    { id: 1, name: 'João' },
    { id: 2, name: 'Marcos' },
    { id: 3, name: 'Pedro' }
];

let services = [];


async function saveServiceConfigsToStorage() {
    // Agora salvamos no Supabase
    if (!currentTenantId) return;
    // Lógica será implementada nas funções específicas de insert/update
}


// Estado da Aplicação
let barbers = [];
let allServices = [];
let users = [];
let currentReportPeriod = 'today';
let currentRelCaixaPeriod = 'today';
let currentRelServicosPeriod = 'today';
let currentFinanceiroPeriod = 'today';
let currentComissoesPeriod = 'today';
let currentComissoesBarber = 'all';
let cashHistory = [];
let allConsumption = [];
let inventory = [];
let productSales = [];
let currentVendasPeriod = 'today';
let currentVendasHistoryPeriod = 'today';
let currentPerfPeriod = '7days';
let currentFatPeriod = 'today';
let currentFatType = 'total';
let dashboardChart = null;
let performanceReportChart = null;
let selectedServicesForNewEntry = [];
let caixaValuesVisible = false;
let cashReleasePassword = '1204'; // Valor padrão que será atualizado pelo banco
let relatoriosUnlocked = false; // Controla o acesso à aba de Relatórios
let financeiroUnlocked = false; // Controla o acesso à aba de Financeiro

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

// ---- Utilitários de UI (Toasts e Modais) ----
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'fa-info-circle';
    if (type === 'success') icon = 'fa-check-circle';
    if (type === 'error') icon = 'fa-exclamation-circle';

    toast.innerHTML = `
        <i class="fa-solid ${icon}"></i>
        <span>${message}</span>
    `;

    container.appendChild(toast);

    // Auto-remove após 4 segundos
    const timeout = setTimeout(() => {
        toast.classList.add('fade-out');
        toast.addEventListener('animationend', () => toast.remove());
    }, 4000);

    // Clique para remover
    toast.onclick = () => {
        clearTimeout(timeout);
        toast.classList.add('fade-out');
        toast.addEventListener('animationend', () => toast.remove());
    };
}

let btnConfirmOk = document.getElementById('modal-confirm-ok');
let btnConfirmCancel = document.getElementById('modal-confirm-cancel');

function showConfirm(title, message, onConfirm, onCancel = null) {
    const modal = document.getElementById('modal-confirm');
    const titleEl = document.getElementById('modal-confirm-title');
    const messageEl = document.getElementById('modal-confirm-message');

    if (!modal || !titleEl || !messageEl) return;

    titleEl.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> ${title}`;
    messageEl.textContent = message;

    // Remove listeners antigos clonando os botões
    const newOk = btnConfirmOk.cloneNode(true);
    const newCancel = btnConfirmCancel.cloneNode(true);
    btnConfirmOk.parentNode.replaceChild(newOk, btnConfirmOk);
    btnConfirmCancel.parentNode.replaceChild(newCancel, btnConfirmCancel);
    
    btnConfirmOk = newOk;
    btnConfirmCancel = newCancel;

    btnConfirmOk.onclick = () => {
        modal.style.display = 'none';
        modal.classList.remove('active');
        if (onConfirm) onConfirm();
    };

    btnConfirmCancel.onclick = () => {
        modal.style.display = 'none';
        modal.classList.remove('active');
        if (onCancel) onCancel();
    };

    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('active'), 10);
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
const navFinanceiro = document.getElementById('nav-financeiro');
const navConfig = document.getElementById('nav-config');
const navRelCaixa = document.getElementById('nav-rel-caixa');
const navRelServicos = document.getElementById('nav-rel-servicos');
const navGestaoBarbeiros = document.getElementById('nav-gestao-barbeiros');
const navGestaoServicos = document.getElementById('nav-gestao-servicos');
const navGestaoUsuarios = document.getElementById('nav-gestao-usuarios');
const navRelDesempenho = document.getElementById('nav-rel-desempenho');
const navRelFaturamento = document.getElementById('nav-rel-faturamento');

const navRelatoriosParent = document.getElementById('nav-relatorios-parent');
const navVendasParent = document.getElementById('nav-vendas-parent');
const navGestaoParent = document.getElementById('nav-gestao-parent');

const viewDashboard = document.getElementById('view-dashboard');
const viewFinanceiro = document.getElementById('view-financeiro');
const viewConfig = document.getElementById('view-configuracoes');
const viewRelCaixa = document.getElementById('view-rel-caixa');
const viewRelServicos = document.getElementById('view-rel-servicos');
const viewGestaoBarbeiros = document.getElementById('view-gestao-barbeiros');

// Novos elementos para liberação de caixa
const btnToggleCaixaValues = document.getElementById('btn-toggle-caixa-values');
const modalLiberarCaixa = document.getElementById('modal-liberar-caixa');
const modalLiberarCaixaClose = document.getElementById('modal-liberar-caixa-close');
const formLiberarCaixa = document.getElementById('form-liberar-caixa');
const inputUnlockPassword = document.getElementById('caixa-unlock-password');
const viewGestaoServicos = document.getElementById('view-gestao-servicos');
const viewGestaoUsuarios = document.getElementById('view-gestao-usuarios');
const viewRelDesempenho = document.getElementById('view-rel-desempenho');
const viewRelFaturamento = document.getElementById('view-rel-faturamento');
const navEstoque = document.getElementById('nav-estoque');
const viewEstoque = document.getElementById('view-estoque');

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
const currentTimeEl = document.getElementById('current-time');

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

// Elementos do DOM - Relatório Caixa
const customDateRangeCaixa = document.getElementById('custom-date-range-caixa');
const dateStartInputCaixa = document.getElementById('date-start-caixa');
const dateEndInputCaixa = document.getElementById('date-end-caixa');
const btnApplyFilterCaixa = document.getElementById('btn-apply-filter-caixa');
const cashHistoryTable = document.getElementById('cash-history-table');
const cashHistoryBody = document.getElementById('cash-history-body');
const cashHistoryEmpty = document.getElementById('cash-history-empty');

// Elementos do DOM - Relatório Serviços
const customDateRangeServicos = document.getElementById('custom-date-range-servicos');
const dateStartInputServicos = document.getElementById('date-start-servicos');
const dateEndInputServicos = document.getElementById('date-end-servicos');
const btnApplyFilterServicos = document.getElementById('btn-apply-filter-servicos');
const reportHistoryContainer = document.getElementById('report-history-container');

// Elementos do DOM - Financeiro
const finTotalRevenue = document.getElementById('fin-total-revenue');
const finTotalServices = document.getElementById('fin-total-services');
const finAvgTicket = document.getElementById('fin-avg-ticket');
const finCustomDateRange = document.getElementById('fin-custom-date-range');
const finDateStartInput = document.getElementById('fin-date-start');
const finDateEndInput = document.getElementById('fin-date-end');
const finBtnApplyFilter = document.getElementById('fin-btn-apply-filter');
const paymentMethodsGrid = document.getElementById('payment-methods-grid');

// Elementos do DOM - Comissões
const navComissoes = document.getElementById('nav-comissoes');
const navVendasHistory = document.getElementById('nav-vendas-history');
const viewComissoes = document.getElementById('view-comissoes');
const viewVendasHistory = document.getElementById('view-vendas-history');
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

// Elementos do DOM - Nova Venda (Modal)
const btnVendaFlutuante = document.getElementById('btn-venda-flutuante');
const modalNovaVenda = document.getElementById('modal-nova-venda');
const modalNovaVendaClose = document.getElementById('modal-nova-venda-close');
const modalSaleForm = document.getElementById('modal-sale-form');
const modalSaleProductSelect = document.getElementById('modal-sale-product-select');

// Inicialização
async function init() {
    console.log('Iniciando sistema...');
    if (!initSupabase()) {
        showToast('Erro ao conectar com o servidor. Verifique sua conexão.', 'error');
        return;
    }

    // Vincula o evento de login apenas após o Supabase estar pronto
    setupLoginListener();

    await checkAuth();
}

function setupLoginListener() {
    const loginForm = document.getElementById('login-form');
    if (!loginForm) return;

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('Tentativa de login iniciada...');

        const email = document.getElementById('login-username').value;
        const pass = document.getElementById('login-password').value;

        if (!supabaseClient) {
            showToast('Erro: Conexão com o banco não inicializada.', 'error');
            return;
        }

        try {
            console.log('Chamando Supabase Auth...');
            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email: email,
                password: pass,
            });

            if (error) {
                console.error('Erro de autenticação:', error.message);
                showToast('Erro ao entrar: ' + error.message, 'error');
                return;
            }

            if (data.user) {
                console.log('Login Auth sucesso, buscando perfil...');
                const { data: profile, error: profileError } = await supabaseClient
                    .from('profiles')
                    .select('*')
                    .eq('id', data.user.id)
                    .single();

                if (!profileError && profile) {
                    console.log('Perfil carregado:', profile.name);
                    currentUser = {
                        ...profile,
                        id: data.user.id,
                        email: data.user.email,
                        username: profile.name
                    };
                    currentTenantId = profile.tenant_id;

                    // Busca a senha de liberação do banco
                    await fetchCashReleasePassword();

                    // Mostra o loading ao logar
                    showInitialLoading();

                    // Pequeno delay para o usuário ver o "Carregando" antes de entrar
                    setTimeout(() => {
                        showApp();
                        hideInitialLoading(500); // Esconde após o app estar pronto
                    }, 2000);
                } else {
                    console.error('Erro de perfil:', profileError);
                    showToast('Usuário autenticado, mas perfil não encontrado.', 'error');
                }
            }
        } catch (err) {
            console.error('Erro fatal no login:', err);
            showToast('Erro crítico: ' + err.message, 'error');
        }
    });
}


// ---- Autenticação ----
async function checkAuth() {
    const { data: { session } } = await supabaseClient.auth.getSession();

    if (session) {
        // Busca o perfil para identificar a barbearia (tenant_id)
        const { data: profile } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

        if (profile) {
            currentUser = {
                ...profile,
                id: session.user.id,
                email: session.user.email,
                username: profile.name
            };
            currentTenantId = profile.tenant_id;

            // Busca a senha de liberação do banco
            await fetchCashReleasePassword();

            showApp();
        } else {
            showLogin();
        }
    } else {
        showLogin();
    }
}

async function fetchCashReleasePassword() {
    if (!supabaseClient || !currentTenantId) return;
    try {
        const { data, error } = await supabaseClient
            .from('tenants')
            .select('cash_release_password')
            .eq('id', currentTenantId)
            .single();

        if (!error && data) {
            cashReleasePassword = data.cash_release_password;
            console.log('Senha de liberação carregada com sucesso.');
        }
    } catch (err) {
        console.error('Erro ao buscar senha de liberação:', err);
    }
}

function showInitialLoading() {
    const loader = document.getElementById('initial-loading');
    if (loader) {
        loader.style.display = 'flex';
        loader.style.opacity = '1';
    }
}

function hideInitialLoading(delay = 0) {
    setTimeout(() => {
        const loader = document.getElementById('initial-loading');
        if (loader) {
            loader.style.opacity = '0';
            setTimeout(() => {
                loader.style.display = 'none';
            }, 500);
        }
    }, delay);
}

function showLogin() {
    appContainer.style.display = 'none';
    loginContainer.style.display = 'flex';
}

async function loadSupabaseData() {
    if (!currentTenantId) return;

    try {
        const [
            { data: barbersData },
            { data: servicesData },
            { data: inventoryData },
            { data: appointmentsData },
            { data: salesData },
            { data: cashData },
            { data: consumptionData }
        ] = await Promise.all([
            supabaseClient.from('barbers').select('*').eq('tenant_id', currentTenantId),
            supabaseClient.from('services').select('*').eq('tenant_id', currentTenantId),
            supabaseClient.from('inventory').select('*').eq('tenant_id', currentTenantId),
            supabaseClient.from('appointments').select('*').eq('tenant_id', currentTenantId),
            supabaseClient.from('product_sales').select('*').eq('tenant_id', currentTenantId),
            supabaseClient.from('cash_history').select('*').eq('tenant_id', currentTenantId),
            supabaseClient.from('consumption').select('*').eq('tenant_id', currentTenantId)
        ]);

        barbers = barbersData || [];
        // Mapeia de 'price' no banco para 'defaultPrice' no JS
        services = (servicesData || []).map(s => ({
            id: s.id,
            name: s.name,
            defaultPrice: s.price
        }));
        inventory = (inventoryData || []).map(i => ({
            id: i.id,
            name: i.name,
            price: i.price,
            stock: i.stock // Usando 'stock' para bater com o renderInventory
        }));
        // Mapeia campos do banco para o formato esperado pelo JS
        allServices = (appointmentsData || []).map(s => ({
            id: s.id,
            barber: s.barber_name, // O JS usa 'barber' ou 'barberName'
            barberName: s.barber_name,
            serviceName: s.service_name,
            price: s.price,
            time: s.time,
            paymentMethod: s.payment_method,
            date: s.date,
            status: s.status
        }));
        productSales = (salesData || []).map(s => ({
            id: s.id,
            productName: s.product_name,
            quantity: s.quantity,
            price: s.price,
            paymentMethod: s.payment_method,
            date: s.date
        }));
        cashHistory = (cashData || []).map(c => ({
            id: c.id,
            date: c.date,
            initialValue: c.initial_value,
            finalValue: c.final_value,
            servicesValue: c.services_value,
            status: c.status,
            openedAt: c.opened_at,
            closedAt: c.closed_at,
            obs: c.obs
        }));
        allConsumption = (consumptionData || []).map(c => ({
            id: c.id,
            barber: c.barber_name,
            barberName: c.barber_name,
            productId: c.product_id,
            productName: c.product_name,
            price: c.price,
            date: c.date
        }));
        // Atualiza a interface com os dados carregados
        populateSelects();
        populateProductSelect();
        renderInventory();
        renderBarbersList();
        renderServicesList();
        updateDashboard();

    } catch (err) {
        console.error('Erro ao carregar dados do Supabase:', err);
    }
}

async function showApp() {
    loginContainer.style.display = 'none';
    appContainer.style.display = 'flex';

    // Carrega os dados do Supabase antes de inicializar a lógica
    await loadSupabaseData();

    // Setup Profile
    if (currentUser) {
        currentUserName.textContent = currentUser.name || currentUser.username;
        currentUserAvatar.textContent = (currentUser.name || currentUser.username).charAt(0).toUpperCase();
    }

    // Init App Logic
    displayCurrentDate();
    startTimeTicker();
    populateSelects();
    updateDashboard();
    setupNavigation();
    setupReportFilters();
    setupFinanceiroFilters();
    setupComissoesFilters();
    setupConsumo();
    setupCaixa();
    setupRelatoriosUnlock(); // Deve ser após setupCaixa para o form existir
    setupEstoque();
    setupVendas();
    setupMultiService();
    setupConfigServices();
    setupPerformanceFilters();
    setupFaturamentoFilters();
    setupVendasHistoryFilters();

    // Sempre inicia no dashboard
    switchView('dashboard');
}

if (btnLogout) {
    btnLogout.addEventListener('click', async () => {
        await supabaseClient.auth.signOut();
        currentUser = null;
        currentTenantId = null;
        loginUsernameInput.value = '';
        loginPasswordInput.value = '';
        showLogin();
    });
}

function displayCurrentDate() {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'America/Sao_Paulo' };
    const today = new Date();
    let formattedDate = today.toLocaleDateString('pt-BR', options);
    formattedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
    currentDateEl.textContent = formattedDate;
}

function startTimeTicker() {
    if (!currentTimeEl) return;

    function updateTime() {
        const now = new Date();
        currentTimeEl.textContent = now.toLocaleTimeString('pt-BR', {
            timeZone: 'America/Sao_Paulo',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }

    updateTime(); // initial call
    setInterval(updateTime, 1000);
}

// ---- Navegação ----
function setupNavigation() {
    // Navegação comum — revoga o acesso a tudo que é protegido
    const lockAll = () => { lockRelatorios(); lockFinanceiro(); };

    if (navDashboard) navDashboard.addEventListener('click', (e) => { e.preventDefault(); lockAll(); switchView('dashboard'); });
    if (navEstoque) navEstoque.addEventListener('click', (e) => { e.preventDefault(); lockAll(); switchView('estoque'); });
    if (navGestaoBarbeiros) navGestaoBarbeiros.addEventListener('click', (e) => { e.preventDefault(); lockAll(); switchView('gestao-barbeiros'); });
    if (navGestaoServicos) navGestaoServicos.addEventListener('click', (e) => { e.preventDefault(); lockAll(); switchView('gestao-servicos'); });
    if (navGestaoUsuarios) navGestaoUsuarios.addEventListener('click', (e) => { e.preventDefault(); lockAll(); switchView('gestao-usuarios'); });
    if (navConfig) navConfig.addEventListener('click', (e) => { e.preventDefault(); lockAll(); switchView('config'); });

    // Grupo Financeiro — ao navegar aqui, bloqueia Relatórios
    if (navFinanceiro) navFinanceiro.addEventListener('click', (e) => { e.preventDefault(); lockRelatorios(); switchView('financeiro'); });
    if (navVendasHistory) navVendasHistory.addEventListener('click', (e) => { e.preventDefault(); lockRelatorios(); switchView('vendas-history'); });
    if (navComissoes) navComissoes.addEventListener('click', (e) => { e.preventDefault(); lockRelatorios(); switchView('comissoes'); });
    if (navConsumo) navConsumo.addEventListener('click', (e) => { e.preventDefault(); lockRelatorios(); switchView('consumo'); });

    // Grupo Relatórios — ao navegar aqui, bloqueia Financeiro
    if (navRelCaixa) navRelCaixa.addEventListener('click', (e) => { e.preventDefault(); lockFinanceiro(); switchView('rel-caixa'); });
    if (navRelServicos) navRelServicos.addEventListener('click', (e) => { e.preventDefault(); lockFinanceiro(); switchView('rel-servicos'); });
    if (navRelDesempenho) navRelDesempenho.addEventListener('click', (e) => { e.preventDefault(); lockFinanceiro(); switchView('rel-desempenho'); });
    if (navRelFaturamento) navRelFaturamento.addEventListener('click', (e) => { e.preventDefault(); lockFinanceiro(); switchView('rel-faturamento'); });
}

function switchView(viewName) {
    if (navDashboard) navDashboard.classList.remove('active');
    if (navFinanceiro) navFinanceiro.classList.remove('active');
    if (navComissoes) navComissoes.classList.remove('active');
    if (navConsumo) navConsumo.classList.remove('active');
    if (navRelCaixa) navRelCaixa.classList.remove('active');
    if (navRelServicos) navRelServicos.classList.remove('active');
    if (navConfig) navConfig.classList.remove('active');
    if (navEstoque) navEstoque.classList.remove('active');

    if (navGestaoBarbeiros) navGestaoBarbeiros.classList.remove('active');
    if (navGestaoServicos) navGestaoServicos.classList.remove('active');
    if (navGestaoUsuarios) navGestaoUsuarios.classList.remove('active');
    if (navRelDesempenho) navRelDesempenho.classList.remove('active');
    if (navRelFaturamento) navRelFaturamento.classList.remove('active');
    if (navVendasHistory) navVendasHistory.classList.remove('active');

    if (viewEstoque) viewEstoque.style.display = 'none';
    if (viewDashboard) viewDashboard.style.display = 'none';
    if (viewFinanceiro) viewFinanceiro.style.display = 'none';
    if (viewVendasHistory) viewVendasHistory.style.display = 'none';
    if (viewComissoes) viewComissoes.style.display = 'none';
    if (viewConsumo) viewConsumo.style.display = 'none';
    if (viewRelCaixa) viewRelCaixa.style.display = 'none';
    if (viewRelServicos) viewRelServicos.style.display = 'none';

    if (viewGestaoBarbeiros) viewGestaoBarbeiros.style.display = 'none';
    if (viewGestaoServicos) viewGestaoServicos.style.display = 'none';
    if (viewGestaoUsuarios) viewGestaoUsuarios.style.display = 'none';
    if (viewRelDesempenho) viewRelDesempenho.style.display = 'none';
    if (viewRelFaturamento) viewRelFaturamento.style.display = 'none';
    if (viewConfig) viewConfig.style.display = 'none';
    if (btnVendaFlutuante) btnVendaFlutuante.style.display = 'none';

    if (viewName === 'dashboard') {
        if (navDashboard) navDashboard.classList.add('active');
        if (viewDashboard) viewDashboard.style.display = 'block';
        if (btnVendaFlutuante) btnVendaFlutuante.style.display = 'flex';
        if (pageTitle) pageTitle.textContent = 'Dashboard do Dia';
        updateDashboard();
    } else if (viewName === 'financeiro') {
        if (navFinanceiro) navFinanceiro.classList.add('active');
        if (viewFinanceiro) viewFinanceiro.style.display = 'block';
        pageTitle.textContent = 'Resumo Financeiro';
        updateFinanceiro();
    } else if (viewName === 'vendas-history') {
        if (navVendasHistory) navVendasHistory.classList.add('active');
        if (viewVendasHistory) viewVendasHistory.style.display = 'block';
        pageTitle.textContent = 'Histórico de Vendas';
        updateVendasHistory();
    } else if (viewName === 'rel-caixa') {
        if (navRelCaixa) navRelCaixa.classList.add('active');
        if (viewRelCaixa) viewRelCaixa.style.display = 'block';
        pageTitle.textContent = 'Histórico de Caixa';
        updateReportsCaixa();
    } else if (viewName === 'rel-servicos') {
        if (navRelServicos) navRelServicos.classList.add('active');
        if (viewRelServicos) viewRelServicos.style.display = 'block';
        pageTitle.textContent = 'Histórico de Serviços';
        updateReportsServicos();
    } else if (viewName === 'comissoes') {
        if (navComissoes) navComissoes.classList.add('active');
        if (viewComissoes) viewComissoes.style.display = 'block';
        pageTitle.textContent = 'Controle de Comissões';
        updateComissoes();
    } else if (viewName === 'consumo') {
        if (navConsumo) navConsumo.classList.add('active');
        if (viewConsumo) viewConsumo.style.display = 'block';
        pageTitle.textContent = 'Consumo Interno';
        populateSelects();
        populateProductSelect();
        renderConsumoList();
    } else if (viewName === 'gestao-barbeiros') {
        if (navGestaoBarbeiros) navGestaoBarbeiros.classList.add('active');
        if (viewGestaoBarbeiros) viewGestaoBarbeiros.style.display = 'block';
        pageTitle.textContent = 'Gestão de Barbeiros';
        renderBarbersList();
    } else if (viewName === 'gestao-servicos') {
        if (navGestaoServicos) navGestaoServicos.classList.add('active');
        if (viewGestaoServicos) viewGestaoServicos.style.display = 'block';
        pageTitle.textContent = 'Gestão de Serviços';
        renderServicesList();
    } else if (viewName === 'gestao-usuarios') {
        if (navGestaoUsuarios) navGestaoUsuarios.classList.add('active');
        if (viewGestaoUsuarios) viewGestaoUsuarios.style.display = 'block';
        pageTitle.textContent = 'Gestão de Usuários';
        renderUsersList();
    } else if (viewName === 'rel-desempenho') {
        if (navRelDesempenho) navRelDesempenho.classList.add('active');
        if (viewRelDesempenho) viewRelDesempenho.style.display = 'block';
        pageTitle.textContent = 'Relatório de Desempenho';
        updatePerformanceReport();
    } else if (viewName === 'rel-faturamento') {
        if (navRelFaturamento) navRelFaturamento.classList.add('active');
        if (viewRelFaturamento) viewRelFaturamento.style.display = 'block';
        pageTitle.textContent = 'Relatório de Faturamento';
        updateRelatorioFaturamento();
    } else if (viewName === 'config') {
        if (navConfig) navConfig.classList.add('active');
        if (viewConfig) viewConfig.style.display = 'block';
        if (pageTitle) pageTitle.textContent = 'Configurações do Sistema';
    } else if (viewName === 'estoque') {
        if (navEstoque) navEstoque.classList.add('active');
        if (viewEstoque) viewEstoque.style.display = 'block';
        pageTitle.textContent = 'Gerenciar Estoque';
        renderInventory();
        populateProductSelect();

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

    const sSelect = document.getElementById('service-select');
    if (sSelect) {
        sSelect.innerHTML = '<option value="" disabled selected>Selecione o serviço</option>';
        services.forEach(service => {
            const price = service.defaultPrice || 0;
            const option = document.createElement('option');
            option.value = service.id;
            option.textContent = `${service.name} - R$ ${price.toFixed(2)}`;
            sSelect.appendChild(option);
        });
    }
}

function setupMultiService() {
    const btnAdd = document.getElementById('btn-add-service-to-list');
    const select = document.getElementById('service-select');

    if (btnAdd && select) {
        btnAdd.onclick = () => {
            const serviceId = parseInt(select.value);
            const service = services.find(s => s.id === serviceId);

            if (service) {
                selectedServicesForNewEntry.push({
                    name: service.name,
                    price: service.defaultPrice
                });
                renderSelectedServices();
                select.value = "";
            } else {
                showToast('Selecione um serviço primeiro.', 'info');
            }
        };
    }
}

function renderSelectedServices() {
    const container = document.getElementById('selected-services-container');
    if (!container) return;
    container.innerHTML = '';

    let total = 0;
    selectedServicesForNewEntry.forEach((s, index) => {
        total += s.price;
        const tag = document.createElement('div');
        tag.className = 'selected-service-tag';
        tag.innerHTML = `
            ${s.name} (R$ ${s.price.toFixed(2)})
            <i class="fa-solid fa-xmark" onclick="removeSelectedService(${index})"></i>
        `;
        container.appendChild(tag);
    });

    if (priceInput) {
        priceInput.value = total > 0 ? total.toFixed(2) : "";
    }
}

window.removeSelectedService = function (index) {
    selectedServicesForNewEntry.splice(index, 1);
    renderSelectedServices();
};

if (serviceForm) {
    serviceForm.addEventListener('submit', (e) => {
        e.preventDefault();

        if (selectedServicesForNewEntry.length === 0) {
            showToast('Adicione pelo menos um serviço na lista.', 'info');
            return;
        }

        const barberName = barberSelect.value;
        const timeValue = timeInput.value;
        const paymentMethod = paymentMethodSelect.value;

        if (!barberName || !timeValue || !paymentMethod) {
            showToast("Por favor, preencha todos os campos.", "info");
            return;
        }

        // Registra cada serviço da lista como uma entrada separada
        selectedServicesForNewEntry.forEach(s => {
            const newEntry = {
                id: Math.floor(Date.now() + Math.random() * 1000),
                barber: barberName,
                serviceName: s.name,
                price: s.price,
                time: timeValue,
                paymentMethod: paymentMethod,
                date: getTodayKey(),
                status: 'pendente'
            };
            allServices.unshift(newEntry);
        });

        saveAppointmentsToStorage();
        updateDashboard();
        if (navFinanceiro && navFinanceiro.classList.contains('active')) updateFinanceiro();

        // Limpeza
        serviceForm.reset();
        selectedServicesForNewEntry = [];
        renderSelectedServices();
        showToast('Atendimento(s) registrado(s) com sucesso!', 'success');
    });
}

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
    for (let h = 8; h <= 20; h++) {
        const hourStr = h.toString().padStart(2, '0');
        times.push(`${hourStr}:00`);
        if (h < 20) times.push(`${hourStr}:30`);
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
            const servicesInSlot = todayServices.filter(s => s.barber === barber.name && s.time === time);

            if (servicesInSlot.length > 0) {
                const isMultiple = servicesInSlot.length > 1;
                const isPending = servicesInSlot.some(s => s.status === 'pendente');

                td.className = 'slot-occupied';
                if (isPending) {
                    td.style.borderLeftColor = 'var(--danger-color)';
                } else {
                    td.style.borderLeftColor = '#27ae60';
                    td.style.background = 'rgba(39, 174, 96, 0.1)';
                }

                const mainService = servicesInSlot[0];
                const totalInSlot = servicesInSlot.reduce((acc, curr) => acc + curr.price, 0);

                td.innerHTML = `
                    <div class="slot-content" onclick="openServiceDetails('${barber.name}', '${time}')">
                        <span>${isMultiple ? 'Múltiplos Serviços' : mainService.serviceName}</span>
                        <small>R$ ${totalInSlot.toFixed(2).replace('.', ',')}</small>
                        ${isPending ? '<span class="badge badge-low" style="font-size: 0.6rem; margin-top: 4px;">Pendente</span>' : '<span class="badge badge-ok" style="font-size: 0.6rem; margin-top: 4px; background: #27ae60;"><i class="fa-solid fa-check"></i> Concluído</span>'}
                        <div class="slot-actions">
                            <button onclick="event.stopPropagation(); deleteServiceInSlot('${barber.name}', '${time}')"><i class="fa-solid fa-trash"></i></button>
                        </div>
                    </div>
                `;
                td.title = isPending ? 'Atendimento pendente de confirmação' : 'Atendimento confirmado';
            } else {
                td.className = 'slot-free';
                td.title = 'Clique para registrar serviço neste horário';
                td.onclick = () => {
                    barberSelect.value = barber.name;
                    timeInput.value = time;
                    if (serviceSelect) serviceSelect.focus();
                };
            }
            tr.appendChild(td);
        });

        scheduleBody.appendChild(tr);
    });
}

window.deleteService = async function (id) {
    showConfirm('Excluir Serviço', 'Deseja excluir este serviço?', async () => {
        // Remove do banco de dados
        const { error } = await supabaseClient.from('appointments').delete().eq('id', Math.floor(id));
        if (error) {
            console.error('Erro ao deletar agendamento no Supabase:', error);
            showToast('Erro ao excluir: ' + error.message, 'error');
            return;
        }

        allServices = allServices.filter(s => s.id !== id);
        saveAppointmentsToStorage();
        updateDashboard();
        if (navFinanceiro && navFinanceiro.classList.contains('active')) updateFinanceiro();
        if (navRelCaixa && navRelCaixa.classList.contains('active')) updateReportsCaixa();
        if (navRelServicos && navRelServicos.classList.contains('active')) updateReportsServicos();
        showToast('Atendimento excluído!', 'success');
    });
};

window.editService = function (id) {
    const service = allServices.find(s => s.id === id);
    if (!service) return;

    document.getElementById('edit-service-id').value = id;

    // Populate selects
    const barberSelectEdit = document.getElementById('edit-barber-select');
    const serviceSelectEdit = document.getElementById('edit-service-select');

    barberSelectEdit.innerHTML = '';
    barbers.forEach(b => {
        const opt = document.createElement('option');
        opt.value = b.name;
        opt.textContent = b.name;
        if (b.name === service.barber) opt.selected = true;
        barberSelectEdit.appendChild(opt);
    });

    serviceSelectEdit.innerHTML = '';
    services.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = s.name;
        if (s.name === service.serviceName) opt.selected = true;
        serviceSelectEdit.appendChild(opt);
    });

    document.getElementById('edit-time-input').value = service.time;
    document.getElementById('edit-price-input').value = service.price.toFixed(2);
    document.getElementById('edit-payment-method').value = service.paymentMethod;
    document.getElementById('edit-date-input').value = service.date;

    document.getElementById('modal-edit-service').style.display = 'flex';
};

// Setup Modal Edit Listeners
const modalEditClose = document.getElementById('modal-edit-close');
const editServiceForm = document.getElementById('edit-service-form');

if (modalEditClose) {
    modalEditClose.onclick = () => { document.getElementById('modal-edit-service').style.display = 'none'; };
}

if (editServiceForm) {
    editServiceForm.onsubmit = (e) => {
        e.preventDefault();
        const id = parseInt(document.getElementById('edit-service-id').value);
        const index = allServices.findIndex(s => s.id === id);

        if (index !== -1) {
            const serviceId = parseInt(document.getElementById('edit-service-select').value);
            const serviceObj = services.find(s => s.id === serviceId);

            allServices[index].barber = document.getElementById('edit-barber-select').value;
            allServices[index].serviceName = serviceObj ? serviceObj.name : allServices[index].serviceName;
            allServices[index].time = document.getElementById('edit-time-input').value;
            allServices[index].price = parseFloat(document.getElementById('edit-price-input').value);
            allServices[index].paymentMethod = document.getElementById('edit-payment-method').value;
            allServices[index].date = document.getElementById('edit-date-input').value;

            saveAppointmentsToStorage();
            document.getElementById('modal-edit-service').style.display = 'none';
            updateDashboard();
            if (navFinanceiro && navFinanceiro.classList.contains('active')) updateFinanceiro();
            if (navRelCaixa && navRelCaixa.classList.contains('active')) updateReportsCaixa();
            if (navRelServicos && navRelServicos.classList.contains('active')) updateReportsServicos();
            showToast('Serviço atualizado!', 'success');
        }
    };
}

function setupConfigServices() {
    const form = document.getElementById('new-service-form');
    if (form) {
        form.onsubmit = (e) => {
            e.preventDefault();
            const name = document.getElementById('new-service-name').value;
            const price = parseFloat(document.getElementById('new-service-price').value);

            const newService = {
                id: Date.now(),
                name: name,
                defaultPrice: price
            };

            services.push(newService);
            saveServicesToStorage();
            form.reset();
            renderServicesList();
            populateSelects();
            showToast('Serviço cadastrado!', 'success');
        };
    }
}

function renderServicesList() {
    const container = document.getElementById('services-list-container');
    if (!container) return;
    container.innerHTML = '';

    services.forEach(s => {
        const item = document.createElement('div');
        item.className = 'service-config-item';
        item.innerHTML = `
            <div class="service-config-info">
                <span class="service-config-name">${s.name}</span>
                <span class="service-config-price">R$ ${s.defaultPrice.toFixed(2).replace('.', ',')}</span>
            </div>
            <div class="action-buttons">
                <button class="btn-icon" style="color: var(--primary-color);" onclick="editServiceConfig(${s.id})" title="Editar Serviço">
                    <i class="fa-solid fa-pen"></i>
                </button>
                <button class="btn-icon delete" onclick="deleteServiceConfig(${s.id})" title="Excluir Serviço">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        `;
        container.appendChild(item);
    });
}

window.deleteServiceConfig = async function (id) {
    showConfirm('Excluir Serviço', 'Deseja excluir este serviço?', async () => {
        // Remove do banco de dados
        const { error } = await supabaseClient.from('services').delete().eq('id', Math.floor(id));
        if (error) {
            console.error('Erro ao deletar configuração de serviço no Supabase:', error);
            showToast('Erro ao excluir: ' + error.message, 'error');
            return;
        }

        services = services.filter(s => s.id !== id);
        saveServicesToStorage();
        renderServicesList();
        populateSelects();
        showToast('Serviço excluído!', 'success');
    });
};

window.editServiceConfig = function (id) {
    const s = services.find(sc => sc.id === id);
    if (!s) return;

    document.getElementById('edit-config-service-id').value = s.id;
    document.getElementById('edit-config-service-name').value = s.name;
    document.getElementById('edit-config-service-price').value = s.defaultPrice.toFixed(2);

    document.getElementById('modal-edit-config-service').style.display = 'flex';
};

const formEditConfigService = document.getElementById('form-edit-config-service');
if (formEditConfigService) {
    formEditConfigService.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = parseInt(document.getElementById('edit-config-service-id').value);
        const newName = document.getElementById('edit-config-service-name').value.trim();
        const newPrice = parseFloat(document.getElementById('edit-config-service-price').value);

        if (!newName || isNaN(newPrice)) return;

        const s = services.find(sc => sc.id === id);
        if (!s) return;

        // Atualiza o histórico
        allServices.forEach(srv => {
            if (srv.serviceName === s.name) {
                srv.serviceName = newName;
            }
        });

        s.name = newName;
        s.defaultPrice = newPrice;

        saveServicesToStorage();
        saveAppointmentsToStorage();
        renderServicesList();
        populateSelects();
        updateDashboard();

        document.getElementById('modal-edit-config-service').style.display = 'none';
        showToast('Serviço atualizado!', 'success');
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
                showToast('Selecione as datas de início e fim.', 'info');
            }
        });
    }
}

function getFinanceiroDateRange() {
    return getDateRange(currentFinanceiroPeriod, finDateStartInput, finDateEndInput);
}

function updateFinanceiro() {
    const { start, end } = getFinanceiroDateRange();

    const filteredServices = getServicesByDateRange(start, end).filter(s => s.status !== 'pendente');
    const filteredSales = productSales.filter(s => s.date >= start && s.date <= end);

    const servicesRevenue = filteredServices.reduce((acc, curr) => acc + curr.price, 0);
    const salesRevenue = filteredSales.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0);

    const totalRevenue = servicesRevenue + salesRevenue;
    const totalCount = filteredServices.length + filteredSales.length;
    const avgTicket = totalCount > 0 ? totalRevenue / totalCount : 0;

    if (finTotalRevenue) finTotalRevenue.textContent = `R$ ${totalRevenue.toFixed(2).replace('.', ',')}`;
    if (finTotalServices) finTotalServices.textContent = filteredServices.length;
    if (finAvgTicket) finAvgTicket.textContent = `R$ ${avgTicket.toFixed(2).replace('.', ',')}`;

    // Resumo por forma de pagamento (incluindo vendas)
    renderPaymentBreakdown(filteredServices, filteredSales);
}

function renderPaymentBreakdown(servicesList, salesList = []) {
    if (!paymentMethodsGrid) return;

    const methods = ['Dinheiro', 'PIX', 'Débito', 'Crédito', 'Cartão'];
    const stats = {};
    methods.forEach(m => stats[m] = { revenue: 0, count: 0 });

    servicesList.forEach(s => {
        const method = s.paymentMethod;
        if (method && stats[method]) {
            stats[method].revenue += s.price;
            stats[method].count++;
        }
    });

    salesList.forEach(s => {
        const method = s.paymentMethod === 'Cartão' ? 'Cartão' : s.paymentMethod;
        if (method && stats[method]) {
            stats[method].revenue += (s.price * s.quantity);
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
                showToast('Selecione as datas de início e fim.', 'info');
            }
        });
    }
}

function getComissoesDateRange() {
    return getDateRange(currentComissoesPeriod, comDateStartInput, comDateEndInput);
}

function updateComissoes() {
    const { start, end } = getComissoesDateRange();
    let filteredServices = getServicesByDateRange(start, end).filter(s => s.status !== 'pendente');
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
                            <td>${c.productName || c.product}</td>
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
            const prodId = parseInt(e.target.value);
            const product = inventory.find(p => p.id === prodId);
            if (product) {
                consumoPriceInput.value = product.price.toFixed(2);
            }
        });
    }

    if (consumoForm) {
        consumoForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const barber = consumoBarberSelect.value;
            const product = consumoProductSelect.value;
            const price = parseFloat(consumoPriceInput.value);
            const date = consumoDateInput.value;

            if (!barber || !product || isNaN(price) || !date) {
                showToast('Preencha todos os campos.', 'info');
                return;
            }

            const prodId = parseInt(product);
            const inventoryItem = inventory.find(p => p.id === prodId);

            if (!inventoryItem) {
                showToast('Produto não encontrado no estoque.', 'error');
                return;
            }

            if (inventoryItem.stock <= 0) {
                showToast('Estoque esgotado para este produto!', 'error');
                return;
            }

            // Baixa no estoque
            inventoryItem.stock--;
            await saveInventoryToStorage();

            const newConsumo = {
                id: Date.now(),
                barber,
                productId: prodId,
                productName: inventoryItem.name,
                price,
                date
            };

            allConsumption.unshift(newConsumo);
            await saveConsumoToStorage();

            consumoForm.reset();
            renderConsumoList();
            renderInventory(); // Atualiza tabela de estoque
            populateProductSelect(); // Atualiza dropdowns
            showToast('Consumo registrado e estoque atualizado!', 'success');
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
                    <small>${c.productName || c.product} - ${formatDateBR(c.date)}</small>
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

window.deleteConsumo = async function (id) {
    showConfirm('Excluir Lançamento', 'Deseja excluir este lançamento? O item voltará para o estoque.', async () => {
        // Remove do banco de dados
        const { error } = await supabaseClient.from('consumption').delete().eq('id', Math.floor(id));
        if (error) {
            console.error('Erro ao deletar consumo no Supabase:', error);
            showToast('Erro ao excluir: ' + error.message, 'error');
            return;
        }

        const item = allConsumption.find(c => c.id === id);
        if (item && item.productId) {
            const inventoryItem = inventory.find(p => p.id === item.productId);
            if (inventoryItem) {
                inventoryItem.stock++;
                saveInventoryToStorage();
            }
        }

        allConsumption = allConsumption.filter(c => c.id !== id);
        saveConsumoToStorage();
        renderConsumoList();
        renderInventory();
        populateProductSelect();
        showToast('Lançamento excluído!', 'success');
    });
};

// ---- Aba Barbeiros ----
if (barberForm) {
    barberForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = newBarberName.value.trim();
        if (name) {
            barbers.push({ id: Date.now(), name: name });
            saveBarbersToStorage();
            newBarberName.value = '';
            renderBarbersList();
            populateSelects();
        }
    });
}

async function deleteBarber(id) {
    showConfirm('Excluir Barbeiro', 'Remover este barbeiro? Os atendimentos históricos serão preservados, mas não estarão mais vinculados a este ID.', async () => {
        // Primeiro, remove a referência deste barbeiro nos agendamentos (mantendo o nome para o histórico)
        const { error: updateError } = await supabaseClient
            .from('appointments')
            .update({ barber_id: null })
            .eq('barber_id', Math.floor(id));

        if (updateError) {
            console.error('Erro ao desvincular atendimentos:', updateError);
            showToast('Erro ao preparar exclusão: ' + updateError.message, 'error');
            return;
        }

        // Agora sim, remove o barbeiro
        const { error } = await supabaseClient.from('barbers').delete().eq('id', Math.floor(id));
        if (error) {
            console.error('Erro ao deletar barbeiro no Supabase:', error);
            showToast('Erro ao excluir: ' + error.message, 'error');
            return;
        }

        barbers = barbers.filter(b => b.id !== id);
        saveBarbersToStorage();
        renderBarbersList();
        populateSelects();
        showToast('Barbeiro removido!', 'success');
    });
}

window.editBarber = function (id) {
    const b = barbers.find(bar => bar.id === id);
    if (!b) return;

    document.getElementById('edit-config-barber-id').value = b.id;
    document.getElementById('edit-config-barber-name').value = b.name;

    document.getElementById('modal-edit-config-barber').style.display = 'flex';
};

const formEditConfigBarber = document.getElementById('form-edit-config-barber');
if (formEditConfigBarber) {
    formEditConfigBarber.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = parseInt(document.getElementById('edit-config-barber-id').value);
        const newName = document.getElementById('edit-config-barber-name').value.trim();

        if (!newName) return;

        const b = barbers.find(bar => bar.id === id);
        if (!b) return;

        if (newName === b.name) {
            document.getElementById('modal-edit-config-barber').style.display = 'none';
            return;
        }

        const oldName = b.name;

        allServices.forEach(s => {
            if (s.barber === oldName) s.barber = newName;
        });

        allConsumption.forEach(c => {
            if (c.barber === oldName) c.barber = newName;
        });

        b.name = newName;

        saveBarbersToStorage();
        saveAppointmentsToStorage();
        saveConsumoToStorage();

        renderBarbersList();
        populateSelects();
        updateDashboard();
        if (viewComissoes && viewComissoes.style.display !== 'none') updateComissoes();

        document.getElementById('modal-edit-config-barber').style.display = 'none';
        showToast('Barbeiro atualizado!', 'success');
    });
}

function renderBarbersList() {
    const todayServices = getTodayServices();
    barbersListContainer.innerHTML = '';
    if (barbers.length === 0) {
        barbersListContainer.innerHTML = '<p class="empty-state">Nenhum barbeiro cadastrado.</p>';
        return;
    }

    barbers.forEach(barber => {
        const barberServices = todayServices.filter(s => s.barber === barber.name && s.status !== 'pendente');
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
                <div class="action-buttons">
                    <button class="btn-delete" style="color: var(--primary-color);" onclick="editBarber(${barber.id})" title="Editar"><i class="fa-solid fa-pen"></i></button>
                    <button class="btn-delete" onclick="deleteBarber(${barber.id})" title="Remover"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>
        `;
        barbersListContainer.appendChild(div);
    });
}

// ---- Aba Relatórios ----
function setupReportFilters() {
    // Filtros do Caixa
    const chipsCaixa = document.querySelectorAll('#view-rel-caixa .chip[data-period]');
    chipsCaixa.forEach(chip => {
        chip.addEventListener('click', () => {
            chipsCaixa.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            currentRelCaixaPeriod = chip.dataset.period;

            if (currentRelCaixaPeriod === 'custom') {
                customDateRangeCaixa.style.display = 'flex';
            } else {
                customDateRangeCaixa.style.display = 'none';
                updateReportsCaixa();
            }
        });
    });

    if (btnApplyFilterCaixa) {
        btnApplyFilterCaixa.addEventListener('click', () => {
            if (dateStartInputCaixa.value && dateEndInputCaixa.value) {
                updateReportsCaixa();
            } else {
                showToast('Selecione as datas de início e fim.', 'info');
            }
        });
    }

    // Filtros dos Serviços
    const chipsServicos = document.querySelectorAll('#view-rel-servicos .chip[data-period]');
    chipsServicos.forEach(chip => {
        chip.addEventListener('click', () => {
            chipsServicos.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            currentRelServicosPeriod = chip.dataset.period;

            if (currentRelServicosPeriod === 'custom') {
                customDateRangeServicos.style.display = 'flex';
            } else {
                customDateRangeServicos.style.display = 'none';
                updateReportsServicos();
            }
        });
    });

    if (btnApplyFilterServicos) {
        btnApplyFilterServicos.addEventListener('click', () => {
            if (dateStartInputServicos.value && dateEndInputServicos.value) {
                updateReportsServicos();
            } else {
                showToast('Selecione as datas de início e fim.', 'info');
            }
        });
    }
}

function updateReportsCaixa() {
    const { start, end } = getDateRange(currentRelCaixaPeriod, dateStartInputCaixa, dateEndInputCaixa);
    renderCashHistory(start, end);
}

function updateReportsServicos() {
    const { start, end } = getDateRange(currentRelServicosPeriod, dateStartInputServicos, dateEndInputServicos);
    const filtered = getServicesByDateRange(start, end).filter(s => s.status !== 'pendente');
    renderReportHistory(filtered);
}

function renderCashHistory(start, end) {
    const filteredCash = cashHistory.filter(c => c.date >= start && c.date <= end).sort((a, b) => b.date.localeCompare(a.date));
    if (!cashHistoryBody) return;
    cashHistoryBody.innerHTML = '';

    if (filteredCash.length === 0) {
        if (cashHistoryTable) cashHistoryTable.parentElement.style.display = 'none';
        if (cashHistoryEmpty) cashHistoryEmpty.style.display = 'block';
        return;
    }

    if (cashHistoryTable) cashHistoryTable.parentElement.style.display = 'table';
    if (cashHistoryEmpty) cashHistoryEmpty.style.display = 'none';

    filteredCash.forEach(c => {
        const tr = document.createElement('tr');
        const statusText = c.status === 'aberto' ? '<span style="color: #27ae60; font-weight: 600;">Aberto</span>' : '<span style="color: #7f8c8d; font-weight: 600;">Fechado</span>';
        const fechamentoText = c.status === 'fechado' ? c.closedAt : '--';
        let finalValue = c.status === 'fechado' ? c.finalValue : (c.initialValue + (c.servicesValue || 0));

        // Calculate services if not closed yet
        let servicesTotal = c.servicesValue;
        if (c.status === 'aberto') {
            const todayServices = allServices.filter(s => s.date === c.date && s.status !== 'pendente');
            servicesTotal = todayServices.reduce((acc, curr) => acc + curr.price, 0);
            finalValue = c.initialValue + servicesTotal;
        }

        tr.innerHTML = `
            <td>${formatDateBR(c.date)}</td>
            <td>${statusText}</td>
            <td>R$ ${c.initialValue.toFixed(2).replace('.', ',')} <br><small class="text-muted">às ${c.openedAt}</small></td>
            <td>R$ ${servicesTotal.toFixed(2).replace('.', ',')}</td>
            <td><strong>R$ ${finalValue.toFixed(2).replace('.', ',')}</strong> <br><small class="text-muted">${c.status === 'fechado' ? 'às ' + c.closedAt : ''}</small></td>
            <td>
                <button class="btn-delete" onclick="deleteCashHistory(${c.id})" title="Excluir Caixa">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        `;
        cashHistoryBody.appendChild(tr);
    });
}

window.deleteCashHistory = async function (id) {
    showConfirm('Excluir Histórico de Caixa', 'Tem certeza que deseja excluir o histórico deste caixa? Essa ação não pode ser desfeita.', async () => {
        // Remove do banco de dados
        const { error } = await supabaseClient.from('cash_history').delete().eq('id', Math.floor(id));
        if (error) {
            console.error('Erro ao deletar histórico de caixa no Supabase:', error);
            showToast('Erro ao excluir: ' + error.message, 'error');
            return;
        }

        cashHistory = cashHistory.filter(c => c.id !== id);
        saveCashRegisterToStorage();

        // Atualiza a interface
        updateReportsCaixa();
        updateReportsServicos();
        updateDashboard();
        updateCaixaButton();
        showToast('Histórico de caixa excluído!', 'success');
    });
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
                    <td>
                        <div class="action-buttons">
                            <button class="btn-icon" onclick="editService(${entry.id})"><i class="fa-solid fa-pen"></i></button>
                            <button class="btn-icon delete" onclick="deleteService(${entry.id})"><i class="fa-solid fa-trash"></i></button>
                        </div>
                    </td>
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
                        <th>Ação</th>
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
if (newUserForm) {
    newUserForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const uname = newSystemUsername.value.trim().toLowerCase();
        const upass = newSystemPassword.value;
        const upassConfirm = document.getElementById('new-system-password-confirm').value;

        if (upass !== upassConfirm) {
            showToast('As senhas não coincidem!', 'error');
            return;
        }

        if (users.find(u => u.username === uname)) {
            showToast('Este usuário já existe!', 'error');
            return;
        }

        users.push({ id: Date.now(), username: uname, password: upass });
        saveUsersToStorage();
        newSystemUsername.value = '';
        newSystemPassword.value = '';
        document.getElementById('new-system-password-confirm').value = '';
        renderUsersList();
        showToast('Usuário criado com sucesso!', 'success');
    });
}

async function deleteUser(id) {
    const userToDelete = users.find(u => u.id === id);
    if (!userToDelete) return;

    if (userToDelete.username === currentUser.username) {
        showToast('Você não pode excluir a si mesmo!', 'error');
        return;
    }

    if (userToDelete.username === 'guilherme') {
        showToast('O usuário ADMIN não pode ser excluído!', 'error');
        return;
    }

    showConfirm('Remover Acesso', 'Tem certeza que deseja remover este acesso?', async () => {
        // Remove do banco de dados (tabela profiles)
        const { error } = await supabaseClient.from('profiles').delete().eq('id', userToDelete.id);
        if (error) {
            console.error('Erro ao deletar usuário no Supabase:', error);
            showToast('Erro ao excluir: ' + error.message, 'error');
            return;
        }

        users = users.filter(u => u.id !== id);
        saveUsersToStorage();
        renderUsersList();
        showToast('Acesso removido!', 'success');
    });
}

window.editUser = function (id) {
    const u = users.find(user => user.id === id);
    if (!u) return;

    document.getElementById('edit-user-id').value = u.id;
    document.getElementById('edit-user-username').value = u.username;
    document.getElementById('edit-user-password').value = '';

    document.getElementById('modal-edit-user').style.display = 'flex';
};

const formEditUser = document.getElementById('form-edit-user');
if (formEditUser) {
    formEditUser.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = parseInt(document.getElementById('edit-user-id').value);
        const newUsername = document.getElementById('edit-user-username').value.trim().toLowerCase();
        const newPassword = document.getElementById('edit-user-password').value;

        if (!newUsername) return;

        const u = users.find(user => user.id === id);
        if (!u) return;

        if (newUsername !== u.username && users.some(x => x.username === newUsername)) {
            showToast('Este nome de usuário já está em uso!', 'error');
            return;
        }

        if (u.username === 'guilherme' && newUsername !== 'guilherme') {
            showToast('O nome do usuário ADMIN não pode ser alterado.', 'error');
            document.getElementById('edit-user-username').value = 'guilherme';
            return;
        }

        const isMe = (u.username === currentUser.username);

        u.username = newUsername;
        if (newPassword) {
            u.password = newPassword;
        }

        if (isMe) {
            currentUser.username = u.username;
            currentUser.password = u.password;
            if (document.getElementById('user-display-name')) {
                document.getElementById('user-display-name').textContent = u.username;
            }
        }

        saveUsersToStorage();
        renderUsersList();

        document.getElementById('modal-edit-user').style.display = 'none';
        showToast('Usuário atualizado com sucesso!', 'success');
    });
}

function renderUsersList() {
    usersListContainer.innerHTML = '';
    users.forEach(user => {
        const isMe = user.username === currentUser.username;
        const isAdmin = user.username === 'guilherme';
        const initial = user.username.charAt(0).toUpperCase();

        const div = document.createElement('div');
        div.className = 'barber-card';
        div.innerHTML = `
            <div class="barber-info">
                <div class="avatar-small" style="background: rgba(255,255,255,0.1); color: var(--primary-color);">${initial}</div>
                <h4>${user.username} ${isMe ? '<span style="color: var(--text-muted); font-size: 0.8rem;">(Você)</span>' : ''} ${isAdmin ? '<span class="badge badge-ok" style="font-size:0.6rem; padding: 2px 6px;">ADMIN</span>' : ''}</h4>
            </div>
            <div class="barber-right">
                <div class="action-buttons">
                    <button class="btn-icon" style="color: var(--primary-color);" onclick="editUser(${user.id})" title="Editar Usuário"><i class="fa-solid fa-pen"></i></button>
                    ${!isAdmin ? `<button class="btn-delete" onclick="deleteUser(${user.id})" title="Remover Acesso"><i class="fa-solid fa-trash"></i></button>` : ''}
                </div>
            </div>
        `;
        usersListContainer.appendChild(div);
    });
}

// ---- Local Storage ----
async function saveAppointmentsToStorage() {
    if (!currentTenantId) return;
    // Traduz do JS para o Banco de Dados e garante ID inteiro + busca IDs reais
    const dbData = allServices.map(s => {
        const barberObj = barbers.find(b => b.name === (s.barber || s.barberName));
        const serviceObj = services.find(sv => sv.name === s.serviceName);

        return {
            id: Math.floor(s.id),
            tenant_id: currentTenantId,
            barber_id: barberObj ? barberObj.id : null,
            service_id: serviceObj ? serviceObj.id : null,
            barber_name: s.barber || s.barberName,
            service_name: s.serviceName,
            price: s.price,
            time: s.time,
            payment_method: s.paymentMethod,
            date: s.date,
            status: s.status
        };
    });

    const { error } = await supabaseClient.from('appointments').upsert(dbData);
    if (error) {
        console.error('Erro ao salvar agendamentos no Supabase:', error);
        showToast('Erro ao salvar agendamento: ' + error.message, 'error');
    }
}

async function saveServicesToStorage() {
    if (!currentTenantId) return;
    // Traduz defaultPrice para 'price' no banco e garante ID inteiro
    const dbData = services.map(s => ({
        id: Math.floor(s.id),
        tenant_id: currentTenantId,
        name: s.name,
        price: s.defaultPrice
    }));

    const { error } = await supabaseClient.from('services').upsert(dbData);
    if (error) {
        console.error('Erro ao salvar configuração de serviços no Supabase:', error);
        showToast('Erro ao salvar serviço: ' + error.message, 'error');
    }
}

async function saveBarbersToStorage() {
    if (!currentTenantId) return;
    const dbData = barbers.map(b => ({
        id: Math.floor(b.id),
        tenant_id: currentTenantId,
        name: b.name
    }));
    const { error } = await supabaseClient.from('barbers').upsert(dbData);
    if (error) console.error('Erro ao salvar barbeiros no Supabase:', error);
}

async function saveUsersToStorage() {
    // Usuários agora são gerenciados pelo Supabase Auth/Profiles. 
    // Manteremos essa função vazia por enquanto para não quebrar chamadas legadas.
}

async function saveCashRegisterToStorage() {
    if (!currentTenantId) return;
    const dbData = cashHistory.map(c => ({
        id: Math.floor(c.id),
        tenant_id: currentTenantId,
        date: c.date,
        type: 'caixa', // Campo obrigatório no banco
        amount: c.finalValue || 0, // Campo obrigatório no banco
        initial_value: c.initialValue,
        final_value: c.finalValue,
        services_value: c.servicesValue || 0,
        status: c.status,
        opened_at: c.openedAt,
        closed_at: c.closedAt,
        obs: c.obs
    }));
    const { error } = await supabaseClient.from('cash_history').upsert(dbData);
    if (error) console.error('Erro ao salvar caixa no Supabase:', error);
}

async function saveInventoryToStorage() {
    if (!currentTenantId) return;
    const dbData = inventory.map(i => ({
        id: Math.floor(i.id),
        tenant_id: currentTenantId,
        name: i.name,
        price: i.price,
        stock: i.stock // Usando 'stock' para bater com o resto do código
    }));
    const { error } = await supabaseClient.from('inventory').upsert(dbData);
    if (error) console.error('Erro ao salvar estoque no Supabase:', error);
}

async function saveProductSalesToStorage() {
    if (!currentTenantId) return;
    const dbData = productSales.map(s => {
        const productObj = inventory.find(p => p.name === s.productName);
        return {
            id: Math.floor(s.id),
            tenant_id: currentTenantId,
            product_id: productObj ? productObj.id : null,
            product_name: s.productName,
            quantity: s.quantity,
            price: s.price,
            payment_method: s.paymentMethod,
            date: s.date
        };
    });
    const { error } = await supabaseClient.from('product_sales').upsert(dbData);
    if (error) console.error('Erro ao salvar vendas no Supabase:', error);
}

async function saveConsumoToStorage() {
    if (!currentTenantId) return;
    const dbData = allConsumption.map(c => ({
        id: Math.floor(c.id),
        tenant_id: currentTenantId,
        product_id: c.productId,
        product_name: c.productName,
        barber_name: c.barber || c.barberName,
        price: c.price,
        quantity: 1,
        date: c.date
    }));
    const { error } = await supabaseClient.from('consumption').upsert(dbData);
    if (error) console.error('Erro ao salvar consumo no Supabase:', error);
}


function loadFromLocalStorage() {
    // Esta função não é mais necessária, pois usamos o Supabase
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
            showToast('Backup salvo com sucesso!', 'success');
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
    showToast('Backup exportado! Verifique seus Downloads.', 'success');
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
                showToast('Arquivo inválido!', 'error');
                return;
            }

            showConfirm('Importar Backup', `Importar backup de ${data.exportedAt ? new Date(data.exportedAt).toLocaleString('pt-BR') : 'data desconhecida'}?\n\nIsso substituirá TODOS os dados atuais.`, () => {
                allServices = data.services;
                barbers = data.barbers;
                users = data.users;

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

                populateSelects();
                updateDashboard();
                updateCaixaButton();
                renderUsersList();

                showToast('Dados importados com sucesso!', 'success');
            });
        } catch (err) {
            showToast('Erro ao ler o arquivo.', 'error');
        }
    };
    reader.readAsText(file);
    importFileInput.value = '';
});

// ---- Limpar Dados Financeiros (Teste) ----
const btnClearFinancial = document.getElementById('btn-clear-financial');

if (btnClearFinancial) {
    btnClearFinancial.addEventListener('click', () => {
        showConfirm('Limpar Dados', 'ATENÇÃO: Isso apagará todos os serviços registrados e o histórico de caixa. Deseja continuar?', () => {
            showConfirm('Confirmação Final', 'TEM CERTEZA? Barbeiros e usuários serão mantidos, mas todo o faturamento será zerado. Esta ação não tem volta.', () => {
                // Limpa arrays
                allServices = [];
                cashHistory = [];
                allConsumption = [];
                productSales = [];

                // Salva estados vazios
                saveServicesToStorage();
                saveServicesToStorage();
                saveCashRegisterToStorage();
                saveConsumoToStorage();
                saveProductSalesToStorage();

                // Atualiza Interface
                updateDashboard();
                updateFinanceiro();
                updateReportsCaixa();
                updateReportsServicos();
                updateCaixaButton();
                renderConsumoList();
                renderInventory();
                populateProductSelect();

                showToast('Dados financeiros zerados.', 'success');
            });
        });
    });
}

// ---- Caixa ----
function setupCaixa() {
    caixaDateInput.value = getTodayKey();

    if (!btnCaixa._caixaBtnListenerAdded) {
        btnCaixa._caixaBtnListenerAdded = true;
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
    }

    if (!modalCaixaClose._caixaListenerAdded) {
        modalCaixaClose._caixaListenerAdded = true;
        modalCaixaClose.addEventListener('click', () => { modalCaixa.style.display = 'none'; });
        modalCaixa.addEventListener('click', (e) => { if (e.target === modalCaixa) modalCaixa.style.display = 'none'; });
    }

    if (!caixaForm._caixaFormListenerAdded) {
        caixaForm._caixaFormListenerAdded = true;
        caixaForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const date = caixaDateInput.value;
            const value = parseFloat(caixaValueInput.value);
            const obs = caixaObsInput.value.trim();

            if (!date || isNaN(value)) {
                showToast('Preencha a data e o valor.', 'info');
                return;
            }

            // Evita abrir caixa duplicado para o mesmo dia
            if (cashHistory.find(c => c.date === date)) {
                showToast('Já existe um caixa para esta data!', 'error');
                modalCaixa.style.display = 'none';
                return;
            }

            const newCash = {
                id: Date.now(),
                date: date,
                initialValue: value,
                servicesValue: 0,
                finalValue: value,
                obs: obs,
                openedAt: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                openedAtTs: Date.now(), // Timestamp completo para filtrar vendas
                closedAt: '--',
                status: 'aberto'
            };

            cashHistory.push(newCash);
            saveCashRegisterToStorage();
            modalCaixa.style.display = 'none';
            updateDashboard();
            updateCaixaButton();
            showToast('Caixa aberto com sucesso!', 'success');
        });
    }

    if (!btnFecharCaixa._caixaFecharListenerAdded) {
        btnFecharCaixa._caixaFecharListenerAdded = true;
        btnFecharCaixa.addEventListener('click', () => {
            const today = getTodayKey();
            const todayCash = cashHistory.find(c => c.date === today);

            if (!todayCash || todayCash.status === 'fechado') return;

                showConfirm('Encerrar Expediente', 'Tem certeza que deseja encerrar o expediente de hoje? Isso fechará o caixa.', () => {
                    const todayServices = getTodayServices();
                    const servicesRev = todayServices.reduce((acc, curr) => acc + curr.price, 0);

                    // Conta apenas as vendas feitas após a abertura deste caixa
                    const caixaOpenTs = todayCash.openedAtTs || 0;
                    const todaySales = productSales.filter(s => Number(s.id) >= caixaOpenTs);
                    const salesRev = todaySales.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0);

                    const totalRevenue = servicesRev + salesRev;

                    todayCash.status = 'fechado';
                    todayCash.closedAt = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                    todayCash.servicesValue = totalRevenue;
                    todayCash.finalValue = todayCash.initialValue + totalRevenue;

                    saveCashRegisterToStorage();
                    updateDashboard();
                    updateCaixaButton();
                    showToast('Expediente encerrado!', 'success');
                });
        });
    }

    updateCaixaButton();
    setupCaixaUnlock();
}

// ---- Proteção por Senha — Abas Restritas ----
let _pendingRelatoriosView = null;
let _pendingFinanceiroView = null;

/** Chamada pelo onclick inline do botão pai "Relatórios" */
window.requestRelatoriosToggle = function (anchorEl) {
    const parentLi = anchorEl.closest('.has-submenu');
    if (relatoriosUnlocked) {
        parentLi.classList.toggle('open');
        return;
    }
    _pendingRelatoriosView = 'open-submenu';
    const modal = document.getElementById('modal-liberar-caixa');
    const input = document.getElementById('caixa-unlock-password');
    const title = modal ? modal.querySelector('h3') : null;
    if (title) title.innerHTML = '<i class="fa-solid fa-lock"></i> Acesso a Relatórios';
    if (modal) {
        modal.style.display = 'flex';
        if (input) { input.value = ''; input.focus(); }
    }
};

/** Chamada pelo onclick inline do botão pai "Financeiro" */
window.requestFinanceiroToggle = function (anchorEl) {
    const parentLi = anchorEl.closest('.has-submenu');
    if (financeiroUnlocked) {
        parentLi.classList.toggle('open');
        return;
    }
    _pendingFinanceiroView = 'open-submenu';
    const modal = document.getElementById('modal-liberar-caixa');
    const input = document.getElementById('caixa-unlock-password');
    const title = modal ? modal.querySelector('h3') : null;
    if (title) title.innerHTML = '<i class="fa-solid fa-lock"></i> Acesso ao Financeiro';
    if (modal) {
        modal.style.display = 'flex';
        if (input) { input.value = ''; input.focus(); }
    }
};

function lockRelatorios() {
    relatoriosUnlocked = false;
    _pendingRelatoriosView = null;
    const parentLi = document.getElementById('nav-relatorios-parent');
    const lockIcon = document.getElementById('relatorios-lock-icon');
    if (parentLi) parentLi.classList.remove('open');
    if (lockIcon) lockIcon.className = 'fa-solid fa-lock submenu-icon';
}

function lockFinanceiro() {
    financeiroUnlocked = false;
    _pendingFinanceiroView = null;
    const parentLi = document.getElementById('nav-financeiro-parent');
    const lockIcon = document.getElementById('financeiro-lock-icon');
    if (parentLi) parentLi.classList.remove('open');
    if (lockIcon) lockIcon.className = 'fa-solid fa-lock submenu-icon';
}

function setupRelatoriosUnlock() {
    const formLiberarCaixaEl = document.getElementById('form-liberar-caixa');
    if (formLiberarCaixaEl && !formLiberarCaixaEl._relatoriosListenerAdded) {
        formLiberarCaixaEl._relatoriosListenerAdded = true;
        formLiberarCaixaEl.addEventListener('submit', (e) => {
            e.preventDefault();
            const input = document.getElementById('caixa-unlock-password');
            const password = input ? input.value : '';
            const modal = document.getElementById('modal-liberar-caixa');
            const title = modal ? modal.querySelector('h3') : null;

            if (password === cashReleasePassword) {
                if (input) input.value = '';
                if (modal) modal.style.display = 'none';
                if (title) title.innerHTML = '<i class="fa-solid fa-key"></i> Liberação de Caixa';

                if (_pendingRelatoriosView === 'open-submenu') {
                    relatoriosUnlocked = true;
                    _pendingRelatoriosView = null;
                    const parentLi = document.getElementById('nav-relatorios-parent');
                    const lockIcon = document.getElementById('relatorios-lock-icon');
                    if (parentLi) parentLi.classList.add('open');
                    if (lockIcon) lockIcon.className = 'fa-solid fa-chevron-down submenu-icon';
                } else if (_pendingFinanceiroView === 'open-submenu') {
                    financeiroUnlocked = true;
                    _pendingFinanceiroView = null;
                    const parentLi = document.getElementById('nav-financeiro-parent');
                    const lockIcon = document.getElementById('financeiro-lock-icon');
                    if (parentLi) parentLi.classList.add('open');
                    if (lockIcon) lockIcon.className = 'fa-solid fa-chevron-down submenu-icon';
                } else {
                    caixaValuesVisible = true;
                    updateCaixaStatus();
                }
            } else {
                showToast('Senha de liberação incorreta!', 'error');
            }
        });
    }
}

function setupCaixaUnlock() {
    if (btnToggleCaixaValues && !btnToggleCaixaValues._unlockListenerAdded) {
        btnToggleCaixaValues._unlockListenerAdded = true;
        btnToggleCaixaValues.addEventListener('click', () => {
            if (caixaValuesVisible) {
                // Apenas oculta, sem pedir senha
                caixaValuesVisible = false;
                updateCaixaStatus();
            } else {
                // Exige senha para mostrar
                if (modalLiberarCaixa) {
                    modalLiberarCaixa.style.display = 'flex';
                    if (inputUnlockPassword) inputUnlockPassword.focus();
                }
            }
        });
    }

    if (modalLiberarCaixaClose) {
        modalLiberarCaixaClose.addEventListener('click', () => {
            if (modalLiberarCaixa) modalLiberarCaixa.style.display = 'none';
            // Restaura estado caso o modal tenha sido aberto para relatórios
            _pendingRelatoriosView = null;
            const title = modalLiberarCaixa ? modalLiberarCaixa.querySelector('h3') : null;
            if (title) title.innerHTML = '<i class="fa-solid fa-key"></i> Liberação de Caixa';
        });
    }

    // O submit do form agora é gerido pelo setupRelatoriosUnlock() de forma unificada.
    // Apenas mantemos aqui o setup do botão de fechar.
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
    const caixaWarning = document.getElementById('caixa-warning');

    if (todayCash) {
        if (caixaWarning) caixaWarning.style.display = 'none';
        caixaStatus.style.display = 'flex';
        caixaStatusDate.textContent = `Aberto às ${todayCash.openedAt} — ${formatDateBR(todayCash.date)}`;
        caixaStatusObs.textContent = todayCash.obs || '';
        caixaStatusObs.style.display = todayCash.obs ? 'block' : 'none';

        const opening = todayCash.initialValue;
        let servicesRevenue = todayCash.servicesValue;
        let total = todayCash.finalValue;

        if (todayCash.status === 'aberto') {
            const todayServices = getTodayServices();
            const confirmedServices = todayServices.filter(s => s.status !== 'pendente');
            servicesRevenue = confirmedServices.reduce((acc, curr) => acc + curr.price, 0);

            // Filtra apenas vendas feitas APÓS a abertura deste caixa
            // O ID da venda é Date.now() na criação, servindo como timestamp
            const caixaOpenTs = todayCash.openedAtTs || 0;
            const currentSales = caixaOpenTs > 0
                ? productSales.filter(s => Number(s.id) >= caixaOpenTs)
                : productSales.filter(s => s.date === today);
            const salesRevenue = currentSales.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0);

            servicesRevenue += salesRevenue;
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

        // Controle de visibilidade dos valores (Senha de Liberação)
        if (caixaValuesVisible) {
            caixaValAbertura.classList.remove('masked-value');
            caixaValServicos.classList.remove('masked-value');
            caixaValTotal.classList.remove('masked-value');
            if (btnToggleCaixaValues) {
                btnToggleCaixaValues.innerHTML = '<i class="fa-solid fa-eye"></i>';
                btnToggleCaixaValues.classList.add('active');
            }
        } else {
            caixaValAbertura.classList.add('masked-value');
            caixaValServicos.classList.add('masked-value');
            caixaValTotal.classList.add('masked-value');
            if (btnToggleCaixaValues) {
                btnToggleCaixaValues.innerHTML = '<i class="fa-solid fa-eye-slash"></i>';
                btnToggleCaixaValues.classList.remove('active');
            }
        }
    } else {
        caixaStatus.style.display = 'none';
        if (caixaWarning) caixaWarning.style.display = 'flex';
    }
}

// ---- Estoque e Vendas ----
function setupEstoque() {
    const productForm = document.getElementById('product-form');

    if (productForm) {
        productForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('prod-name').value;
            const price = parseFloat(document.getElementById('prod-price').value);
            const stock = parseInt(document.getElementById('prod-stock').value) || 0;

            const newProduct = {
                id: Math.floor(Date.now() + Math.random() * 1000),
                name,
                price,
                stock
            };
            inventory.push(newProduct);
            saveInventoryToStorage();
            productForm.reset();
            renderInventory();
            populateProductSelect();
            showToast('Produto cadastrado!', 'success');
        });
    }
}

// ---- Aba Vendas ----
function setupVendas() {

    if (btnVendaFlutuante) {
        btnVendaFlutuante.addEventListener('click', () => {
            populateProductSelect(); // Garante que o select do modal esteja atualizado
            if (modalNovaVenda) modalNovaVenda.style.display = 'flex';
        });
    }

    if (modalNovaVendaClose) {
        modalNovaVendaClose.addEventListener('click', () => {
            if (modalNovaVenda) modalNovaVenda.style.display = 'none';
        });
    }

    if (modalNovaVenda) {
        modalNovaVenda.addEventListener('click', (e) => {
            if (e.target === modalNovaVenda) modalNovaVenda.style.display = 'none';
        });
    }

    if (modalSaleForm) {
        modalSaleForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const success = processSaleFormSubmit('modal-sale-product-select', 'modal-sale-qty', 'modal-sale-payment', modalSaleForm);
            if (success && modalNovaVenda) {
                modalNovaVenda.style.display = 'none';
            }
        });
    }
}

function processSaleFormSubmit(prodSelectId, qtyId, paymentId, formElement) {
    const prodId = parseInt(document.getElementById(prodSelectId).value);
    const qty = parseInt(document.getElementById(qtyId).value);
    const payment = document.getElementById(paymentId).value;

    const product = inventory.find(p => p.id === prodId);
    if (!product) return false;

    if (product.stock < qty) {
        showToast('Estoque insuficiente!', 'error');
        return false;
    }

    product.stock -= qty;
    const newSale = {
        id: Date.now(),
        productId: prodId,
        productName: product.name,
        price: product.price,
        quantity: qty,
        paymentMethod: payment,
        date: getTodayKey()
    };

    productSales.unshift(newSale);
    saveInventoryToStorage();
    saveProductSalesToStorage();

    formElement.reset();
    updateDashboard();
    if (navFinanceiro && navFinanceiro.classList.contains('active')) updateFinanceiro();
    if (navVendasHistory && navVendasHistory.classList.contains('active')) updateVendasHistory();
    showToast('Venda realizada com sucesso!', 'success');
    return true;
}

// ---- Gerenciamento de Vendas (Histórico) ----
function setupVendasHistoryFilters() {
    const chips = document.querySelectorAll('#view-vendas-history .chip[data-v-hist-period]');
    const customRange = document.getElementById('v-hist-custom-date-range');
    const startInput = document.getElementById('v-hist-date-start');
    const endInput = document.getElementById('v-hist-date-end');
    const btnApply = document.getElementById('v-hist-btn-apply-filter');

    chips.forEach(chip => {
        chip.addEventListener('click', () => {
            chips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            currentVendasHistoryPeriod = chip.dataset.vHistPeriod;

            if (currentVendasHistoryPeriod === 'custom') {
                customRange.style.display = 'flex';
            } else {
                customRange.style.display = 'none';
                updateVendasHistory();
            }
        });
    });

    if (btnApply) {
        btnApply.addEventListener('click', () => {
            if (startInput.value && endInput.value) {
                updateVendasHistory();
            } else {
                showToast('Selecione as datas.', 'info');
            }
        });
    }
}

function updateVendasHistory() {
    const startInput = document.getElementById('v-hist-date-start');
    const endInput = document.getElementById('v-hist-date-end');
    const { start, end } = getDateRange(currentVendasHistoryPeriod, startInput, endInput);

    const body = document.getElementById('vendas-history-body');
    const emptyState = document.getElementById('vendas-history-empty');
    if (!body) return;

    const filtered = productSales.filter(s => s.date >= start && s.date <= end);
    body.innerHTML = '';

    if (filtered.length === 0) {
        emptyState.style.display = 'block';
        return;
    }
    emptyState.style.display = 'none';

    filtered.forEach(s => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${formatDateBR(s.date)}</td>
            <td>${s.productName}</td>
            <td>${s.quantity}</td>
            <td>${s.paymentMethod}</td>
            <td><strong>R$ ${(s.price * s.quantity).toFixed(2).replace('.', ',')}</strong></td>
            <td>
                <button class="btn-icon delete" title="Excluir Venda" onclick="deleteSale(${s.id})">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        `;
        body.appendChild(tr);
    });
}

window.deleteSale = async function (id) {
    showConfirm('Excluir Venda', 'Deseja excluir esta venda? O produto retornará ao estoque.', async () => {
        const sale = productSales.find(s => s.id === id);
        if (!sale) return;

        // 1. Deletar do Banco
        const { error } = await supabaseClient.from('product_sales').delete().eq('id', id);
        if (error) {
            showToast('Erro ao excluir do banco: ' + error.message, 'error');
            return;
        }

        // 2. Restaurar Estoque no Banco
        const product = inventory.find(p => p.id === sale.productId);
        if (product) {
            product.stock += sale.quantity;
            await supabaseClient.from('inventory').update({ stock: product.stock }).eq('id', product.id);
        }

        // 3. Atualizar Local
        productSales = productSales.filter(s => s.id !== id);
        saveInventoryToStorage();
        saveProductSalesToStorage();

        updateVendasHistory();
        renderInventory();
        populateProductSelect();
        updateDashboard();
        if (navFinanceiro && navFinanceiro.classList.contains('active')) updateFinanceiro();

        showToast('Venda excluída e estoque restaurado!', 'success');
    });
};


function renderInventory() {
    const list = document.getElementById('inventory-list');
    if (!list) return;
    list.innerHTML = '';

    inventory.forEach(p => {
        const tr = document.createElement('tr');
        const status = p.stock <= 3 ? '<span class="badge badge-low">Baixo</span>' : '<span class="badge badge-ok">Normal</span>';

        tr.innerHTML = `
            <td>${p.name}</td>
            <td>R$ ${p.price.toFixed(2).replace('.', ',')}</td>
            <td>${p.stock} un</td>
            <td>${status}</td>
            <td style="display: flex; gap: 8px;">
                <button class="btn-icon edit" onclick="openEditProduct(${p.id})"><i class="fa-solid fa-pen-to-square"></i></button>
                <button class="btn-icon delete" onclick="deleteProduct(${p.id})"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        list.appendChild(tr);
    });
}

const modalEditProduct = document.getElementById('modal-edit-product');
const modalEditProductClose = document.getElementById('modal-edit-product-close');
const editProductForm = document.getElementById('edit-product-form');

if (modalEditProductClose) {
    modalEditProductClose.addEventListener('click', () => modalEditProduct.style.display = 'none');
}
const modalEditProductCloseX = document.getElementById('modal-edit-product-close-x');
if (modalEditProductCloseX) {
    modalEditProductCloseX.addEventListener('click', () => modalEditProduct.style.display = 'none');
}
if (modalEditProduct) {
    modalEditProduct.addEventListener('click', (e) => { if (e.target === modalEditProduct) modalEditProduct.style.display = 'none'; });
}

window.openEditProduct = function (id) {
    const product = inventory.find(p => p.id === id);
    if (!product) return;

    document.getElementById('edit-prod-id').value = product.id;
    document.getElementById('edit-prod-name').value = product.name;
    document.getElementById('edit-prod-price').value = product.price;
    document.getElementById('edit-prod-stock').value = product.stock;

    modalEditProduct.style.display = 'flex';
};

if (editProductForm) {
    editProductForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = parseInt(document.getElementById('edit-prod-id').value);
        const name = document.getElementById('edit-prod-name').value;
        const price = parseFloat(document.getElementById('edit-prod-price').value);
        const stock = parseInt(document.getElementById('edit-prod-stock').value) || 0;

        const product = inventory.find(p => p.id === id);
        if (product) {
            product.name = name;
            product.price = price;
            product.stock = stock;
            saveInventoryToStorage();
            renderInventory();
            populateProductSelect();
            modalEditProduct.style.display = 'none';
            showToast('Produto atualizado!', 'success');
        }
    });
}

function populateProductSelect() {
    const select = document.getElementById('sale-product-select');
    const consumoSelect = document.getElementById('consumo-product-select');
    const modalSelect = document.getElementById('modal-sale-product-select');

    const options = inventory.map(p => `<option value="${p.id}">${p.name} (Estoque: ${p.stock})</option>`).join('');
    const defaultOption = '<option value="" disabled selected>Selecione o produto</option>';

    if (select) select.innerHTML = defaultOption + options;
    if (consumoSelect) consumoSelect.innerHTML = defaultOption + options;
    if (modalSelect) modalSelect.innerHTML = defaultOption + options;
}

window.deleteProduct = async function (id) {
    showConfirm('Excluir Produto', 'Remover produto do estoque?', async () => {
        // Remove do banco de dados
        const { error } = await supabaseClient.from('inventory').delete().eq('id', Math.floor(id));
        if (error) {
            console.error('Erro ao deletar produto no Supabase:', error);
            showToast('Erro ao excluir: ' + error.message, 'error');
            return;
        }

        inventory = inventory.filter(p => p.id !== id);
        saveInventoryToStorage();
        renderInventory();
        populateProductSelect();
        showToast('Produto removido!', 'success');
    });
};


// ---- Aba Relatório de Desempenho ----
function setupPerformanceFilters() {
    const chips = document.querySelectorAll('#view-rel-desempenho .chip[data-perf-period]');
    const customRange = document.getElementById('perf-custom-date-range');
    const startInput = document.getElementById('perf-date-start');
    const endInput = document.getElementById('perf-date-end');
    const btnApply = document.getElementById('perf-btn-apply-filter');

    chips.forEach(chip => {
        chip.addEventListener('click', () => {
            chips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            currentPerfPeriod = chip.dataset.perfPeriod;

            if (currentPerfPeriod === 'custom') {
                customRange.style.display = 'flex';
            } else {
                customRange.style.display = 'none';
                updatePerformanceReport();
            }
        });
    });

    if (btnApply) {
        btnApply.addEventListener('click', () => {
            if (startInput.value && endInput.value) {
                updatePerformanceReport();
            } else {
                showToast('Selecione as datas de início e fim.', 'info');
            }
        });
    }
}

function updatePerformanceReport() {
    const startInput = document.getElementById('perf-date-start');
    const endInput = document.getElementById('perf-date-end');
    let startDate, endDate;

    const today = new Date();
    const todayKey = getTodayKey();

    if (currentPerfPeriod === 'lastMonth') {
        const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
        startDate = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}-01`;
        endDate = `${lastMonthEnd.getFullYear()}-${String(lastMonthEnd.getMonth() + 1).padStart(2, '0')}-${String(lastMonthEnd.getDate()).padStart(2, '0')}`;
    } else if (currentPerfPeriod === '30days') {
        startDate = getDateNDaysAgo(29);
        endDate = todayKey;
    } else if (currentPerfPeriod === '7days') {
        startDate = getDateNDaysAgo(6);
        endDate = todayKey;
    } else if (currentPerfPeriod === 'month') {
        startDate = getFirstDayOfMonth();
        endDate = todayKey;
    } else if (currentPerfPeriod === 'custom') {
        startDate = startInput.value;
        endDate = endInput.value;
    } else {
        startDate = getDateNDaysAgo(6);
        endDate = todayKey;
    }

    renderPerformanceReportChart(startDate, endDate);
    updatePerformanceSummary(startDate, endDate);
}

function renderPerformanceReportChart(startDate, endDate) {
    const ctx = document.getElementById('performanceReportChart');
    if (!ctx) return;

    if (performanceReportChart) {
        performanceReportChart.destroy();
    }

    // Gerar lista de datas entre start e end
    const labels = [];
    const revenueData = [];

    let current = new Date(startDate + 'T00:00:00');
    const last = new Date(endDate + 'T00:00:00');

    while (current <= last) {
        const dateKey = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`;
        labels.push(formatDateBR(dateKey).split('/')[0] + '/' + formatDateBR(dateKey).split('/')[1]);

        const dayServices = allServices.filter(s => s.date === dateKey && s.status !== 'pendente');
        const servicesRev = dayServices.reduce((acc, curr) => acc + curr.price, 0);

        const daySales = productSales.filter(s => s.date === dateKey);
        const salesRev = daySales.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0);

        revenueData.push(servicesRev + salesRev);

        current.setDate(current.getDate() + 1);
    }

    // Dynamic width calculation to prevent squeezing
    const wrapper = document.getElementById('perf-canvas-wrapper');
    if (wrapper) {
        const minWidthPerPoint = 50; // At least 50px per day
        const requiredWidth = labels.length * minWidthPerPoint;
        wrapper.style.minWidth = labels.length > 10 ? `${requiredWidth}px` : '100%';
    }

    performanceReportChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Faturamento (R$)',
                data: revenueData,
                borderColor: '#DAA520',
                backgroundColor: 'rgba(218, 165, 32, 0.1)',
                borderWidth: 3,
                tension: 0.3,
                fill: true,
                pointBackgroundColor: '#DAA520'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            return 'Faturamento: R$ ' + context.parsed.y.toFixed(2).replace('.', ',');
                        }
                    }
                }
            },
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#aaa' } },
                x: { grid: { display: false }, ticks: { color: '#aaa' } }
            }
        }
    });
}

function updatePerformanceSummary(startDate, endDate) {
    const services = allServices.filter(s => s.date >= startDate && s.date <= endDate && s.status !== 'pendente');
    const sales = productSales.filter(s => s.date >= startDate && s.date <= endDate);

    const servicesRevenue = services.reduce((acc, curr) => acc + curr.price, 0);
    const salesRevenue = sales.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0);
    const totalRevenue = servicesRevenue + salesRevenue;
    const totalServices = services.length;
    const avgTicket = totalServices > 0 ? totalRevenue / totalServices : 0;

    document.getElementById('perf-total-revenue').textContent = `R$ ${totalRevenue.toFixed(2).replace('.', ',')}`;
    document.getElementById('perf-total-services').textContent = totalServices;
    document.getElementById('perf-total-products').textContent = `R$ ${salesRevenue.toFixed(2).replace('.', ',')}`;
    document.getElementById('perf-avg-ticket').textContent = `R$ ${avgTicket.toFixed(2).replace('.', ',')}`;
}

// ---- Aba Relatório de Faturamento ----
function setupFaturamentoFilters() {
    const typeChips = document.querySelectorAll('#view-rel-faturamento .chip[data-fat-type]');
    const periodChips = document.querySelectorAll('#view-rel-faturamento .chip[data-fat-period]');
    const customRange = document.getElementById('fat-custom-date-range');
    const startInput = document.getElementById('fat-date-start');
    const endInput = document.getElementById('fat-date-end');
    const btnApply = document.getElementById('fat-btn-apply-filter');

    typeChips.forEach(chip => {
        chip.addEventListener('click', () => {
            typeChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            currentFatType = chip.dataset.fatType;
            updateRelatorioFaturamento();
        });
    });

    periodChips.forEach(chip => {
        chip.addEventListener('click', () => {
            periodChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            currentFatPeriod = chip.dataset.fatPeriod;

            if (currentFatPeriod === 'custom') {
                customRange.style.display = 'flex';
            } else {
                customRange.style.display = 'none';
                updateRelatorioFaturamento();
            }
        });
    });

    if (btnApply) {
        btnApply.addEventListener('click', () => {
            if (startInput.value && endInput.value) {
                updateRelatorioFaturamento();
            } else {
                showToast('Selecione as datas de início e fim.', 'info');
            }
        });
    }
}

function updateRelatorioFaturamento() {
    const startInput = document.getElementById('fat-date-start');
    const endInput = document.getElementById('fat-date-end');
    const { start, end } = getDateRange(currentFatPeriod, startInput, endInput);

    const body = document.getElementById('fat-history-body');
    const totalDisplay = document.getElementById('fat-total-display');
    if (!body) return;

    body.innerHTML = '';
    let totalValue = 0;
    let combinedData = [];

    // Buscar Serviços
    if (currentFatType === 'total' || currentFatType === 'servicos') {
        const filteredServices = allServices.filter(s => s.date >= start && s.date <= end && s.status !== 'pendente');
        filteredServices.forEach(s => {
            combinedData.push({
                date: s.date,
                type: 'Serviço',
                description: `${s.serviceName} (${s.barber})`,
                payment: s.paymentMethod || 'N/A',
                value: s.price
            });
        });
    }

    // Buscar Vendas
    if (currentFatType === 'total' || currentFatType === 'vendas') {
        const filteredSales = productSales.filter(s => s.date >= start && s.date <= end);
        filteredSales.forEach(s => {
            combinedData.push({
                date: s.date,
                type: 'Venda',
                description: `${s.productName} (x${s.quantity})`,
                payment: s.paymentMethod || 'N/A',
                value: s.price * s.quantity
            });
        });
    }

    // Ordenar por data (decrescente)
    combinedData.sort((a, b) => b.date.localeCompare(a.date));

    if (combinedData.length === 0) {
        body.innerHTML = '<tr><td colspan="5" class="empty-state">Nenhum registro encontrado no período.</td></tr>';
        totalDisplay.textContent = 'R$ 0,00';
        return;
    }

    combinedData.forEach(item => {
        totalValue += item.value;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${formatDateBR(item.date)}</td>
            <td><span class="badge ${item.type === 'Serviço' ? 'badge-ok' : 'badge-venda'}" style="background: ${item.type === 'Serviço' ? 'rgba(39, 174, 96, 0.2)' : 'rgba(52, 152, 219, 0.2)'}; color: ${item.type === 'Serviço' ? '#2ecc71' : '#3498db'}; border: 1px solid currentColor;">${item.type}</span></td>
            <td>${item.description}</td>
            <td>${item.payment}</td>
            <td><strong>R$ ${item.value.toFixed(2).replace('.', ',')}</strong></td>
        `;
        body.appendChild(tr);
    });

    totalDisplay.textContent = `R$ ${totalValue.toFixed(2).replace('.', ',')}`;
}

// ---- Detalhes e Confirmação de Serviço ----
const modalServiceDetails = document.getElementById('modal-service-details');
const modalServiceDetailsClose = document.getElementById('modal-service-details-close');
const serviceDetailsContent = document.getElementById('service-details-content');
const serviceDetailsActions = document.getElementById('service-details-actions');

let editingServiceInModal = null;

if (modalServiceDetailsClose) {
    modalServiceDetailsClose.onclick = () => {
        modalServiceDetails.style.display = 'none';
        editingServiceInModal = null;
    };
}

window.openServiceDetails = function (barberName, time) {
    const today = getTodayKey();
    const slotAttendances = allServices.filter(s => s.barber === barberName && s.time === time && s.date === today);
    if (slotAttendances.length === 0) return;

    const isPending = slotAttendances.some(s => s.status === 'pendente');

    serviceDetailsContent.innerHTML = `
        <div style="margin-bottom: 20px;">
            <p><strong>Barbeiro:</strong> ${barberName}</p>
            <p><strong>Horário:</strong> ${time}</p>
            <p><strong>Status Geral:</strong> ${isPending ? '<span class="badge badge-low">Pendente</span>' : '<span class="badge badge-ok">Confirmado</span>'}</p>
        </div>
        <table>
            <thead>
                <tr>
                    <th>Serviço</th>
                    <th>Valor</th>
                    <th>Status</th>
                    <th>Ações</th>
                </tr>
            </thead>
            <tbody>
                ${slotAttendances.map(s => {
        if (s.id === editingServiceInModal) {
            return `
                            <tr>
                                <td>
                                    <select id="edit-inline-service" style="min-width: 120px; width: 100%; padding: 6px; font-size: 0.85rem; border-radius: 5px; background: rgba(0,0,0,0.5); color: white; border: 1px solid var(--primary-color);" onchange="updateInlinePrice(this.value)">
                                        <option value="" disabled>Serviço...</option>
                                        ${services.map(sc => `<option value="${sc.id}" ${sc.name === s.serviceName ? 'selected' : ''}>${sc.name}</option>`).join('')}
                                    </select>
                                </td>
                                <td><input type="number" id="edit-inline-price" style="width: 80px; padding: 5px;" value="${s.price}"></td>
                                <td>${s.status === 'pendente' ? 'Pendente' : 'Confirmado'}</td>
                                <td>
                                    <div class="action-buttons">
                                        <button class="btn-icon" style="color: #27ae60;" title="Salvar" onclick="saveInlineEdit(${s.id}, '${barberName}', '${time}')"><i class="fa-solid fa-check"></i></button>
                                        <button class="btn-icon" style="color: #e74c3c;" title="Cancelar" onclick="cancelInlineEdit('${barberName}', '${time}')"><i class="fa-solid fa-xmark"></i></button>
                                    </div>
                                </td>
                            </tr>
                        `;
        }
        return `
                        <tr>
                            <td>${s.serviceName}</td>
                            <td>R$ ${s.price.toFixed(2).replace('.', ',')}</td>
                            <td>${s.status === 'pendente' ? 'Pendente' : 'Confirmado'}</td>
                            <td>
                                <div class="action-buttons">
                                    <button class="btn-icon" title="Editar" onclick="startInlineEdit(${s.id}, '${barberName}', '${time}')"><i class="fa-solid fa-pen"></i></button>
                                    <button class="btn-icon delete" title="Excluir" onclick="deleteServiceFromModal(${s.id}, '${barberName}', '${time}')"><i class="fa-solid fa-trash"></i></button>
                                </div>
                            </td>
                        </tr>
                    `;
    }).join('')}
                <tr id="new-service-row" style="display: none; background: rgba(255,255,255,0.05);">
                    <td>
                        <select id="new-inline-service" style="min-width: 120px; width: 100%; padding: 6px; font-size: 0.85rem; border-radius: 5px; background: rgba(0,0,0,0.5); color: white; border: 1px solid var(--primary-color);" onchange="updateNewInlinePrice(this.value)">
                            <option value="" disabled selected>Serviço...</option>
                            ${services.map(sc => `<option value="${sc.id}">${sc.name}</option>`).join('')}
                        </select>
                    </td>
                    <td><input type="number" id="new-inline-price" style="width: 80px; padding: 5px;" value="0.00"></td>
                    <td>Pendente</td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn-icon" style="color: #27ae60;" title="Salvar" onclick="saveNewInlineService('${barberName}', '${time}')"><i class="fa-solid fa-check"></i></button>
                            <button class="btn-icon" style="color: #e74c3c;" title="Cancelar" onclick="document.getElementById('new-service-row').style.display='none'"><i class="fa-solid fa-xmark"></i></button>
                        </div>
                    </td>
                </tr>
            </tbody>
        </table>
        <div style="margin-top: 15px; text-align: right; font-weight: 700; font-size: 1.1rem; color: var(--primary-color);">
            Total: R$ ${slotAttendances.reduce((acc, curr) => acc + curr.price, 0).toFixed(2).replace('.', ',')}
        </div>
    `;

    serviceDetailsActions.innerHTML = '';

    if (isPending) {
        const btnConfirm = document.createElement('button');
        btnConfirm.className = 'btn-success'; // Mudado para verde
        btnConfirm.style.flex = '1';
        btnConfirm.innerHTML = '<i class="fa-solid fa-check"></i> Confirmar Atendimento';
        btnConfirm.onclick = () => confirmServiceInSlot(barberName, time);
        serviceDetailsActions.appendChild(btnConfirm);
    }

    const btnAdd = document.createElement('button');
    btnAdd.className = 'btn-primary';
    btnAdd.style.flex = '1';
    btnAdd.style.background = 'rgba(255,255,255,0.1)';
    btnAdd.style.color = '#fff';
    btnAdd.innerHTML = '<i class="fa-solid fa-plus"></i> Adicionar Serviço';
    btnAdd.onclick = () => {
        document.getElementById('new-service-row').style.display = 'table-row';
        document.getElementById('new-inline-service').focus();
    };
    serviceDetailsActions.appendChild(btnAdd);

    modalServiceDetails.style.display = 'flex';
};

window.confirmServiceInSlot = function (barberName, time) {
    const today = getTodayKey();
    allServices.forEach(s => {
        if (s.barber === barberName && s.time === time && s.date === today) {
            s.status = 'concluido';
        }
    });
    saveAppointmentsToStorage();
    modalServiceDetails.style.display = 'none';
    updateDashboard();
    if (navFinanceiro && navFinanceiro.classList.contains('active')) updateFinanceiro();
    showToast('Atendimento confirmado com sucesso!', 'success');
};

window.updateNewInlinePrice = function (serviceId) {
    const serviceObj = services.find(sc => sc.id === parseInt(serviceId));
    if (serviceObj) {
        document.getElementById('new-inline-price').value = serviceObj.defaultPrice.toFixed(2);
    }
};

window.saveNewInlineService = function (barberName, time) {
    const serviceId = document.getElementById('new-inline-service').value;
    if (!serviceId) { showToast('Selecione um serviço', 'info'); return; }
    const price = parseFloat(document.getElementById('new-inline-price').value);
    const serviceObj = services.find(sc => sc.id === parseInt(serviceId));

    // Tenta copiar a forma de pagamento do atendimento existente
    const today = getTodayKey();
    const existing = allServices.find(s => s.barber === barberName && s.time === time && s.date === today);
    const paymentMethod = existing ? existing.paymentMethod : 'Dinheiro';

    const newEntry = {
        id: Math.floor(Date.now() + Math.random() * 1000),
        barber: barberName,
        serviceName: serviceObj.name,
        price: price,
        time: time,
        paymentMethod: paymentMethod,
        date: today,
        status: 'pendente'
    };

    allServices.push(newEntry);
    saveAppointmentsToStorage();
    updateDashboard();
    if (navFinanceiro && navFinanceiro.classList.contains('active')) updateFinanceiro();
    openServiceDetails(barberName, time); // Reabre o modal atualizado
};


window.deleteServiceInSlot = async function (barberName, time) {
    showConfirm('Excluir Atendimentos', `Excluir todos os serviços deste horário para ${barberName}?`, async () => {
        const today = getTodayKey();

        // Busca os serviços que serão excluídos para pegar os IDs
        const toDelete = allServices.filter(s => s.barber === barberName && s.time === time && s.date === today);
        const idsToDelete = toDelete.map(s => Math.floor(s.id));

        if (idsToDelete.length > 0) {
            // Remove do banco de dados
            const { error } = await supabaseClient.from('appointments').delete().in('id', idsToDelete);
            if (error) {
                console.error('Erro ao deletar agendamentos no Supabase:', error);
                showToast('Erro ao excluir: ' + error.message, 'error');
                return;
            }
        }

        allServices = allServices.filter(s => !(s.barber === barberName && s.time === time && s.date === today));
        saveAppointmentsToStorage();
        updateDashboard();
        if (navFinanceiro && navFinanceiro.classList.contains('active')) updateFinanceiro();
        showToast('Atendimentos excluídos!', 'success');
    });
};

window.startInlineEdit = function (id, barberName, time) {
    editingServiceInModal = id;
    openServiceDetails(barberName, time);
};

window.cancelInlineEdit = function (barberName, time) {
    editingServiceInModal = null;
    openServiceDetails(barberName, time);
};

window.updateInlinePrice = function (serviceId) {
    const serviceObj = services.find(sc => sc.id === parseInt(serviceId));
    if (serviceObj) {
        document.getElementById('edit-inline-price').value = serviceObj.defaultPrice.toFixed(2);
    }
};

window.saveInlineEdit = function (id, barberName, time) {
    const serviceId = parseInt(document.getElementById('edit-inline-service').value);
    const price = parseFloat(document.getElementById('edit-inline-price').value);
    const serviceObj = services.find(sc => sc.id === serviceId);

    const index = allServices.findIndex(s => s.id === id);
    if (index !== -1 && serviceObj) {
        allServices[index].serviceName = serviceObj.name;
        allServices[index].price = price;
        saveAppointmentsToStorage();
        editingServiceInModal = null;
        updateDashboard();
        openServiceDetails(barberName, time);
    }
};

window.deleteServiceFromModal = async function (id, barberName, time) {
    showConfirm('Excluir Serviço', 'Excluir este serviço?', async () => {
        // Remove do banco de dados
        const { error } = await supabaseClient.from('appointments').delete().eq('id', Math.floor(id));
        if (error) {
            console.error('Erro ao deletar agendamento no Supabase:', error);
            showToast('Erro ao excluir: ' + error.message, 'error');
            return;
        }

        allServices = allServices.filter(s => s.id !== id);
        saveAppointmentsToStorage();
        updateDashboard();

        // Verifica se ainda existem serviços no slot para manter o modal aberto ou fechar
        const today = getTodayKey();
        const remaining = allServices.filter(s => s.barber === barberName && s.time === time && s.date === today);
        if (remaining.length > 0) {
            openServiceDetails(barberName, time);
        } else {
            modalServiceDetails.style.display = 'none';
        }
        showToast('Serviço excluído!', 'success');
    });
};

// ---- Exportação para o Escopo Global (Necessário para onclicks do HTML) ----
window.editService = editService;
window.deleteService = deleteService;
window.openServiceDetails = openServiceDetails;
window.confirmServiceInSlot = confirmServiceInSlot;
window.deleteServiceInSlot = deleteServiceInSlot;
window.editUser = editUser;
window.deleteUser = deleteUser;
window.openEditProduct = openEditProduct;
window.deleteProduct = deleteProduct;
window.deleteSale = deleteSale;
window.deleteConsumo = deleteConsumo;
window.updateInlinePrice = updateInlinePrice;
window.updateNewInlinePrice = updateNewInlinePrice;
window.saveInlineEdit = saveInlineEdit;
window.cancelInlineEdit = cancelInlineEdit;
window.saveNewInlineService = saveNewInlineService;
window.startInlineEdit = startInlineEdit;
window.deleteServiceFromModal = deleteServiceFromModal;
window.requestRelatoriosToggle = requestRelatoriosToggle;
window.requestFinanceiroToggle = requestFinanceiroToggle;
window.lockRelatorios = lockRelatorios;
window.lockFinanceiro = lockFinanceiro;
window.updateFinanceiro = updateFinanceiro;
window.updateReportsCaixa = updateReportsCaixa;
window.updateReportsServicos = updateReportsServicos;
window.updateVendasHistory = updateVendasHistory;

// Iniciar
init();
