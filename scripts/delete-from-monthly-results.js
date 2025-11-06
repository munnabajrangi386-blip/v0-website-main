const fs = require('fs');
const path = require('path');

const monthlyResultsPath = path.join(__dirname, '..', 'monthly_results.json');

// Read the file
const data = JSON.parse(fs.readFileSync(monthlyResultsPath, 'utf-8'));

// Check for 2025-11
const monthKey = '2025-11';
if (data[monthKey]) {
  const monthData = data[monthKey];
  
  // Find row for 2025-11-05
  const rowIndex = monthData.rows.findIndex(row => row.date === '2025-11-05');
  
  if (rowIndex !== -1) {
    const row = monthData.rows[rowIndex];
    console.log('Found row for 2025-11-05:');
    console.log('  Before:', JSON.stringify(row, null, 2));
    
    // Delete the values (check all possible key variations)
    const keysToRemove = [];
    for (const key of Object.keys(row)) {
      if (key === 'date') continue;
      const keyLower = key.toLowerCase();
      if (keyLower.includes('faridabad2') || keyLower.includes('faridabad1')) {
        keysToRemove.push(key);
      } else if (keyLower.includes('ghaziabad2') || keyLower.includes('ghaziabad1')) {
        keysToRemove.push(key);
      } else if ((keyLower.includes('gali2') || keyLower.includes('gali1') || keyLower === 'gal12') && !keyLower.includes('luxmi')) {
        keysToRemove.push(key);
      }
    }
    
    for (const key of keysToRemove) {
      console.log(`  Removing: ${key} = ${row[key]}`);
      delete row[key];
    }
    
    console.log('  After:', JSON.stringify(row, null, 2));
    
    // Update timestamp
    monthData.updatedAt = new Date().toISOString();
    
    // Write back
    fs.writeFileSync(monthlyResultsPath, JSON.stringify(data, null, 2), 'utf-8');
    console.log('\n✅ Updated monthly_results.json');
  } else {
    console.log('Row for 2025-11-05 not found in monthly_results.json');
  }
} else {
  console.log(`Month ${monthKey} not found in monthly_results.json`);
}

