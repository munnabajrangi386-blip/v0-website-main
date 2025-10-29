const cheerio = require('cheerio');

// Test the new scraper function
async function testScraper() {
  try {
    console.log('🧪 Testing new scraper for satta-king-fast.com...\n');
    
    // Fetch the website
    const response = await fetch('https://satta-king-fast.com/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const html = await response.text();
    console.log('✅ Successfully fetched HTML from satta-king-fast.com');
    console.log(`📄 HTML length: ${html.length} characters\n`);
    
    // Parse with our new scraper
    const $ = cheerio.load(html);
    const results = [];
    
    // Find the main results table
    const mainTable = $('table').first();
    const rows = mainTable.find('tr');
    
    console.log(`🔍 Found ${rows.length} table rows\n`);
    
    // Skip header row and process data rows
    rows.slice(1).each((_, row) => {
      const $row = $(row);
      const cells = $row.find('td');
      
      if (cells.length >= 4) {
        // Extract game name (first column)
        const gameNameText = cells.eq(0).text().trim();
        
        // Extract time from the game name (e.g., "GHAZIABAD at 09:25 PM")
        const timeMatch = gameNameText.match(/at\s+(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm))/i);
        const time = timeMatch ? timeMatch[1] : '';
        
        // Clean game name (remove time part)
        const title = gameNameText.replace(/\s+at\s+\d{1,2}:\d{2}\s*(?:AM|PM|am|pm).*$/i, '').trim();
        
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
    
    // Display results in a nice format
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
    console.log(`   Success rate: ${((passCount / results.length) * 100).toFixed(1)}%`);
    
  } catch (error) {
    console.error('❌ Error testing scraper:', error.message);
  }
}

testScraper();
