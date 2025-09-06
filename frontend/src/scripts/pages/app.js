import { supabaseClient as _supabase } from '../config/supabase.js';

const App = {
    // --- Configuration ---
    config: {
        backendUrl: 'http://localhost:5001/api',
        autoRefreshInterval: 30000, // 30 seconds
        cacheTimeout: 300000,      // 5 minutes
        newsLimit: 10,
        debounceDelay: 300,
        maxRetries: 3
    },

    // --- Timers and Flags ---
    timers: {
        autoRefresh: null,
        marketStatus: null,
        lastActivity: Date.now()
    },
    isInitialized: false,
    loadingStates: new Set(),

    // --- State Management ---
    state: {
        user: null,
        portfolios: { data: [], lastUpdated: null },
        currentPortfolio: null,
        marketData: { trends: null, popular: null, lastUpdated: null },
        newsData: { items: [], offset: 0, hasMore: true, lastUpdated: null },
        searchCache: new Map(),
        isOnline: navigator.onLine,
        stockSelectionModal: {
            selectedStock: null,
            isSearching: false,
            targetPortfolioId: null
        }
    },

    // --- Initialization ---
    async init() {
        if (this.isInitialized) return;

        this.showLoading(true);
        this.setupEventListeners();
        await this.handleAuth();
        if (this.state.user) {
            this.startSmartRefresh();
            this.startMarketStatusClock();
            this.setupVisibilityHandling();
            this.isInitialized = true;
        }
        this.showLoading(false);
    },

    // --- Authentication ---
    async handleAuth() {
        try {
            const { data: { session }, error: sessionError } = await _supabase.auth.getSession();
            
            if (sessionError) {
                console.error('Session error:', sessionError);
                this.redirectToLogin();
                return;
            }
            
            if (!session || !session.user) { 
                this.redirectToLogin(); 
                return; 
            }
            
            this.state.user = session.user;
            document.body.classList.add('logged-in');
            this.renderUserNav();
            await this.loadInitialData();
            
        } catch (error) { 
            console.error('Auth error:', error); 
            this.redirectToLogin(); 
        }
    },

    redirectToLogin() {
        if (!window.location.pathname.includes('/auth/')) {
            window.location.href = './src/pages/auth/login.html';
        }
    },

    // --- Data Loading ---
    async loadInitialData() {
        await Promise.all([
            this.refreshMarketData(true),
            this.loadNewsData(true)
        ]);
    },

    async refreshMarketData(force = false) {
        if (this.loadingStates.has('market-data') || (!force && !this.isDataStale(this.state.marketData.lastUpdated))) return;
        this.loadingStates.add('market-data');
        try {
            const [trends, popular] = await Promise.all([
                this.apiCall('/market-trends'),
                this.apiCall('/popular-stocks')
            ]);
            this.state.marketData = { trends, popular, lastUpdated: Date.now() };
            this.renderMarketData();
        } catch (error) {
            console.error('Error refreshing market data:', error);
        } finally {
            this.loadingStates.delete('market-data');
        }
    },

    async loadNewsData(reset = false, buttonEl = null) {
        if (this.loadingStates.has('news-data')) return;

        if (reset) {
            this.state.newsData = { items: [], offset: 0, hasMore: true, lastUpdated: null };
        }

        if (buttonEl) {
            buttonEl.disabled = true;
            buttonEl.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Loading...`;
        }

        this.loadingStates.add('news-data');
        try {
            const result = await this.apiCall(`/business-news?limit=${this.config.newsLimit}&offset=${this.state.newsData.offset}`);

            if (result?.status === 'OK' && result.data?.length > 0) {
                const existingUrls = new Set(this.state.newsData.items.map(item => item.article_url));
                const newItems = result.data.filter(item => !existingUrls.has(item.article_url));

                if (reset) {
                    this.state.newsData.items = newItems;
                    this.renderNews();
                } else {
                    this.state.newsData.items.push(...newItems);
                    this.appendNews(newItems, result.has_more);
                }

                this.state.newsData.hasMore = result.has_more || false;
                this.state.newsData.offset = this.state.newsData.items.length;
                this.state.newsData.lastUpdated = Date.now();
            } else {
                this.state.newsData.hasMore = false;
                if (reset) this.renderNews();
                else this.appendNews([], false);
            }
        } catch (error) {
            console.error('Error loading news:', error);
            this.renderNewsError();
        } finally {
            this.loadingStates.delete('news-data');
        }
    },

    // --- Smart Refresh & Market Clock ---
    startSmartRefresh() {
        this.stopAutoRefresh();
        this.timers.autoRefresh = setInterval(() => {
            if (document.visibilityState === 'visible' && this.state.isOnline && (Date.now() - this.timers.lastActivity < 300000)) {
                this.refreshMarketData();
            }
        }, this.config.autoRefreshInterval);
    },

    stopAutoRefresh() {
        clearInterval(this.timers.autoRefresh);
    },

    startMarketStatusClock() {
        this.updateMarketStatus();
        this.timers.marketStatus = setInterval(() => this.updateMarketStatus(), 60000);
    },

    updateMarketStatus() {
        const text = document.getElementById('market-status-text');
        const indicator = document.getElementById('market-status-indicator');
        if (!text || !indicator) return;

        try {
            const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
            const day = now.getDay();
            const hours = now.getHours();
            const minutes = now.getMinutes();
            const totalMinutes = hours * 60 + minutes;
            const isOpen = day > 0 && day < 6 && totalMinutes >= 555 && totalMinutes < 930;

            indicator.className = isOpen ? 'open' : 'closed';
            text.textContent = isOpen ? 'Market Open' : 'Market Closed';
        } catch (e) {
            console.error("Could not update market status:", e);
            text.textContent = 'Status Unavailable';
        }
    },

    // --- Event Listeners & Handlers ---
    setupEventListeners() {
        ['click', 'keypress', 'scroll', 'mousemove'].forEach(event =>
            document.addEventListener(event, () => this.timers.lastActivity = Date.now(), { passive: true })
        );

        window.addEventListener('online', () => this.state.isOnline = true);
        window.addEventListener('offline', () => this.state.isOnline = false);

        document.querySelector('.nav-menu')?.addEventListener('click', this.handleNavigation.bind(this));

        const searchInput = document.getElementById('stockSearch');
        if (searchInput) {
            searchInput.addEventListener('input',
                this.debounce(e => this.handleSearch(e.target.value, 'searchSuggestions'), this.config.debounceDelay)
            );
        }

        document.addEventListener('click', e => {
            if (!e.target.closest('.search-box')) {
                this.hideSuggestions('searchSuggestions');
            }
            if (!e.target.closest('#stock-selection-modal .search-box')) {
                this.hideSuggestions('stock-modal-suggestions');
            }
        });

        ['create-portfolio-form'].forEach(id => {
            const form = document.getElementById(id);
            if (form) {
                form.addEventListener('submit', e => e.preventDefault());
            }
        });

        document.body.addEventListener('click', this.handleGlobalClicks.bind(this));

        _supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_OUT') {
                this.cleanup();
                this.redirectToLogin();
            }
        });

        this.setupModalListeners('create-portfolio-modal');
        this.setupModalListeners('stock-selection-modal');
        this.setupModalListeners('stock-detail-modal');
        this.setupModalListeners('confirmation-modal');
    },

    setupVisibilityHandling() {
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                this.startSmartRefresh();
                if (this.isDataStale(this.state.marketData.lastUpdated)) {
                    this.refreshMarketData();
                }
            } else {
                this.stopAutoRefresh();
            }
        });
    },

    handleNavigation(e) {
        if (!e.target.matches('.nav-link')) return;
        e.preventDefault();
        const viewId = e.target.dataset.view;
        this.showView(viewId);
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        e.target.classList.add('active');
    },

    handleGlobalClicks(e) {
        const target = e.target;

        if (target.closest('[data-dismiss="modal"]') || target.matches('.modal-backdrop')) {
            const modal = target.closest('.modal');
            if (modal) this.hideModal(modal.id);
            return;
        }

        const actions = {
            '.delete-portfolio-btn': el => {
                e.preventDefault();
                e.stopPropagation(); 
                this.deletePortfolio(el.dataset.id);
            },
            '.portfolio-card': el => {
                if (!e.target.closest('.delete-portfolio-btn')) {
                    this.getPortfolioDetails(el.dataset.id);
                }
            },
            '#show-create-portfolio-modal': () => this.showModal('create-portfolio-modal'),
            '.show-add-stock-modal': el => this.showStockSelectionModal(el.dataset.id),
            '.delete-holding-btn': el => this.deleteHolding(el.dataset.id),
            '.suggestion-item': el => this.handleSuggestionClick(el),
            '.view-stock-details': el => this.showStockDetails(el.dataset.symbol, el.dataset.name),
            '#create-portfolio-form button[type="submit"]': () => this.createPortfolio(),
            '.load-more-news': el => this.loadNewsData(false, el),
            '#back-to-portfolios': () => this.showView('portfolios-view'),
            '.stock-add-btn': () => this.addStockFromModal(),
            '.stock-cancel-btn': () => this.hideModal('stock-selection-modal'),
            '#confirm-delete-btn': el => this._executeDeletePortfolio(el.dataset.idToDelete)
        };

        for (const [selector, handler] of Object.entries(actions)) {
            const el = target.closest(selector);
            if (el) {
                handler(el);
                return; // Exit after the first matching action
            }
        }
    },

    async handleSuggestionClick(item) {
        const { symbol, name } = item.dataset;

        if (item.closest('#stock-modal-suggestions')) {
            await this.selectStockFromModal(symbol, name);
            this.hideSuggestions('stock-modal-suggestions');
        } else {
            await this.showStockDetails(symbol, name);
            this.hideSuggestions('searchSuggestions');
            const searchInput = document.getElementById('stockSearch');
            if (searchInput) searchInput.value = '';
        }
    },
    
    // --- API & Search ---
    async apiCall(endpoint, options = {}, retries = 0) {
        if (!this.state.isOnline) {
            this.showNotification('You are offline. Please check your connection.', 'error');
            return null;
        }

        const { data: { session } } = await _supabase.auth.getSession();
        if (!session) {
            this.redirectToLogin();
            return null;
        }

        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            ...options.headers
        };

        try {
            const response = await fetch(`${this.config.backendUrl}${endpoint}`, {
                ...options,
                headers
            });

            if (response.status === 401) {
                await _supabase.auth.signOut();
                return null;
            }

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'An unknown error occurred' }));
                throw new Error(`HTTP ${response.status}: ${errorData.error || response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            if (retries < this.config.maxRetries) {
                await new Promise(res => setTimeout(res, 1000 * Math.pow(2, retries)));
                return this.apiCall(endpoint, options, retries + 1);
            }
            this.showNotification(`API Error: ${error.message}`, 'error');
            return null;
        }
    },

    async handleSearch(query, suggestionsId) {
        const trimmedQuery = query.trim().toLowerCase();
        if (trimmedQuery.length < 2) {
            this.hideSuggestions(suggestionsId);
            return;
        }

        const cached = this.state.searchCache.get(trimmedQuery);
        if (cached && !this.isDataStale(cached.timestamp)) {
            this.renderSuggestions(cached.data, suggestionsId);
            return;
        }

        const result = await this.apiCall(`/search?query=${encodeURIComponent(trimmedQuery)}`);
        if (result?.data?.stock) {
            this.state.searchCache.set(trimmedQuery, {
                data: result.data.stock,
                timestamp: Date.now()
            });
            this.renderSuggestions(result.data.stock, suggestionsId);
        } else {
            this.hideSuggestions(suggestionsId);
        }
    },
    
    // --- View Management ---
    showView(viewId) {
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active-view'));
        const targetView = document.getElementById(viewId);
        if (targetView) {
            targetView.classList.add('active-view', 'fade-in');
        }

        if (viewId === 'portfolios-view' && this.isDataStale(this.state.portfolios.lastUpdated)) {
            this.getPortfolios();
        }
    },
    
    // --- Portfolio Logic (CRUD) ---
    async getPortfolios() {
        if (this.loadingStates.has('portfolios')) return;
        
        this.loadingStates.add('portfolios');
        const portfolios = await this.apiCall('/portfolios');
        if (portfolios) {
            this.state.portfolios = { data: portfolios, lastUpdated: Date.now() };
            this.renderPortfolioList();
        }
        this.loadingStates.delete('portfolios');
    },

    async createPortfolio() {
        const name = document.getElementById('portfolioName')?.value.trim();
        const description = document.getElementById('portfolioDescription')?.value.trim();
        
        if (!name) {
            this.showNotification('Portfolio name is required.', 'error');
            return;
        }

        const newPortfolio = await this.apiCall('/portfolios', {
            method: 'POST',
            body: JSON.stringify({ name, description })
        });

        if (newPortfolio) {
            this.state.portfolios.data.push(newPortfolio);
            this.renderPortfolioList();
            this.hideModal('create-portfolio-modal');
            document.getElementById('create-portfolio-form')?.reset();
            this.showNotification('Portfolio created successfully!', 'success');
        }
    },

    deletePortfolio(id) {
        const portfolio = this.state.portfolios.data.find(p => p.id === id);
        if (!portfolio) return;

        const message = document.getElementById('confirmation-message');
        const confirmBtn = document.getElementById('confirm-delete-btn');

        if (message && confirmBtn) {
            message.innerHTML = `Are you sure you want to permanently delete the "<strong>${this.truncate(portfolio.name, 50)}</strong>" portfolio and all its holdings? This action cannot be undone.`;
            confirmBtn.dataset.idToDelete = id;
            this.showModal('confirmation-modal');
        }
    },

    async _executeDeletePortfolio(id) {
        if (!id) return;
        this.hideModal('confirmation-modal');

        const result = await this.apiCall(`/portfolios/${id}`, { method: 'DELETE' });
        if (result) {
            // CHANGE HERE: Removed parseInt() for UUID comparison
            this.state.portfolios.data = this.state.portfolios.data.filter(p => p.id !== id);
            this.renderPortfolioList();
            // CHANGE HERE: Removed parseInt() for UUID comparison
            if (this.state.currentPortfolio?.id === id) {
                this.showView('portfolios-view');
            }
            this.showNotification('Portfolio deleted successfully.', 'success');
        }
    },

    async getPortfolioDetails(id) {
        this.showView('portfolio-detail-view');
        this.showLoading(true);

        const portfolio = this.state.portfolios.data.find(p => p.id === id); 
        if (!portfolio) {
            this.showView('portfolios-view');
            this.showLoading(false);
            return;
        }

        const holdings = await this.apiCall(`/holdings/${id}`);
        this.state.currentPortfolio = { ...portfolio, holdings: [] };

        if (holdings?.length > 0) {
            const symbols = holdings.map(h => h.symbol).join(',');
            const quotes = await this.apiCall(`/quote?symbols=${encodeURIComponent(symbols)}`);
            const quotesData = Array.isArray(quotes?.data) ? quotes.data : (quotes?.data ? [quotes.data] : []);
            
            this.state.currentPortfolio.holdings = holdings.map(h => ({
                ...h,
                quote: quotesData.find(q => q && q.symbol === h.symbol) || {}
            }));
        }

        this.renderPortfolioDetail();
        this.showLoading(false);
    },

    async deleteHolding(id) {
        if (!confirm('Are you sure you want to remove this holding from your portfolio?')) return;

        const result = await this.apiCall(`/holdings/${id}`, { method: 'DELETE' });
        if (result && this.state.currentPortfolio) {
            await this.getPortfolioDetails(this.state.currentPortfolio.id);
            this.showNotification('Holding removed successfully.', 'success');
        }
    },

    // --- Stock Details & Selection Modal ---
    async showStockDetails(symbol, name) {
        this.showLoading(true);
        const result = await this.apiCall(`/quote?symbols=${encodeURIComponent(symbol)}`);
        const stockData = Array.isArray(result?.data) ? result.data[0] : result?.data;
        
        if (stockData) {
            this.renderStockDetailsModal({ ...stockData, displayName: name });
            this.showModal('stock-detail-modal');
        } else {
            this.showNotification(`Could not fetch details for ${symbol}.`, 'error');
        }
        this.showLoading(false);
    },
    
    showStockSelectionModal(portfolioId) {
        this.state.stockSelectionModal.targetPortfolioId = portfolioId;
        this.state.stockSelectionModal.selectedStock = null;
        this.renderStockSelectionModal();
        this.showModal('stock-selection-modal');
        
        setTimeout(() => {
            const searchInput = document.getElementById('stock-selection-search');
            if (searchInput) searchInput.focus();
        }, 100);
    },

     async handleStockModalSearch(query) {
        const trimmedQuery = query.trim();
        const searchBox = document.querySelector('#stock-selection-modal .search-box');
        if (!searchBox) return;

        const formGroup = searchBox.closest('.form-group');
        if (!formGroup) return;

        this.hideSuggestions('stock-modal-suggestions');
        const existingSpinner = formGroup.querySelector('.spinner-text');
        if (existingSpinner) {
            existingSpinner.remove();
        }

        if (trimmedQuery.length < 2) {
            return;
        }

        const spinner = document.createElement('div');
        spinner.className = 'text-muted spinner-text';
        spinner.style.marginTop = '0.5rem';
        spinner.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Searching...`;
        searchBox.after(spinner);

        const result = await this.apiCall(`/search?query=${encodeURIComponent(trimmedQuery)}`);
        spinner.remove();

        if (result?.data?.stock) {
            this.renderStockModalSuggestions(result.data.stock);
        } else {
            this.hideSuggestions('stock-modal-suggestions');
        }
    },

    async selectStockFromModal(symbol, name) {
        this.showLoading(true);
        try {
            const result = await this.apiCall(`/quote?symbols=${encodeURIComponent(symbol)}`);
            const stockData = Array.isArray(result?.data) ? result.data[0] : result?.data;
            
            if (stockData) {
                this.state.stockSelectionModal.selectedStock = {
                    ...stockData,
                    displayName: name,
                    symbol: symbol
                };
                this.renderStockSelectionModal();
                this.hideSuggestions('stock-modal-suggestions');
                
                setTimeout(() => {
                    const quantityInput = document.getElementById('stock-quantity');
                    if (quantityInput) quantityInput.focus();
                }, 100);
            } else {
                this.showNotification(`Could not fetch details for ${symbol}.`, 'error');
            }
        } catch (error) {
            this.showNotification('Error fetching stock details.', 'error');
        } finally {
            this.showLoading(false);
        }
    },

    async addStockFromModal() {
        const { selectedStock, targetPortfolioId } = this.state.stockSelectionModal;
        if (!selectedStock) return;

        const quantityInput = document.getElementById('stock-quantity');
        const priceInput = document.getElementById('stock-price');
        
        const quantity = parseFloat(quantityInput?.value || '0');
        const purchase_price = parseFloat(priceInput?.value || '0');

        if (!quantity || !purchase_price || quantity <= 0 || purchase_price <= 0) {
            this.showNotification('Please enter a valid positive quantity and price.', 'error');
            return;
        }

        const newHolding = await this.apiCall(`/holdings/${targetPortfolioId}`, {
            method: 'POST',
            body: JSON.stringify({
                symbol: selectedStock.symbol,
                quantity,
                purchase_price
            })
        });

        if (newHolding) {
            this.hideModal('stock-selection-modal');
            await this.getPortfolioDetails(targetPortfolioId);
            await this.getPortfolios(); 
            this.showNotification('Stock added successfully!', 'success');
        }
    },

    // --- Rendering Functions ---
    renderUserNav() {
        const navActions = document.getElementById('nav-actions');
        if (navActions && this.state.user) {
            navActions.innerHTML = `
                <span id="user-email">${this.state.user.email}</span>
                <button id="logout-btn" class="btn btn-secondary">
                    <i class="fas fa-sign-out-alt"></i> Logout
                </button>
            `;
            document.getElementById('logout-btn')?.addEventListener('click', () => _supabase.auth.signOut());
        }
    },

    renderMarketData() {
        if (this.state.marketData.trends) {
            this.renderMarketMovers(this.state.marketData.trends);
        }
        if (this.state.marketData.popular?.data) {
            this.renderPopularStocks(this.state.marketData.popular.data);
        }
    },

    renderMarketMovers({ gainers, losers }) {
        const renderColumn = (containerId, data) => {
            const container = document.querySelector(`#${containerId} .mover-list`);
            if (!container) return;

            if (data && data.length > 0) {
                container.innerHTML = data.map(m => `
                    <div class="mover-item">
                        <div class="mover-info">
                            <div class="mover-symbol">${m.symbol}</div>
                            <div class="mover-name">${this.truncate(m.name, 25)}</div>
                        </div>
                        <div class="mover-change ${m.change_percent >= 0 ? 'change-positive' : 'change-negative'}">
                            ${m.change_percent >= 0 ? '+' : ''}${m.change_percent.toFixed(2)}%
                        </div>
                    </div>
                `).join('');
            } else {
                container.innerHTML = '<p class="text-muted">Data unavailable.</p>';
            }
        };

        renderColumn('top-gainers', gainers);
        renderColumn('top-losers', losers);
    },

    renderPopularStocks(stocks) {
        const grid = document.getElementById('popular-stocks-grid');
        if (!grid) return;

        if (stocks && stocks.length > 0) {
            grid.innerHTML = stocks.map(stock => this.createStockCardHTML(stock)).join('');
        } else {
            grid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-chart-line"></i>
                    <p>Could not load popular stocks at this time.</p>
                </div>
            `;
        }
    },

    renderSuggestions(stocks, suggestionsId) {
        const container = document.getElementById(suggestionsId);
        if (!container) return;

        container.innerHTML = stocks.slice(0, 10).map(s => `
            <div class="suggestion-item" data-symbol="${s.symbol}" data-name="${s.name}" role="option" tabindex="0">
                <span class="suggestion-symbol">${s.symbol}</span>
                <span class="suggestion-name">${this.truncate(s.name, 40)}</span>
                <span class="suggestion-exchange">${s.exchange || 'NSE'}</span>
            </div>
        `).join('');
        container.style.display = 'block';
    },

    renderStockModalSuggestions(stocks) {
        const container = document.getElementById('stock-modal-suggestions');
        if (!container) return;

        container.innerHTML = stocks.slice(0, 8).map(s => `
            <div class="suggestion-item" data-symbol="${s.symbol}" data-name="${s.name}" role="option" tabindex="0">
                <span class="suggestion-symbol">${s.symbol}</span>
                <span class="suggestion-name">${this.truncate(s.name, 35)}</span>
                <span class="suggestion-exchange">${s.exchange || 'NSE'}</span>
            </div>
        `).join('');
        container.style.display = 'block';
    },

     renderStockSelectionModal() {
        const modal = document.getElementById('stock-selection-modal');
        if (!modal) return;

        const { selectedStock } = this.state.stockSelectionModal;

        modal.innerHTML = `
            <div class="modal-backdrop" data-dismiss="modal"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h3 id="stock-selection-title">${selectedStock ? 'Add Stock to Portfolio' : 'Search & Select Stock'}</h3>
                    <button class="modal-close" title="Close" data-dismiss="modal" aria-label="Close">&times;</button>
                </div>
                <div class="modal-body">
                    ${!selectedStock ? `
                        <div class="stock-search-section">
                            <div class="form-group">
                                <label for="stock-selection-search">Search for a stock</label>
                                <div class="search-box">
                                    <i class="fas fa-search search-icon"></i>
                                    <input type="text" 
                                           id="stock-selection-search" 
                                           placeholder="Enter stock name or symbol..."
                                           autocomplete="off">
                                    <div class="search-suggestions" id="stock-modal-suggestions"></div>
                                </div>
                                </div>
                        </div>
                    ` : `
                        <div class="stock-details-card">
                            <div class="stock-details-header">
                                <div class="stock-details-info">
                                    <h4>${selectedStock.displayName}</h4>
                                    <div class="stock-details-symbol">${selectedStock.symbol}</div>
                                </div>
                                <div class="stock-details-price">
                                    <div class="stock-details-current-price">${this.formatCurrency(selectedStock.price || 0)}</div>
                                    <div class="stock-details-change ${(selectedStock.change || 0) >= 0 ? 'change-positive' : 'change-negative'}">
                                        <i class="fas fa-arrow-${(selectedStock.change || 0) >= 0 ? 'up' : 'down'}"></i>
                                        ${(selectedStock.change || 0).toFixed(2)} (${(selectedStock.change_percent || 0).toFixed(2)}%)
                                    </div>
                                </div>
                            </div>
                            <div class="stock-details-metrics">
                                 <div class="stock-details-metric"><label>Prev Close</label><div class="value">${this.formatCurrency(selectedStock.previous_close || 0)}</div></div>
                                 <div class="stock-details-metric"><label>Day High</label><div class="value">${this.formatCurrency(selectedStock.high || 0)}</div></div>
                                 <div class="stock-details-metric"><label>Day Low</label><div class="value">${this.formatCurrency(selectedStock.low || 0)}</div></div>
                                 <div class="stock-details-metric"><label>Volume</label><div class="value">${selectedStock.volume ? selectedStock.volume.toLocaleString('en-IN') : 'N/A'}</div></div>
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="stock-quantity">Quantity *</label>
                            <input type="number" id="stock-quantity" required min="0.0001" step="any" placeholder="e.g., 100">
                        </div>
                        <div class="form-group">
                            <label for="stock-price">Purchase Price per Share (₹) *</label>
                            <input type="number" id="stock-price" required min="0.01" step="0.01" value="${selectedStock.price ? selectedStock.price.toFixed(2) : ''}" placeholder="e.g., 150.75">
                        </div>
                    `}
                </div>
                <div class="form-actions modal-body">
                    <button type="button" class="btn btn-secondary stock-cancel-btn">Cancel</button>
                    ${selectedStock ? `
                        <button type="button" class="btn btn-primary stock-add-btn">
                            <i class="fas fa-plus"></i> Add to Portfolio
                        </button>
                    ` : ''}
                </div>
            </div>
        `;

        if (!selectedStock) {
            const searchInput = modal.querySelector('#stock-selection-search');
            if (searchInput) {
                searchInput.addEventListener('input',
                    this.debounce(e => this.handleStockModalSearch(e.target.value), this.config.debounceDelay)
                );
            }
        }
    },

    renderNews() {
        const grid = document.getElementById('financial-news-grid');
        if (!grid) return;

        const { items, hasMore } = this.state.newsData;

        if (items.length > 0) {
            grid.innerHTML = items.map(news => this.createNewsCardHTML(news)).join('');
            if (hasMore) {
                grid.insertAdjacentHTML('beforeend', `
                    <div class="news-load-more">
                        <button class="btn btn-secondary load-more-news">
                            <i class="fas fa-plus"></i> Load More
                        </button>
                    </div>
                `);
            }
        } else {
            grid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-newspaper"></i>
                    <p>No news articles available at this time.</p>
                </div>
            `;
        }
    },

    appendNews(newItems, hasMore) {
        const grid = document.getElementById('financial-news-grid');
        if (!grid) return;

        const loadMoreContainer = grid.querySelector('.news-load-more');
        if (loadMoreContainer) loadMoreContainer.remove();

        grid.insertAdjacentHTML('beforeend', newItems.map(news => this.createNewsCardHTML(news)).join(''));

        if (hasMore) {
            grid.insertAdjacentHTML('beforeend', `
                <div class="news-load-more">
                    <button class="btn btn-secondary load-more-news">
                        <i class="fas fa-plus"></i> Load More
                    </button>
                </div>
            `);
        }
    },

    renderNewsError() {
        const grid = document.getElementById('financial-news-grid');
        if (grid) {
            grid.innerHTML = `
                <div class="error-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Could not load financial news at this time.</p>
                </div>
            `;
        }
    },

    renderPortfolioList() {
        const grid = document.getElementById('portfolios-grid');
        if (!grid) return;

        const portfolios = this.state.portfolios.data;

        if (portfolios && portfolios.length > 0) {
            grid.innerHTML = portfolios.map(p => `
                <div class="portfolio-card" data-id="${p.id}">
                    <div class="portfolio-card-header">
                        <div class="portfolio-info">
                            <h4>${this.truncate(p.name, 50)}</h4>
                            <p>${this.truncate(p.description || 'No description provided', 100)}</p>
                        </div>
                        <button class="btn btn-danger delete-portfolio-btn" data-id="${p.id}" title="Delete Portfolio">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                    <div class="portfolio-stats">
                        <div class="stat">
                            <label>Created</label>
                            <div class="value">${this.formatDate(p.created_at)}</div>
                        </div>
                        <div class="stat">
                            <label>Holdings</label>
                            <div class="value">${p.holdings_count !== undefined ? p.holdings_count : 0}</div>
                        </div>
                    </div>
                </div>
            `).join('');
        } else {
            grid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-briefcase"></i>
                    <p>You don't have any portfolios yet.</p>
                    <button class="btn btn-primary" id="show-create-portfolio-modal">
                        <i class="fas fa-plus"></i> Create Your First Portfolio
                    </button>
                </div>
            `;
        }
    },

    renderPortfolioDetail() {
        const detailView = document.getElementById('portfolio-detail-view');
        if (!detailView || !this.state.currentPortfolio) return;

        const { id, name, holdings } = this.state.currentPortfolio;
        let totalInvestment = 0, currentValue = 0;

        holdings?.forEach(h => {
            totalInvestment += h.purchase_price * h.quantity;
            currentValue += (h.quote?.price || h.purchase_price) * h.quantity;
        });

        const totalGainLoss = currentValue - totalInvestment;
        const totalGainLossPercent = totalInvestment > 0 ? (totalGainLoss / totalInvestment) * 100 : 0;

        detailView.innerHTML = `
            <div class="portfolio-detail-header">
                <div class="portfolio-title-bar">
                    <button id="back-to-portfolios" class="btn btn-secondary">
                        <i class="fas fa-arrow-left"></i> Back
                    </button>
                    <h3>${name}</h3>
                    <button class="btn btn-primary show-add-stock-modal" data-id="${id}">
                        <i class="fas fa-plus"></i> Add Stock
                    </button>
                </div>
                <div class="portfolio-summary-stats">
                    <div class="stat"><label>Current Value</label><div class="value">${this.formatCurrency(currentValue)}</div></div>
                    <div class="stat"><label>Total Investment</label><div class="value">${this.formatCurrency(totalInvestment)}</div></div>
                    <div class="stat">
                        <label>Total Gain/Loss</label>
                        <div class="value ${totalGainLoss >= 0 ? 'change-positive' : 'change-negative'}">
                            ${this.formatCurrency(totalGainLoss, true)} (${totalGainLossPercent.toFixed(2)}%)
                        </div>
                    </div>
                    <div class="stat"><label>Holdings</label><div class="value">${holdings?.length || 0}</div></div>
                </div>
            </div>
            <div class="holdings-table">
                <div class="holdings-table-header">
                    <div>Stock</div><div>Quantity</div><div>Avg. Price</div><div>Current Price</div><div>Market Value</div><div>Gain/Loss</div><div>Action</div>
                </div>
                ${holdings?.length > 0 ? holdings.map(h => this.createHoldingRowHTML(h)).join('') : `
                    <div class="empty-state">
                        <i class="fas fa-chart-line"></i>
                        <p>This portfolio is empty. Add some stocks to get started!</p>
                        <button class="btn btn-primary show-add-stock-modal" data-id="${id}">
                            <i class="fas fa-plus"></i> Add Your First Stock
                        </button>
                    </div>
                `}
            </div>
        `;
    },

    renderStockDetailsModal(stock) {
        const modalBody = document.querySelector('#stock-detail-modal .modal-body');
        const modalTitle = document.getElementById('stock-detail-title');
        if (!modalBody || !modalTitle) return;

        const change = stock.change || 0;
        const changePercent = stock.change_percent || 0;
        const isPositive = change >= 0;

        modalTitle.textContent = stock.displayName || stock.name || stock.symbol;
        modalBody.innerHTML = `
            <div class="stock-price-section">
                <div class="current-price">${this.formatCurrency(stock.price || 0)}</div>
                <div class="price-change ${isPositive ? 'change-positive' : 'change-negative'}">
                    <i class="fas fa-arrow-${isPositive ? 'up' : 'down'}"></i>
                    ${change.toFixed(2)} (${changePercent.toFixed(2)}%)
                </div>
            </div>
            <div class="stock-metrics">
                <div class="metric"><label>Previous Close</label><div class="value">${this.formatCurrency(stock.previous_close || 0)}</div></div>
                <div class="metric"><label>Day High</label><div class="value">${this.formatCurrency(stock.high || 0)}</div></div>
                <div class="metric"><label>Day Low</label><div class="value">${this.formatCurrency(stock.low || 0)}</div></div>
                <div class="metric"><label>Volume</label><div class="value">${stock.volume ? stock.volume.toLocaleString('en-IN') : 'N/A'}</div></div>
            </div>
        `;
    },

    // --- HTML Creation Helpers ---
    createStockCardHTML(stock) {
        const change = stock.change || 0;
        const changePercent = stock.change_percent || 0;
        const isPositive = change >= 0;

        return `
            <div class="stock-card fade-in">
                <div class="stock-header">
                    <div class="stock-info">
                        <h4>${this.truncate(stock.name, 20)}</h4>
                        <div class="stock-symbol">${stock.symbol}</div>
                    </div>
                </div>
                <div class="stock-price">${this.formatCurrency(stock.price || 0)}</div>
                <div class="market-change ${isPositive ? 'change-positive' : 'change-negative'}">
                    <i class="fas fa-arrow-${isPositive ? 'up' : 'down'}"></i>
                    ${change.toFixed(2)} (${changePercent.toFixed(2)}%)
                </div>
                <div class="stock-actions">
                    <button class="btn btn-secondary view-stock-details" data-symbol="${stock.symbol}" data-name="${stock.name}">
                        <i class="fas fa-info-circle"></i> View Details
                    </button>
                </div>
            </div>
        `;
    },

    createHoldingRowHTML(holding) {
        const { quote, quantity, purchase_price } = holding;
        const currentPrice = quote?.price || purchase_price;
        const currentValue = currentPrice * quantity;
        const totalCost = purchase_price * quantity;
        const gainLoss = currentValue - totalCost;
        const gainLossPercent = totalCost > 0 ? (gainLoss / totalCost) * 100 : 0;
        const isPositive = gainLoss >= 0;

        return `
            <div class="holding-row">
                <div data-label="Stock">
                    <div class="stock-name">${quote?.name || holding.symbol}</div>
                    <div class="stock-symbol">${holding.symbol}</div>
                </div>
                <div data-label="Quantity">${quantity.toLocaleString()}</div>
                <div data-label="Avg. Price">${this.formatCurrency(purchase_price)}</div>
                <div data-label="Current Price">${this.formatCurrency(currentPrice)}</div>
                <div data-label="Market Value">${this.formatCurrency(currentValue)}</div>
                <div data-label="Gain/Loss" class="${isPositive ? 'change-positive' : 'change-negative'}">
                    ${this.formatCurrency(gainLoss, true)} (${gainLossPercent.toFixed(2)}%)
                </div>
                <div data-label="Action">
                    <button class="btn btn-danger delete-holding-btn" data-id="${holding.id}" title="Remove Holding">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    },

    createNewsCardHTML(news) {
        return `
            <a href="${news.article_url || '#'}" target="_blank" rel="noopener noreferrer" class="news-card">
                <div class="news-image">
                    ${news.article_photo_url ? `
                        <img src="${news.article_photo_url}" 
                             alt="News thumbnail" 
                             loading="lazy" 
                             onerror="this.style.display='none'">
                    ` : '<i class="fas fa-image" style="font-size: 2rem; color: var(--text-tertiary); display: grid; place-items: center; height: 100%;"></i>'}
                </div>
                <div class="news-content">
                    <div class="news-title">${this.truncate(news.article_title || 'No title available', 80)}</div>
                    <div class="news-meta">
                        <span class="news-source">${news.source || 'Unknown'}</span>
                        <span class="news-time">${this.formatDate(news.post_time_utc)}</span>
                    </div>
                </div>
            </a>
        `;
    },

    // --- Modal & UI Utilities ---
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('show');
            document.body.style.overflow = 'hidden'; // Prevent background scroll
        }
    },

    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('show');
        }
        // Restore scroll only if no other modals are open
        if (!document.querySelector('.modal.show')) {
            document.body.style.overflow = 'auto';
        }

        if (modalId === 'stock-selection-modal') {
            this.state.stockSelectionModal.selectedStock = null;
            this.state.stockSelectionModal.targetPortfolioId = null;
            this.hideSuggestions('stock-modal-suggestions');
        }
    },

    hideSuggestions(id) {
        const container = document.getElementById(id);
        if (container) {
            container.style.display = 'none';
        }
    },

    showLoading(isLoading) {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.style.display = isLoading ? 'flex' : 'none';
        }
    },

    setupModalListeners(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape' && modal.classList.contains('show')) {
                this.hideModal(modalId);
            }
        });
    },

    showNotification(message, type = 'info') {
        const container = document.getElementById('notification-container');
        if (!container) return;

        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <span>${message}</span>
            <button class="notification-close" title="Close">&times;</button>
        `;
        
        notification.querySelector('.notification-close').onclick = () => notification.remove();
        container.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    },

    // --- Utility Functions ---
    isDataStale(lastUpdated) {
        return !lastUpdated || (Date.now() - lastUpdated) > this.config.cacheTimeout;
    },

    formatCurrency(value, showSign = false) {
        if (typeof value !== 'number') return '₹ --.--';
        const formatter = new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
        
        const sign = showSign ? (value >= 0 ? '+ ' : '- ') : '';
        return sign + formatter.format(Math.abs(value)).replace('₹', '₹ ');
    },

    formatDate(dateString) {
        if (!dateString) return 'N/A';
        try {
            return new Date(dateString).toLocaleDateString('en-IN', {
                month: 'short', day: 'numeric', year: 'numeric'
            });
        } catch { return 'N/A'; }
    },

    truncate(text, maxLength) {
        if (!text) return '';
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    },

    debounce(func, delay) {
        let timeoutId;
        return (...args) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func(...args), delay);
        };
    },

    cleanup() {
        this.stopAutoRefresh();
        clearInterval(this.timers.marketStatus);
        this.state.searchCache.clear();
        // Remove event listeners if needed, though most are handled by page unload
    }
};

// --- Initialize App ---
document.addEventListener('DOMContentLoaded', () => {
    App.init().catch(error => {
        console.error('Failed to initialize app:', error);
        App.showNotification('Application failed to start. Please refresh the page.', 'error');
    });
});

window.addEventListener('beforeunload', () => App.cleanup());
