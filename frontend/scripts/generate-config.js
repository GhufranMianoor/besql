const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '../../.env');
const configPath = path.resolve(__dirname, '../js/config.js');

let envContent = '';
try {
  envContent = fs.readFileSync(envPath, 'utf8');
} catch (err) {
  console.error('Error reading .env file:', err);
  process.exit(1);
}

const config = {};
for (const line of envContent.split('\n')) {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    if (key === 'SUPABASE_URL' || key === 'SUPABASE_ANON_KEY') {
      config[key] = value;
    }
  }
}

const configContent = `window.SUPABASE_URL = ${JSON.stringify(config.SUPABASE_URL || '')};
window.SUPABASE_ANON_KEY = ${JSON.stringify(config.SUPABASE_ANON_KEY || '')};
`;

try {
  fs.writeFileSync(configPath, configContent, 'utf8');
  console.log('Successfully generated js/config.js');
} catch (err) {
  console.error('Error writing config.js:', err);
  process.exit(1);
}
