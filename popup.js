const statusEl = document.getElementById('status');

document.getElementById('csvFile').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) {
    statusEl.textContent = 'No file selected';
    return;
  }

  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: (results) => {
      // Build a map: Catalog ID → row object
      const csvData = {};
      results.data.forEach(row => {
        const key = row['Catalog ID']?.toString().trim();
        if (key) csvData[key] = row;
      });

      chrome.storage.local.set({ csvData }, () => {
        statusEl.textContent = `Loaded ${Object.keys(csvData).length} entries`;
      });
    },
    error: (err) => {
      console.error('CSV parse error', err);
      statusEl.textContent = 'Error parsing CSV';
    }
  });
});
