const statusEl    = document.getElementById('status');
const catalogEl   = document.getElementById('catalogId');
const fillBtn     = document.getElementById('fillBtn');
const fileInput   = document.getElementById('csvFile');

// 1) CSV loader
fileInput.addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return statusEl.textContent = 'No file selected';

  statusEl.textContent = 'Parsing CSV…';
  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: results => {
      const csvData = {};
      results.data.forEach(row => {
        const key = row['Catalog ID']?.toString().trim();
        if (key) csvData[key] = row;
      });
      chrome.storage.local.set({ csvData }, () => {
        statusEl.textContent = `Loaded ${Object.keys(csvData).length} entries`;
        catalogEl.disabled = false;
        fillBtn.disabled = false;
      });
    },
    error: err => {
      console.error('CSV parse error', err);
      statusEl.textContent = 'Error parsing CSV';
    }
  });
});

// 2) Send “fill” message on button click
fillBtn.addEventListener('click', () => {
  const id = catalogEl.value.trim();
  if (!id) return alert('Please enter a Catalog ID');
  
  // find active tab
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    chrome.tabs.sendMessage(
      tabs[0].id,
      { action: 'fill', catalogId: id }
    );
  });
});
