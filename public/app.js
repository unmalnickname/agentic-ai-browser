/**
 * Agentic AI Browser - Web UI
 * Main JavaScript file for the browser interface
 */

// Global variables
let socket = null;
let activeSession = null;
let sessions = [];
let sessionStartTime = null;
let durationInterval = null;
let currentTheme = localStorage.getItem('theme') || 'dark';
let reconnectAttempts = 0;
let reconnectTimeout = null;

// DOM Elements
const elements = {
    // Navigation
    navItems: document.querySelectorAll('.nav-item'),
    views: document.querySelectorAll('.view'),
    mobileMenuToggle: document.getElementById('mobile-menu-toggle'),
    sidebar: document.querySelector('.sidebar'),
    
    // Dashboard
    sessionsContainer: document.getElementById('sessions-container'),
    newSessionBtn: document.getElementById('new-session-btn'),
    createFirstSessionBtn: document.getElementById('create-first-session'),
    
    // New Session
    newSessionForm: document.getElementById('new-session-form'),
    sessionName: document.getElementById('session-name'),
    startUrl: document.getElementById('start-url'),
    llmProvider: document.getElementById('llm-provider'),
    modelName: document.getElementById('model-name'),
    sessionGoal: document.getElementById('session-goal'),
    headlessMode: document.getElementById('headless-mode'),
    saveScreenshots: document.getElementById('save-screenshots'),
    cancelNewSession: document.getElementById('cancel-new-session'),
    modelSelectionContainer: document.getElementById('model-selection-container'),
    
    // Active Session
    sessionTitleText: document.getElementById('session-title-text'),
    sessionStatusBadge: document.getElementById('session-status-badge'),
    backToDashboard: document.getElementById('back-to-dashboard'),
    stopSession: document.getElementById('stop-session'),
    takeScreenshot: document.getElementById('take-screenshot'),
    browserScreenshot: document.getElementById('browser-screenshot'),
    navigationUrl: document.getElementById('navigation-url'),
    navigateBtn: document.getElementById('navigate-btn'),
    logsContainer: document.getElementById('logs-container'),
    clearLogs: document.getElementById('clear-logs'),
    humanMessage: document.getElementById('human-message'),
    sendMessage: document.getElementById('send-message'),
    statusText: document.getElementById('status-text'),
    providerText: document.getElementById('provider-text'),
    currentUrlText: document.getElementById('current-url-text'),
    durationText: document.getElementById('duration-text'),
    sessionProgress: document.getElementById('session-progress'),
    milestonesContainer: document.getElementById('milestones-container'),
    
    // Settings
    lightThemeBtn: document.getElementById('light-theme-btn'),
    darkThemeBtn: document.getElementById('dark-theme-btn'),
    defaultProvider: document.getElementById('default-provider'),
    defaultModel: document.getElementById('default-model'),
    screenshotQuality: document.getElementById('screenshot-quality'),
    defaultTimeout: document.getElementById('default-timeout'),
    saveSettings: document.getElementById('save-settings'),
    
    // Connection
    connectionIndicator: document.getElementById('connection-indicator'),
    connectionText: document.getElementById('connection-text'),
    themeToggle: document.getElementById('theme-toggle'),
    
    // Notifications
    notificationContainer: document.getElementById('notification-container')
};

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

/**
 * Initialize the application
 */
function initializeApp() {
    // Apply saved theme
    applyTheme(currentTheme);
    
    // Initialize WebSocket connection
    initializeWebSocket();
    
    // Set up event listeners
    setupEventListeners();
    
    // Load saved settings
    loadSettings();
    
    // Check for mobile devices and set up responsive behavior
    setupResponsiveUI();
    
    // Show notification on startup
    showNotification('Welcome to Agentic AI Browser', 'info');
}

/**
 * Set up all event listeners
 */
function setupEventListeners() {
    // Navigation
    elements.navItems.forEach(item => {
        item.addEventListener('click', () => {
            const view = item.getAttribute('data-view');
            switchView(view);
        });
    });
    
    // Mobile menu toggle
    if (elements.mobileMenuToggle) {
        elements.mobileMenuToggle.addEventListener('click', toggleMobileMenu);
    }
    
    // Dashboard
    if (elements.newSessionBtn) {
        elements.newSessionBtn.addEventListener('click', () => switchView('new-session'));
    }
    
    if (elements.createFirstSessionBtn) {
        elements.createFirstSessionBtn.addEventListener('click', () => switchView('new-session'));
    }
    
    // New Session
    if (elements.newSessionForm) {
        elements.newSessionForm.addEventListener('submit', handleNewSession);
    }
    
    if (elements.cancelNewSession) {
        elements.cancelNewSession.addEventListener('click', () => switchView('dashboard'));
    }
    
    if (elements.llmProvider) {
        elements.llmProvider.addEventListener('change', updateModelOptions);
    }
    
    // Active Session
    if (elements.backToDashboard) {
        elements.backToDashboard.addEventListener('click', () => switchView('dashboard'));
    }
    
    if (elements.stopSession) {
        elements.stopSession.addEventListener('click', stopActiveSession);
    }
    
    if (elements.takeScreenshot) {
        elements.takeScreenshot.addEventListener('click', requestScreenshot);
    }
    
    if (elements.navigateBtn) {
        elements.navigateBtn.addEventListener('click', navigateTo);
    }
    
    if (elements.clearLogs) {
        elements.clearLogs.addEventListener('click', clearLogs);
    }
    
    if (elements.sendMessage) {
        elements.sendMessage.addEventListener('click', sendHumanMessage);
    }
    
    if (elements.humanMessage) {
        elements.humanMessage.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendHumanMessage();
            }
        });
    }
    
    // Settings
    if (elements.lightThemeBtn) {
        elements.lightThemeBtn.addEventListener('click', () => switchTheme('light'));
    }
    
    if (elements.darkThemeBtn) {
        elements.darkThemeBtn.addEventListener('click', () => switchTheme('dark'));
    }
    
    if (elements.themeToggle) {
        elements.themeToggle.addEventListener('click', toggleTheme);
    }
    
    if (elements.saveSettings) {
        elements.saveSettings.addEventListener('click', saveSettings);
    }
    
    // Navigation URL input
    if (elements.navigationUrl) {
        elements.navigationUrl.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                navigateTo();
            }
        });
    }
}

/**
 * Initialize WebSocket connection
 */
function initializeWebSocket() {
    // Close existing connection if any
    if (socket) {
        socket.close();
    }
    
    // Create new WebSocket connection
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    socket = new WebSocket(wsUrl);
    
    // Connection opened
    socket.addEventListener('open', () => {
        updateConnectionStatus(true);
        reconnectAttempts = 0;
        
        // Subscribe to session updates
        if (activeSession) {
            subscribeToSession(activeSession.id);
        }
        
        // Request active sessions
        requestActiveSessions();
    });
    
    // Listen for messages
    socket.addEventListener('message', (event) => {
        try {
            const message = JSON.parse(event.data);
            handleWebSocketMessage(message);
        } catch (error) {
            console.error('Error parsing WebSocket message:', error);
            showNotification('Error processing server message', 'error');
        }
    });
    
    // Connection closed
    socket.addEventListener('close', () => {
        updateConnectionStatus(false);
        
        // Attempt to reconnect
        if (reconnectAttempts < 5) {
            reconnectAttempts++;
            const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
            
            showNotification(`Connection lost. Reconnecting in ${delay/1000} seconds...`, 'warning');
            
            clearTimeout(reconnectTimeout);
            reconnectTimeout = setTimeout(() => {
                initializeWebSocket();
            }, delay);
        } else {
            showNotification('Unable to connect to server. Please refresh the page.', 'error');
        }
    });
    
    // Connection error
    socket.addEventListener('error', (error) => {
        console.error('WebSocket error:', error);
        updateConnectionStatus(false);
        showNotification('Connection error. Please check if the server is running.', 'error');
    });
}

/**
 * Handle WebSocket messages
 * @param {Object} message - The parsed message
 */
function handleWebSocketMessage(message) {
    switch (message.type) {
        case 'sessions':
            updateSessions(message.sessions);
            break;
            
        case 'session_update':
            updateSessionStatus(message.session);
            break;
            
        case 'screenshot':
            updateScreenshot(message.sessionId, message.screenshot);
            break;
            
        case 'log':
            addLogEntry(message.sessionId, message.level, message.message);
            break;
            
        case 'milestone':
            addMilestone(message.sessionId, message.milestone);
            break;
            
        case 'url_change':
            updateCurrentUrl(message.sessionId, message.url);
            break;
            
        case 'progress':
            updateProgress(message.sessionId, message.progress);
            break;
            
        case 'error':
            showNotification(message.message, 'error');
            break;
            
        default:
            console.log('Unknown message type:', message.type);
    }
}

/**
 * Switch between views with smooth animation
 * @param {string} viewId - The ID of the view to switch to
 */
function switchView(viewId) {
    // Update navigation
    elements.navItems.forEach(item => {
        if (item.getAttribute('data-view') === viewId) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
    
    // Hide all views with fade-out animation
    elements.views.forEach(view => {
        if (view.classList.contains('active')) {
            view.style.opacity = '0';
            setTimeout(() => {
                view.classList.remove('active');
                view.style.display = 'none';
                
                // Show the selected view with fade-in animation
                const selectedView = document.getElementById(`${viewId}-view`);
                if (selectedView) {
                    selectedView.style.opacity = '0';
                    selectedView.style.display = 'block';
                    selectedView.classList.add('active');
                    
                    // Trigger reflow
                    void selectedView.offsetWidth;
                    
                    selectedView.style.opacity = '1';
                }
            }, 200);
        }
    });
    
    // Close mobile menu if open
    if (window.innerWidth < 768 && elements.sidebar.classList.contains('open')) {
        toggleMobileMenu();
    }
}

/**
 * Toggle mobile menu
 */
function toggleMobileMenu() {
    elements.sidebar.classList.toggle('open');
    
    if (elements.mobileMenuToggle) {
        if (elements.sidebar.classList.contains('open')) {
            elements.mobileMenuToggle.innerHTML = '<i class="fas fa-times"></i>';
        } else {
            elements.mobileMenuToggle.innerHTML = '<i class="fas fa-bars"></i>';
        }
    }
}

/**
 * Set up responsive UI behavior
 */
function setupResponsiveUI() {
    const checkResponsive = () => {
        if (window.innerWidth < 768) {
            // Mobile view
            if (elements.mobileMenuToggle) {
                elements.mobileMenuToggle.style.display = 'block';
            }
            elements.sidebar.classList.remove('open');
        } else {
            // Desktop view
            if (elements.mobileMenuToggle) {
                elements.mobileMenuToggle.style.display = 'none';
            }
            elements.sidebar.classList.remove('open');
        }
    };
    
    // Initial check
    checkResponsive();
    
    // Listen for window resize
    window.addEventListener('resize', checkResponsive);
}

/**
 * Update connection status UI
 * @param {boolean} connected - Whether the connection is established
 */
function updateConnectionStatus(connected) {
    if (connected) {
        elements.connectionIndicator.className = 'status-indicator connected';
        elements.connectionText.textContent = 'Connected';
        elements.connectionText.className = 'text-success';
    } else {
        elements.connectionIndicator.className = 'status-indicator disconnected';
        elements.connectionText.textContent = 'Disconnected';
        elements.connectionText.className = 'text-danger';
    }
}

/**
 * Show a notification
 * @param {string} message - The notification message
 * @param {string} type - The notification type (info, success, warning, error)
 */
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    
    // Add icon based on type
    let icon = 'info-circle';
    switch (type) {
        case 'success':
            icon = 'check-circle';
            break;
        case 'warning':
            icon = 'exclamation-triangle';
            break;
        case 'error':
            icon = 'times-circle';
            break;
    }
    
    notification.innerHTML = `
        <div class="notification-icon">
            <i class="fas fa-${icon}"></i>
        </div>
        <div class="notification-content">
            ${message}
        </div>
        <div class="notification-close">
            <i class="fas fa-times"></i>
        </div>
    `;
    
    // Add to container
    elements.notificationContainer.appendChild(notification);
    
    // Add close event
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
        notification.classList.add('notification-hiding');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    });
    
    // Show with animation
    setTimeout(() => {
        notification.classList.add('notification-visible');
    }, 10);
    
    // Auto-hide after a delay (except for errors)
    if (type !== 'error') {
        setTimeout(() => {
            if (notification.parentNode) {
                notification.classList.add('notification-hiding');
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            }
        }, 5000);
    }
}

/**
 * Handle new session form submission
 * @param {Event} event - The form submission event
 */
function handleNewSession(event) {
    event.preventDefault();
    
    // Get form values
    const name = elements.sessionName.value;
    const startUrl = elements.startUrl.value;
    const provider = elements.llmProvider.value;
    const model = elements.modelName.value;
    const goal = elements.sessionGoal.value;
    const headless = elements.headlessMode.checked;
    const screenshots = elements.saveScreenshots.checked;
    
    // Validate URL
    try {
        new URL(startUrl);
    } catch (error) {
        showNotification('Please enter a valid URL', 'error');
        return;
    }
    
    // Create session object
    const session = {
        name,
        startUrl,
        provider,
        model,
        goal,
        headless,
        screenshots
    };
    
    // Send to server
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            type: 'create_session',
            session
        }));
        
        // Show loading notification
        showNotification('Creating new browser session...', 'info');
        
        // Switch to dashboard
        switchView('dashboard');
    } else {
        showNotification('Cannot create session: Not connected to server', 'error');
    }
}

/**
 * Update model options based on selected provider
 */
function updateModelOptions() {
    const provider = elements.llmProvider.value;
    const modelSelect = elements.modelName;
    
    // Clear existing options
    modelSelect.innerHTML = '';
    
    // Add provider-specific options
    switch (provider) {
        case 'openai':
            addOption(modelSelect, 'gpt-3.5-turbo', 'GPT-3.5 Turbo');
            addOption(modelSelect, 'gpt-4', 'GPT-4');
            addOption(modelSelect, 'gpt-4-turbo', 'GPT-4 Turbo');
            break;
            
        case 'claude':
            addOption(modelSelect, 'claude-3-opus-20240229', 'Claude 3 Opus');
            addOption(modelSelect, 'claude-3-sonnet-20240229', 'Claude 3 Sonnet');
            addOption(modelSelect, 'claude-3-haiku-20240307', 'Claude 3 Haiku');
            addOption(modelSelect, 'claude-2.1', 'Claude 2.1');
            break;
            
        case 'gemini':
            addOption(modelSelect, 'gemini-pro', 'Gemini Pro');
            addOption(modelSelect, 'gemini-ultra', 'Gemini Ultra');
            break;
            
        case 'ollama':
            addOption(modelSelect, 'llama3', 'Llama 3');
            addOption(modelSelect, 'mistral', 'Mistral');
            addOption(modelSelect, 'mixtral', 'Mixtral');
            addOption(modelSelect, 'phi3', 'Phi-3');
            break;
            
        case 'deepseek':
            addOption(modelSelect, 'deepseek-coder', 'DeepSeek Coder');
            addOption(modelSelect, 'deepseek-chat', 'DeepSeek Chat');
            break;
            
        case 'openrouter':
            addOption(modelSelect, 'openai/gpt-4-turbo', 'GPT-4 Turbo');
            addOption(modelSelect, 'anthropic/claude-3-opus', 'Claude 3 Opus');
            addOption(modelSelect, 'google/gemini-pro', 'Gemini Pro');
            addOption(modelSelect, 'meta-llama/llama-3-70b-instruct', 'Llama 3 70B');
            break;
    }
}

/**
 * Helper function to add an option to a select element
 * @param {HTMLSelectElement} select - The select element
 * @param {string} value - The option value
 * @param {string} text - The option text
 */
function addOption(select, value, text) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = text;
    select.appendChild(option);
}

/**
 * Request active sessions from the server
 */
function requestActiveSessions() {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            type: 'get_sessions'
        }));
    }
}

/**
 * Update sessions list
 * @param {Array} sessionsList - List of sessions from the server
 */
function updateSessions(sessionsList) {
    sessions = sessionsList;
    
    // Clear sessions container
    elements.sessionsContainer.innerHTML = '';
    
    if (sessions.length === 0) {
        // Show no sessions message
        elements.sessionsContainer.innerHTML = `
            <div class="card session-card">
                <div class="card-header">
                    <h2>No Active Sessions</h2>
                </div>
                <div class="card-body text-center">
                    <p class="text-secondary mb-2">You don't have any active browser sessions.</p>
                    <button class="btn" id="create-first-session">
                        <i class="fas fa-plus"></i> Create Your First Session
                    </button>
                </div>
            </div>
        `;
        
        // Add event listener
        const createFirstBtn = document.getElementById('create-first-session');
        if (createFirstBtn) {
            createFirstBtn.addEventListener('click', () => switchView('new-session'));
        }
    } else {
        // Create session cards
        sessions.forEach(session => {
            const card = createSessionCard(session);
            elements.sessionsContainer.appendChild(card);
        });
    }
}

/**
 * Create a session card element
 * @param {Object} session - The session object
 * @returns {HTMLElement} - The session card element
 */
function createSessionCard(session) {
    const card = document.createElement('div');
    card.className = 'card session-card';
    card.setAttribute('data-session-id', session.id);
    
    // Status class
    let statusClass = 'status-pending';
    let statusText = 'Pending';
    
    if (session.status === 'active') {
        statusClass = 'status-active';
        statusText = 'Active';
    } else if (session.status === 'error') {
        statusClass = 'status-error';
        statusText = 'Error';
    } else if (session.status === 'completed') {
        statusClass = 'status-completed';
        statusText = 'Completed';
    }
    
    card.innerHTML = `
        <div class="card-header">
            <h2>${session.name}</h2>
            <span class="session-status ${statusClass}">${statusText}</span>
        </div>
        <div class="card-body">
            <p class="mb-1"><strong>URL:</strong> ${session.currentUrl || session.startUrl}</p>
            <p class="mb-1"><strong>Provider:</strong> ${session.provider} (${session.model})</p>
            <p class="mb-1"><strong>Goal:</strong> ${session.goal || 'No goal specified'}</p>
            <div class="progress-container mb-2">
                <div class="progress-bar" style="width: ${session.progress || 0}%"></div>
            </div>
            <div class="d-flex justify-between">
                <button class="btn btn-sm view-session-btn" data-session-id="${session.id}">
                    <i class="fas fa-eye"></i> View
                </button>
                <button class="btn btn-sm btn-danger stop-session-btn" data-session-id="${session.id}">
                    <i class="fas fa-stop"></i> Stop
                </button>
            </div>
        </div>
    `;
    
    // Add event listeners
    setTimeout(() => {
        const viewBtn = card.querySelector('.view-session-btn');
        const stopBtn = card.querySelector('.stop-session-btn');
        
        if (viewBtn) {
            viewBtn.addEventListener('click', () => viewSession(session.id));
        }
        
        if (stopBtn) {
            stopBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                stopSession(session.id);
            });
        }
    }, 0);
    
    return card;
}

/**
 * View a session
 * @param {string} sessionId - The session ID
 */
function viewSession(sessionId) {
    // Find session
    const session = sessions.find(s => s.id === sessionId);
    
    if (!session) {
        showNotification('Session not found', 'error');
        return;
    }
    
    // Set active session
    activeSession = session;
    
    // Update session view
    updateActiveSessionView(session);
    
    // Subscribe to session updates
    subscribeToSession(sessionId);
    
    // Show session view
    switchView('active-session');
    
    // Start duration timer
    startDurationTimer();
    
    // Show session nav item
    const sessionNavItem = document.querySelector('.nav-item[data-view="active-session"]');
    if (sessionNavItem) {
        sessionNavItem.style.display = 'flex';
    }
}

/**
 * Update active session view
 * @param {Object} session - The session object
 */
function updateActiveSessionView(session) {
    // Update title and status
    elements.sessionTitleText.textContent = session.name;
    
    // Update status badge
    let statusClass = 'pending';
    let statusText = 'Pending';
    
    if (session.status === 'active') {
        statusClass = 'active';
        statusText = 'Active';
    } else if (session.status === 'error') {
        statusClass = 'error';
        statusText = 'Error';
    } else if (session.status === 'completed') {
        statusClass = 'completed';
        statusText = 'Completed';
    }
    
    elements.sessionStatusBadge.className = `session-status ${statusClass}`;
    elements.sessionStatusBadge.textContent = statusText;
    elements.statusText.textContent = statusText;
    elements.statusText.className = `text-${statusClass === 'active' ? 'success' : statusClass}`;
    
    // Update provider info
    elements.providerText.textContent = `${session.provider} (${session.model})`;
    
    // Update URL
    elements.currentUrlText.textContent = session.currentUrl || session.startUrl;
    elements.navigationUrl.value = session.currentUrl || session.startUrl;
    
    // Update progress
    elements.sessionProgress.style.width = `${session.progress || 0}%`;
    
    // Update screenshot if available
    if (session.screenshot) {
        elements.browserScreenshot.src = session.screenshot;
    }
    
    // Clear logs and milestones
    elements.logsContainer.innerHTML = '';
    elements.milestonesContainer.innerHTML = '';
    
    // Add initial log
    addLogEntry(session.id, 'info', 'Session loaded. Waiting for updates...');
}

/**
 * Subscribe to session updates
 * @param {string} sessionId - The session ID
 */
function subscribeToSession(sessionId) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            type: 'subscribe',
            sessionId
        }));
    }
}

/**
 * Start the duration timer
 */
function startDurationTimer() {
    // Clear existing interval
    if (durationInterval) {
        clearInterval(durationInterval);
    }
    
    // Set start time
    sessionStartTime = new Date();
    
    // Update duration immediately
    updateDuration();
    
    // Set interval to update duration
    durationInterval = setInterval(updateDuration, 1000);
}

/**
 * Update session duration display
 */
function updateDuration() {
    if (!sessionStartTime) return;
    
    const now = new Date();
    const diff = now - sessionStartTime;
    
    // Format as HH:MM:SS
    const hours = Math.floor(diff / 3600000).toString().padStart(2, '0');
    const minutes = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
    const seconds = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
    
    elements.durationText.textContent = `${hours}:${minutes}:${seconds}`;
}

/**
 * Stop a session
 * @param {string} sessionId - The session ID
 */
function stopSession(sessionId) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            type: 'stop_session',
            sessionId
        }));
        
        showNotification('Stopping session...', 'info');
    }
}

/**
 * Stop the active session
 */
function stopActiveSession() {
    if (activeSession) {
        stopSession(activeSession.id);
    }
}

/**
 * Request a screenshot
 */
function requestScreenshot() {
    if (activeSession && socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            type: 'take_screenshot',
            sessionId: activeSession.id
        }));
        
        showNotification('Taking screenshot...', 'info');
    }
}

/**
 * Navigate to a URL
 */
function navigateTo() {
    const url = elements.navigationUrl.value;
    
    // Validate URL
    try {
        new URL(url);
    } catch (error) {
        showNotification('Please enter a valid URL', 'error');
        return;
    }
    
    if (activeSession && socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            type: 'navigate',
            sessionId: activeSession.id,
            url
        }));
        
        showNotification(`Navigating to ${url}...`, 'info');
    }
}

/**
 * Clear logs
 */
function clearLogs() {
    elements.logsContainer.innerHTML = '';
    addLogEntry(activeSession.id, 'info', 'Logs cleared.');
}

/**
 * Send a human message to the agent
 */
function sendHumanMessage() {
    const message = elements.humanMessage.value.trim();
    
    if (!message) {
        return;
    }
    
    if (activeSession && socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            type: 'human_message',
            sessionId: activeSession.id,
            message
        }));
        
        // Add to logs
        addLogEntry(activeSession.id, 'human', message);
        
        // Clear input
        elements.humanMessage.value = '';
    }
}

/**
 * Add a log entry
 * @param {string} sessionId - The session ID
 * @param {string} level - The log level (info, warning, error, success, human)
 * @param {string} message - The log message
 */
function addLogEntry(sessionId, level, message) {
    // Only add if it's for the active session
    if (!activeSession || activeSession.id !== sessionId) {
        return;
    }
    
    const logEntry = document.createElement('div');
    logEntry.className = 'log-entry';
    
    // Get current time
    const now = new Date();
    const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    
    logEntry.innerHTML = `
        <span class="log-time">${time}</span>
        <div class="log-message log-${level}">${message}</div>
    `;
    
    elements.logsContainer.appendChild(logEntry);
    
    // Scroll to bottom
    elements.logsContainer.scrollTop = elements.logsContainer.scrollHeight;
}

/**
 * Add a milestone
 * @param {string} sessionId - The session ID
 * @param {Object} milestone - The milestone object
 */
function addMilestone(sessionId, milestone) {
    // Only add if it's for the active session
    if (!activeSession || activeSession.id !== sessionId) {
        return;
    }
    
    const milestoneItem = document.createElement('div');
    milestoneItem.className = 'timeline-item';
    
    // Get formatted time
    const time = milestone.time || new Date().toLocaleTimeString();
    
    milestoneItem.innerHTML = `
        <div class="timeline-dot">
            <i class="fas fa-check"></i>
        </div>
        <div class="timeline-content">
            <div class="timeline-time">${time}</div>
            <div class="timeline-title">${milestone.title}</div>
            <div class="timeline-description">${milestone.description || ''}</div>
        </div>
    `;
    
    elements.milestonesContainer.appendChild(milestoneItem);
}

/**
 * Update screenshot
 * @param {string} sessionId - The session ID
 * @param {string} screenshot - The screenshot data URL
 */
function updateScreenshot(sessionId, screenshot) {
    // Update for active session
    if (activeSession && activeSession.id === sessionId) {
        elements.browserScreenshot.src = screenshot;
    }
    
    // Update in sessions list
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
        session.screenshot = screenshot;
    }
}

/**
 * Update current URL
 * @param {string} sessionId - The session ID
 * @param {string} url - The current URL
 */
function updateCurrentUrl(sessionId, url) {
    // Update for active session
    if (activeSession && activeSession.id === sessionId) {
        elements.currentUrlText.textContent = url;
        elements.navigationUrl.value = url;
    }
    
    // Update in sessions list
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
        session.currentUrl = url;
        
        // Update session card if visible
        const card = document.querySelector(`.session-card[data-session-id="${sessionId}"]`);
        if (card) {
            const urlElement = card.querySelector('p:first-of-type');
            if (urlElement) {
                urlElement.innerHTML = `<strong>URL:</strong> ${url}`;
            }
        }
    }
}

/**
 * Update progress
 * @param {string} sessionId - The session ID
 * @param {number} progress - The progress percentage
 */
function updateProgress(sessionId, progress) {
    // Update for active session
    if (activeSession && activeSession.id === sessionId) {
        elements.sessionProgress.style.width = `${progress}%`;
    }
    
    // Update in sessions list
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
        session.progress = progress;
        
        // Update session card if visible
        const card = document.querySelector(`.session-card[data-session-id="${sessionId}"]`);
        if (card) {
            const progressBar = card.querySelector('.progress-bar');
            if (progressBar) {
                progressBar.style.width = `${progress}%`;
            }
        }
    }
}

/**
 * Update session status
 * @param {Object} updatedSession - The updated session object
 */
function updateSessionStatus(updatedSession) {
    // Find session in list
    const index = sessions.findIndex(s => s.id === updatedSession.id);
    
    if (index !== -1) {
        // Update session
        sessions[index] = { ...sessions[index], ...updatedSession };
        
        // Update UI if it's the active session
        if (activeSession && activeSession.id === updatedSession.id) {
            activeSession = sessions[index];
            updateActiveSessionView(activeSession);
        }
        
        // Update session card if visible
        const card = document.querySelector(`.session-card[data-session-id="${updatedSession.id}"]`);
        if (card) {
            // Remove old card
            card.parentNode.removeChild(card);
            
            // Add updated card
            const newCard = createSessionCard(sessions[index]);
            elements.sessionsContainer.appendChild(newCard);
        }
    } else {
        // New session, add to list
        sessions.push(updatedSession);
        
        // Update sessions container
        updateSessions(sessions);
    }
}

/**
 * Switch theme
 * @param {string} theme - The theme to switch to ('light' or 'dark')
 */
function switchTheme(theme) {
    currentTheme = theme;
    applyTheme(theme);
    localStorage.setItem('theme', theme);
    
    // Update theme buttons
    if (elements.lightThemeBtn) {
        elements.lightThemeBtn.className = theme === 'light' ? 'btn' : 'btn btn-secondary';
    }
    
    if (elements.darkThemeBtn) {
        elements.darkThemeBtn.className = theme === 'dark' ? 'btn' : 'btn btn-secondary';
    }
    
    // Update theme toggle icon
    if (elements.themeToggle) {
        elements.themeToggle.innerHTML = theme === 'dark' ? 
            '<i class="fas fa-moon"></i>' : 
            '<i class="fas fa-sun"></i>';
    }
}

/**
 * Toggle between light and dark theme
 */
function toggleTheme() {
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    switchTheme(newTheme);
}

/**
 * Apply theme to document
 * @param {string} theme - The theme to apply ('light' or 'dark')
 */
function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
}

/**
 * Load settings from localStorage
 */
function loadSettings() {
    // Theme
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        switchTheme(savedTheme);
    }
    
    // Default provider
    const defaultProvider = localStorage.getItem('defaultProvider');
    if (defaultProvider && elements.defaultProvider) {
        elements.defaultProvider.value = defaultProvider;
    }
    
    // Default model
    const defaultModel = localStorage.getItem('defaultModel');
    if (defaultModel && elements.defaultModel) {
        elements.defaultModel.value = defaultModel;
    }
    
    // Screenshot quality
    const screenshotQuality = localStorage.getItem('screenshotQuality');
    if (screenshotQuality && elements.screenshotQuality) {
        elements.screenshotQuality.value = screenshotQuality;
    }
    
    // Default timeout
    const defaultTimeout = localStorage.getItem('defaultTimeout');
    if (defaultTimeout && elements.defaultTimeout) {
        elements.defaultTimeout.value = defaultTimeout;
    }
    
    // Apply default provider to new session form
    if (defaultProvider && elements.llmProvider) {
        elements.llmProvider.value = defaultProvider;
        updateModelOptions();
        
        // Apply default model if available
        if (defaultModel && elements.modelName) {
            setTimeout(() => {
                try {
                    elements.modelName.value = defaultModel;
                } catch (e) {
                    // Model might not be available for this provider
                }
            }, 0);
        }
    }
}

/**
 * Save settings to localStorage
 */
function saveSettings() {
    // Save theme (already saved in switchTheme)
    
    // Save provider
    if (elements.defaultProvider) {
        localStorage.setItem('defaultProvider', elements.defaultProvider.value);
    }
    
    // Save model
    if (elements.defaultModel) {
        localStorage.setItem('defaultModel', elements.defaultModel.value);
    }
    
    // Save screenshot quality
    if (elements.screenshotQuality) {
        localStorage.setItem('screenshotQuality', elements.screenshotQuality.value);
    }
    
    // Save default timeout
    if (elements.defaultTimeout) {
        localStorage.setItem('defaultTimeout', elements.defaultTimeout.value);
    }
    
    // Send settings to server
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            type: 'update_settings',
            settings: {
                defaultProvider: elements.defaultProvider?.value,
                defaultModel: elements.defaultModel?.value,
                screenshotQuality: elements.screenshotQuality?.value,
                defaultTimeout: parseInt(elements.defaultTimeout?.value || '30')
            }
        }));
    }
    
    showNotification('Settings saved successfully', 'success');
}
