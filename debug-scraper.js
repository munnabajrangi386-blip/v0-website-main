const cheerio = require('cheerio');

async function debugScraper() {
  try {
    console.log('🔍 Debugging scraper for satta-king-fast.com...\n');
    
    const response = await fetch('https://satta-king-fast.com/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    console.log('📋 Table Analysis:');
    console.log(`Found ${$('table').length} tables\n`);
    
    // Check first table structure
    const firstTable = $('table').first();
    const rows = firstTable.find('tr');
    
    console.log(`First table has ${rows.length} rows\n`);
    
    // Show first few rows
    rows.slice(0, 5).each((index, row) => {
      const $row = $(row);
      const cells = $row.find('td');
      console.log(`Row ${index + 1}: ${cells.length} cells`);
      
      cells.each((cellIndex, cell) => {
        const text = $(cell).text().trim();
        console.log(`  Cell ${cellIndex + 1}: "${text}"`);
      });
      console.log('');
    });
    
    // Look for specific games
    console.log('🎯 Looking for specific games:');
    const gameNames = ['GHAZIABAD', 'FARIDABAD', 'GALI', 'DESAWAR'];
    
    gameNames.forEach(gameName => {
      const found = firstTable.text().includes(gameName);
      console.log(`${gameName}: ${found ? '✅ Found' : '❌ Not found'}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

debugScraper();
