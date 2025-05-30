import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Enhanced validation of environment variables
if (!supabaseUrl) {
  throw new Error('Missing VITE_SUPABASE_URL environment variable. Please check your .env file.');
}

if (!supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_ANON_KEY environment variable. Please check your .env file.');
}

// Validate URL format and ensure it includes the required path
try {
  const url = new URL(supabaseUrl);
} catch (error) {
  throw new Error(`Invalid VITE_SUPABASE_URL format: ${supabaseUrl}`);
}

// Enhanced client configuration with better error handling and offline detection
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storageKey: 'novel-platform-auth',
    storage: window.localStorage
  },
  global: {
    headers: {
      'x-application-name': 'novel-platform-admin'
    }
  },
  db: {
    schema: 'public'
  },
  // Add retry configuration with increased timeout
  realtime: {
    params: {
      eventsPerSecond: 2
    }
  }
});

// Check if the browser is online
const isOnline = () => {
  return typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean'
    ? navigator.onLine
    : true;
};

// Enhanced connection test with detailed error reporting and increased timeout
export const testConnection = async (timeout = 10000) => {
  if (!isOnline()) {
    throw new Error('No internet connection available. Please check your network.');
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const startTime = Date.now();
    const { error } = await supabase.from('books').select('id').limit(1).abortSignal(controller.signal);
    const endTime = Date.now();
    
    clearTimeout(timeoutId);

    if (error) {
      console.error('Supabase connection error details:', {
        code: error.code,
        message: error.message,
        hint: error.hint,
        details: error.details
      });
      
      // Handle specific error cases
      if (error.code === 'PGRST301' || error.code === '20201') {
        throw new Error('Authentication failed. Please check your Supabase credentials.');
      } else if (error.code === '23505') {
        throw new Error('Database constraint violation. Please check your data.');
      } else if (error.code === '42P01') {
        throw new Error('Table not found. Please check your database schema.');
      }
      
      throw new Error(`Supabase connection test failed: ${error.message}`);
    }

    console.log(`Supabase connection successful (${endTime - startTime}ms)`);
    return true;
  } catch (err) {
    if (!isOnline()) {
      throw new Error('Network connection lost during request');
    }
    
    // Check if it's a timeout
    if (err.name === 'AbortError') {
      throw new Error('Connection timed out. The server is taking too long to respond.');
    }
    
    // Check if it's a network error
    if (err instanceof TypeError && err.message === 'Failed to fetch') {
      throw new Error('Network error: Unable to reach Supabase. Please check your internet connection and Supabase URL.');
    }
    
    console.error('Supabase connection error:', err);
    throw err;
  }
};

// Enhanced retry utility function with exponential backoff and jitter
export const retryOperation = async (
  operation: () => Promise<any>,
  maxAttempts = 5, // Increased max attempts
  baseDelay = 1000,
  maxDelay = 15000 // Increased max delay
) => {
  let attempt = 1;
  
  while (attempt <= maxAttempts) {
    try {
      if (!isOnline()) {
        await new Promise(resolve => {
          const checkOnline = () => {
            if (isOnline()) {
              window.removeEventListener('online', checkOnline);
              resolve(true);
            }
          };
          window.addEventListener('online', checkOnline);
        });
      }

      return await operation();
    } catch (error) {
      if (attempt === maxAttempts) {
        throw error;
      }
      
      // Add jitter to prevent thundering herd
      const jitter = Math.random() * 200;
      const delay = Math.min(
        (baseDelay * Math.pow(2, attempt - 1)) + jitter,
        maxDelay
      );
      
      console.warn(`Operation failed, retrying in ${Math.round(delay)}ms (attempt ${attempt}/${maxAttempts})`, error);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      attempt++;
    }
  }
};

// Wrap Supabase operations with retry logic
export const withRetry = async <T>(
  operation: () => Promise<T>,
  options = { maxAttempts: 5, baseDelay: 1000, maxDelay: 15000 }
): Promise<T> => {
  return retryOperation(
    operation,
    options.maxAttempts,
    options.baseDelay,
    options.maxDelay
  );
};

// Listen for online/offline events
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('Internet connection restored');
    // Optionally trigger any pending operations
    testConnection().catch(console.error);
  });

  window.addEventListener('offline', () => {
    console.log('Internet connection lost');
    // Optionally pause any ongoing operations
  });
}

// Initialize connection test with retry
withRetry(testConnection, { maxAttempts: 3, baseDelay: 2000 })
  .catch(error => {
    console.error('Failed to establish Supabase connection after retries:', error);
  });