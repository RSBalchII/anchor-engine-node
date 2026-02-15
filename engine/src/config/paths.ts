/**
 * Path Configuration for Sovereign Context Engine
 * 
 * Defines all the important paths used by the system.
 */

import * as path from 'path';
import * as os from 'os';


import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define base paths
export const PROJECT_ROOT = path.resolve(process.env['PROJECT_ROOT'] || path.join(__dirname, '..', '..'));
export const CONTEXT_DIR = path.resolve(process.env['CONTEXT_DIR'] || path.join(PROJECT_ROOT, 'context'));
export const MODELS_DIR = path.resolve(process.env['MODELS_DIR'] || path.join(PROJECT_ROOT, '..', '..', '..', 'models'));
export const DIST_DIR = path.resolve(process.env['DIST_DIR'] || path.join(PROJECT_ROOT, 'dist'));
export const BASE_PATH = PROJECT_ROOT;
export const LOGS_DIR = path.join(PROJECT_ROOT, 'logs');
export const NOTEBOOK_DIR = path.resolve(process.env['NOTEBOOK_DIR'] || path.join(PROJECT_ROOT, '..', '..', 'notebook'));

// Define specific paths
const PATHS = {
  PROJECT_ROOT,
  CONTEXT_DIR,
  MODELS_DIR,
  DIST_DIR,
  BACKUPS_DIR: path.join(PROJECT_ROOT, 'backups'),
  LOGS_DIR: path.join(PROJECT_ROOT, 'logs'),
  CONFIG_FILE: path.join(PROJECT_ROOT, 'sovereign.yaml'),
  USER_SETTINGS: path.join(PROJECT_ROOT, 'user_settings.json'),
  DATABASE_FILE: path.join(CONTEXT_DIR, 'context.db'),
  INBOX_DIR: path.join(CONTEXT_DIR, 'inbox'),
  LIBRARIES_DIR: path.join(CONTEXT_DIR, 'libraries'),
  MIRRORS_DIR: path.join(CONTEXT_DIR, 'mirrors'),
  SESSIONS_DIR: path.join(CONTEXT_DIR, 'sessions'),
  TEMP_DIR: path.join(os.tmpdir(), 'sovereign-context-engine'),
  ENGINE_BIN: path.join(PROJECT_ROOT, 'engine', 'bin'),
  ENGINE_SRC: path.join(PROJECT_ROOT, 'engine', 'src'),
  ENGINE_DIST: path.join(PROJECT_ROOT, 'engine', 'dist'),
  DESKTOP_OVERLAY_SRC: path.join(PROJECT_ROOT, 'desktop-overlay', 'src'),
  DESKTOP_OVERLAY_DIST: path.join(PROJECT_ROOT, 'desktop-overlay', 'dist'),
};

export default PATHS;