import express from 'express';
import http from 'http';
import path from 'path';
import { WebSocketServer } from 'ws';
import WebSocket from 'ws';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';
import { runGraph, stopAgent } from './automation.js';
import { launchBrowser, createPage, getPageState, GraphContext } from './browserExecutor.js';
import logger from './utils/logger.js';
import fs from 'fs/promises';
import { existsSync } from 'fs';

// Load environment variables
dotenv.config();

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Express app
const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Session management
interface BrowserSession {
  id: string;
  context: GraphContext;
  status: 'initializing' | 'running' | 'paused' | 'stopped' | 'error';
  startTime: number;
  lastUpdate: number;
  error?: string;
  logs: string[];
  screenshots: string[];
}

const sessions: Map<string, BrowserSession> = new Map();
const sessionClients: Map<string, Set<WebSocket>> = new Map();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the public directory
const publicPath = path.join(__dirname, '../public');
if (existsSync(publicPath)) {
  app.use(express.static(publicPath));
}

// WebSocket connection handling
wss.on('connection', (ws: WebSocket) => {
  let sessionId: string | null = null;

  ws.on('message', (message: string) => {
    try {
      const data = JSON.parse(message);
      
      // Handle session subscription
      if (data.type === 'subscribe' && data.sessionId) {
        sessionId = data.sessionId;
        
        if (!sessionClients.has(sessionId)) {
          sessionClients.set(sessionId, new Set());
        }
        
        const clients = sessionClients.get(sessionId);
        if (clients && sessionId) {
          clients.add(ws);
        }
        
        // Send initial session data if available
        const session = sessions.get(sessionId);
        if (session) {
          ws.send(JSON.stringify({
            type: 'session_update',
            session: sanitizeSession(session)
          }));
        }
      }
      // Handle browser commands
      else if (data.type === 'command' && sessionId && data.command) {
        handleBrowserCommand(sessionId, data.command, data.params);
      }
    } catch (error) {
      logger.error('WebSocket message error', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Invalid message format'
      }));
    }
  });

  ws.on('close', () => {
    if (sessionId && sessionClients.has(sessionId)) {
      const clients = sessionClients.get(sessionId);
      if (clients) {
        clients.delete(ws);
      }
      
      // Clean up empty client sets
      if (sessionClients.get(sessionId)?.size === 0) {
        sessionClients.delete(sessionId);
      }
    }
  });

  // Send initial list of sessions
  ws.send(JSON.stringify({
    type: 'sessions_list',
    sessions: Array.from(sessions.values()).map(sanitizeSession)
  }));
});

// Helper to sanitize session data for client
function sanitizeSession(session: BrowserSession): any {
  // Create a safe copy without circular references
  return {
    id: session.id,
    status: session.status,
    startTime: session.startTime,
    lastUpdate: session.lastUpdate,
    error: session.error,
    logs: session.logs.slice(-50), // Send only the last 50 logs
    screenshots: session.screenshots,
    url: session.context.page?.url() || null,
    title: session.context.page ? getPageTitle(session.context) : null,
    goal: session.context.userGoal || null,
    history: session.context.history ? session.context.history.slice(-10) : [],
    successCount: session.context.successCount || 0,
    milestones: session.context.recognizedMilestones || []
  };
}

// Helper to get page title safely
async function getPageTitle(context: GraphContext): Promise<string | null> {
  if (!context.page) return null;
  
  try {
    return await context.page.title();
  } catch (error) {
    return null;
  }
}

// Broadcast session update to all connected clients
function broadcastSessionUpdate(sessionId: string) {
  const session = sessions.get(sessionId);
  if (!session || !sessionClients.has(sessionId)) return;
  
  const clients = sessionClients.get(sessionId);
  const update = JSON.stringify({
    type: 'session_update',
    session: sanitizeSession(session)
  });
  
  clients?.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(update);
    }
  });
}

// Broadcast global sessions list update
function broadcastSessionsList() {
  const sessionsList = Array.from(sessions.values()).map(sanitizeSession);
  const update = JSON.stringify({
    type: 'sessions_list',
    sessions: sessionsList
  });
  
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(update);
    }
  });
}

// Handle browser commands
async function handleBrowserCommand(sessionId: string, command: string, params: any = {}) {
  const session = sessions.get(sessionId);
  if (!session) return;
  
  try {
    switch (command) {
      case 'stop':
        await stopSession(sessionId);
        break;
        
      case 'navigate':
        if (params.url && session.context.page) {
          await session.context.page.goto(params.url);
          session.logs.push(`Navigated to: ${params.url}`);
          session.lastUpdate = Date.now();
        }
        break;
        
      case 'screenshot':
        if (session.context.page) {
          const screenshotDir = process.env.SCREENSHOT_DIR || "./screenshots";
          const screenshotPath = path.join(screenshotDir, `session-${sessionId}-${Date.now()}.png`);
          await fs.mkdir(path.dirname(screenshotPath), { recursive: true });
          await session.context.page.screenshot({ path: screenshotPath });
          session.screenshots.push(screenshotPath);
          session.logs.push(`Screenshot saved: ${screenshotPath}`);
          session.lastUpdate = Date.now();
        }
        break;
        
      case 'send_human_message':
        if (params.message && session.context) {
          // Add the message to the context for the agent to process
          session.context.actionFeedback = `👤 HUMAN INSTRUCTION: ${params.message}`;
          session.context.history.push(`Human instruction: "${params.message}"`);
          session.logs.push(`Human message sent: ${params.message}`);
          session.lastUpdate = Date.now();
        }
        break;
        
      default:
        session.logs.push(`Unknown command: ${command}`);
        break;
    }
    
    broadcastSessionUpdate(sessionId);
  } catch (error) {
    logger.error(`Error executing command ${command}`, error);
    session.logs.push(`Error executing command ${command}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    session.lastUpdate = Date.now();
    broadcastSessionUpdate(sessionId);
  }
}

// Stop a browser session
async function stopSession(sessionId: string) {
  const session = sessions.get(sessionId);
  if (!session) return;
  
  try {
    // Stop the agent
    await stopAgent();
    
    // Close the browser if it exists
    if (session.context.browser) {
      await session.context.browser.close();
    }
    
    // Update session status
    session.status = 'stopped';
    session.lastUpdate = Date.now();
    session.logs.push('Session stopped');
    
    broadcastSessionUpdate(sessionId);
    broadcastSessionsList();
  } catch (error) {
    logger.error('Error stopping session', error);
    session.status = 'error';
    session.error = error instanceof Error ? error.message : 'Unknown error';
    session.lastUpdate = Date.now();
    
    broadcastSessionUpdate(sessionId);
    broadcastSessionsList();
  }
}

// API Routes

// Get all sessions
app.get('/api/sessions', (req, res) => {
  const sessionsList = Array.from(sessions.values()).map(sanitizeSession);
  res.json({ sessions: sessionsList });
});

// Get a specific session
app.get('/api/sessions/:id', (req, res) => {
  const session = sessions.get(req.params.id);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  res.json({ session: sanitizeSession(session) });
});

// Start a new browser session
app.post('/api/sessions', async (req, res) => {
  try {
    const { goal, startUrl, llmProvider } = req.body;
    
    if (!goal) {
      return res.status(400).json({ error: 'Goal is required' });
    }
    
    // Generate a unique session ID
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    // Create a new session
    const session: BrowserSession = {
      id: sessionId,
      context: { 
        history: [],
        userGoal: goal,
        successfulActions: [],
        lastActionSuccess: false,
        successCount: 0,
        milestones: [],
        recognizedMilestones: []
      },
      status: 'initializing',
      startTime: Date.now(),
      lastUpdate: Date.now(),
      logs: [`Session created with goal: ${goal}`],
      screenshots: []
    };
    
    // Store LLM provider if specified
    if (llmProvider) {
      process.env.LLM_PROVIDER = llmProvider;
      session.logs.push(`Using LLM provider: ${llmProvider}`);
    }
    
    // Store the session
    sessions.set(sessionId, session);
    
    // Initialize browser in background
    initializeSession(sessionId, startUrl).catch(error => {
      logger.error('Session initialization error', error);
      session.status = 'error';
      session.error = error instanceof Error ? error.message : 'Unknown error';
      session.lastUpdate = Date.now();
      session.logs.push(`Initialization error: ${session.error}`);
      
      broadcastSessionUpdate(sessionId);
      broadcastSessionsList();
    });
    
    // Return the session ID immediately
    res.status(201).json({ 
      id: sessionId,
      status: session.status
    });
    
    // Broadcast sessions list update
    broadcastSessionsList();
  } catch (error) {
    logger.error('Error creating session', error);
    res.status(500).json({ 
      error: 'Failed to create session',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Initialize a browser session
async function initializeSession(sessionId: string, startUrl?: string) {
  const session = sessions.get(sessionId);
  if (!session) return;
  
  try {
    // Launch browser
    session.logs.push('Launching browser...');
    session.context.browser = await launchBrowser();
    
    // Create page
    session.logs.push('Creating page...');
    session.context.page = await createPage(session.context.browser);
    
    // Navigate to start URL if provided
    if (startUrl) {
      session.logs.push(`Navigating to start URL: ${startUrl}`);
      await session.context.page.goto(startUrl);
    }
    
    // Take initial screenshot
    const screenshotDir = process.env.SCREENSHOT_DIR || "./screenshots";
    const screenshotPath = path.join(screenshotDir, `session-${sessionId}-initial.png`);
    await fs.mkdir(path.dirname(screenshotPath), { recursive: true });
    await session.context.page.screenshot({ path: screenshotPath });
    session.screenshots.push(screenshotPath);
    
    // Update session status
    session.status = 'running';
    session.lastUpdate = Date.now();
    session.logs.push('Session initialized successfully');
    
    // Broadcast updates
    broadcastSessionUpdate(sessionId);
    broadcastSessionsList();
    
    // Start automation in background
    runAutomation(sessionId).catch(error => {
      logger.error('Automation error', error);
      session.status = 'error';
      session.error = error instanceof Error ? error.message : 'Unknown error';
      session.lastUpdate = Date.now();
      session.logs.push(`Automation error: ${session.error}`);
      
      broadcastSessionUpdate(sessionId);
      broadcastSessionsList();
    });
  } catch (error) {
    logger.error('Session initialization error', error);
    session.status = 'error';
    session.error = error instanceof Error ? error.message : 'Unknown error';
    session.lastUpdate = Date.now();
    session.logs.push(`Initialization error: ${session.error}`);
    
    broadcastSessionUpdate(sessionId);
    broadcastSessionsList();
    throw error;
  }
}

// Run automation for a session
async function runAutomation(sessionId: string) {
  const session = sessions.get(sessionId);
  if (!session || !session.context.browser || !session.context.page) return;
  
  try {
    // Set up logging interceptor to capture logs
    const originalInfo = logger.info;
    const originalError = logger.error;
    const originalWarn = logger.warn;
    
    // Override logger methods to capture logs
    logger.info = function(message: string, ...args: any[]) {
      session.logs.push(`INFO: ${message}`);
      session.lastUpdate = Date.now();
      broadcastSessionUpdate(sessionId);
      return originalInfo.call(logger, message, ...args);
    };
    
    logger.error = function(message: string, ...args: any[]) {
      session.logs.push(`ERROR: ${message}`);
      session.lastUpdate = Date.now();
      broadcastSessionUpdate(sessionId);
      return originalError.call(logger, message, ...args);
    };
    
    logger.warn = function(message: string, ...args: any[]) {
      session.logs.push(`WARN: ${message}`);
      session.lastUpdate = Date.now();
      broadcastSessionUpdate(sessionId);
      return originalWarn.call(logger, message, ...args);
    };
    
    // Set up page event handlers
    session.context.page.on('load', async () => {
      try {
        const url = session.context.page?.url();
        const title = await session.context.page?.title();
        session.logs.push(`Page loaded: ${title} (${url})`);
        session.lastUpdate = Date.now();
        
        // Take screenshot on page load
        const screenshotDir = process.env.SCREENSHOT_DIR || "./screenshots";
        const screenshotPath = path.join(screenshotDir, `session-${sessionId}-${Date.now()}.png`);
        await fs.mkdir(path.dirname(screenshotPath), { recursive: true });
        await session.context.page?.screenshot({ path: screenshotPath });
        session.screenshots.push(screenshotPath);
        
        broadcastSessionUpdate(sessionId);
      } catch (error) {
        logger.error('Error handling page load event', error);
      }
    });
    
    // Run the automation
    session.logs.push('Starting automation...');
    session.status = 'running';
    broadcastSessionUpdate(sessionId);
    
    // Use the existing context to run the graph
    await runGraph();
    
    // Update session status on completion
    session.status = 'stopped';
    session.lastUpdate = Date.now();
    session.logs.push('Automation completed');
    
    // Restore original logger methods
    logger.info = originalInfo;
    logger.error = originalError;
    logger.warn = originalWarn;
    
    broadcastSessionUpdate(sessionId);
    broadcastSessionsList();
  } catch (error) {
    logger.error('Automation error', error);
    session.status = 'error';
    session.error = error instanceof Error ? error.message : 'Unknown error';
    session.lastUpdate = Date.now();
    session.logs.push(`Automation error: ${session.error}`);
    
    broadcastSessionUpdate(sessionId);
    broadcastSessionsList();
  }
}

// Stop a session
app.post('/api/sessions/:id/stop', async (req, res) => {
  const sessionId = req.params.id;
  const session = sessions.get(sessionId);
  
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  try {
    await stopSession(sessionId);
    res.json({ message: 'Session stopped successfully' });
  } catch (error) {
    logger.error('Error stopping session', error);
    res.status(500).json({ 
      error: 'Failed to stop session',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Send a command to a session
app.post('/api/sessions/:id/command', async (req, res) => {
  const sessionId = req.params.id;
  const { command, params } = req.body;
  
  const session = sessions.get(sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  if (!command) {
    return res.status(400).json({ error: 'Command is required' });
  }
  
  try {
    await handleBrowserCommand(sessionId, command, params);
    res.json({ message: 'Command executed successfully' });
  } catch (error) {
    logger.error(`Error executing command ${command}`, error);
    res.status(500).json({ 
      error: 'Failed to execute command',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get screenshots for a session
app.get('/api/sessions/:id/screenshots', (req, res) => {
  const sessionId = req.params.id;
  const session = sessions.get(sessionId);
  
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  res.json({ screenshots: session.screenshots });
});

// Serve screenshots
app.get('/screenshots/:filename', async (req, res) => {
  const filename = req.params.filename;
  const screenshotDir = process.env.SCREENSHOT_DIR || "./screenshots";
  const filePath = path.join(screenshotDir, filename);
  
  try {
    await fs.access(filePath);
    res.sendFile(filePath);
  } catch (error) {
    res.status(404).json({ error: 'Screenshot not found' });
  }
});

// Serve the main HTML page for any other route (for SPA support)
app.get('*', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`WebSocket server running on ws://localhost:${PORT}`);
});

export { app, server, wss };
