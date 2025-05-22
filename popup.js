document.getElementById('fillBtn').onclick = async () => {
  const catalogId = document.getElementById('catalogId').value.trim();
  if (!catalogId) return;

  // Send message to content script
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    chrome.scripting.executeScript({
      target: {tabId: tabs[0].id},
      func: (catalogId) => {
        window.dispatchEvent(new CustomEvent('mindat-autofill', { detail: { catalogId } }));
      },
      args: [catalogId]
    });
  });

  document.getElementById('status').textContent = "Sent!";
};