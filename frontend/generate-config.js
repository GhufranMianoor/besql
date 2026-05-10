const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, 'js', 'config.js');

// Default values (from environment variables or empty)
const url = process.env.SUPABASE_URL || '';
const key = process.env.SUPABASE_ANON_KEY || '';

const content = `// Auto-generated during build
window.SUPABASE_URL = "${url}";
window.SUPABASE_ANON_KEY = "${key}";
`;

fs.writeFileSync(configPath, content);
console.log(`Generated config.js at ${configPath}`);
