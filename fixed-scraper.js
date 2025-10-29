const cheerio = require('cheerio');

async function testFixedScraper() {
  try {
    console.log('🔧 Testing FIXED scraper for satta-king-fast.com...\n');
    
    const response = await fetch('https://satta-king-fast.com/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });
    
    const html = await response.text();
    const $ = cheerio.load(html);
    const results = [];
    
    // Find the main results table
    const mainTable = $('table').first();
    const rows = mainTable.find('tr');
    
    console.log(`🔍 Found ${rows.length} table rows\n`);
    
    // Process data rows (skip header rows)
    rows.each((_, row) => {
      const $row = $(row);
      const cells = $row.find('td');
      
      // Only process rows with 3 cells (game name, yesterday, today)
      if (cells.length === 3) {
        const gameNameText = cells.eq(0).text().trim();
        
        // Skip if it's just "LIVE" or empty
        if (!gameNameText || gameNameText === 'LIVE') return;
        
        // Extract time from the game name
        const timeMatch = gameNameText.match(/at\s+(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm))/i);
        const time = timeMatch ? timeMatch[1] : '';
        
        // Clean game name (remove time and "Record Chart" parts)
        const title = gameNameText
          .replace(/\s+at\s+\d{1,2}:\d{2}\s*(?:AM|PM|am|pm).*$/i, '')
          .replace(/\s+Record Chart.*$/i, '')
          .trim();
        
        // Extract yesterday's result (second column)
        const yesterdayResult = cells.eq(1).text().trim();
        
        // Extract today's result (third column) 
        const todayResult = cells.eq(2).text().trim();
        
        // Determine which result to use and status
        let result = '--';
        let status = 'wait';
        let jodi = '--';
        
        // Check if today's result is available (not XX or --)
        if (todayResult && todayResult !== 'XX' && todayResult !== '--' && !isNaN(parseInt(todayResult))) {
          result = todayResult;
          status = 'pass';
          jodi = todayResult;
        } else if (yesterdayResult && yesterdayResult !== 'XX' && yesterdayResult !== '--' && !isNaN(parseInt(yesterdayResult))) {
          // Use yesterday's result if today's is not available
          result = yesterdayResult;
          status = 'pass';
          jodi = yesterdayResult;
        }
        
        // Only include games that match our main categories or have results
        const mainCategories = ['GHAZIABAD', 'FARIDABAD', 'GALI', 'DESAWAR', 'GHAZIABAD1', 'FARIDABAD1', 'GALI1', 'DESAWAR1'];
        const isMainCategory = mainCategories.some(cat => 
          title.toUpperCase().includes(cat) || 
          title.toUpperCase().includes(cat.replace('1', ''))
        );
        
        if (title && (isMainCategory || result !== '--')) {
          results.push({
            title: title.toUpperCase(),
            time: time || 'N/A',
            jodi: jodi,
            result: result,
            status: status
          });
        }
      }
    });
    
    console.log(`🎯 Parsed ${results.length} live results:\n`);
    
    // Display results
    results.forEach((result, index) => {
      console.log(`${index + 1}. ${result.title}`);
      console.log(`   Time: ${result.time}`);
      console.log(`   Jodi: ${result.jodi}`);
      console.log(`   Result: ${result.result}`);
      console.log(`   Status: ${result.status}`);
      console.log('');
    });
    
    // Show summary
    const passCount = results.filter(r => r.status === 'pass').length;
    const waitCount = results.filter(r => r.status === 'wait').length;
    
    console.log('📊 SUMMARY:');
    console.log(`   Total results: ${results.length}`);
    console.log(`   Passed: ${passCount}`);
    console.log(`   Waiting: ${waitCount}`);
    console.log(`   Success rate: ${results.length > 0 ? ((passCount / results.length) * 100).toFixed(1) : 0}%`);
    
  } catch (error) {
    console.error('❌ Error testing scraper:', error.message);
  }
}

testFixedScraper();
