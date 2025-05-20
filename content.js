(async function autofillMindatForm() {
  const catalogId = "15";
  const url = "https://script.google.com/macros/s/AKfycbwiDTzCPJpgk_srPMP7TF2g4eYdesvJF_InSGSYv-BN-1CBO1h0hVThFjIMXOMnmSk7AA/exec?catalog=" + catalogId;

  try {
    const response = await fetch(url);
    const data = await response.json();
    if (data.error) return console.warn("Not found");

    document.querySelector("#cat_catnum").value = data.catalog || "";
    document.querySelector("#cat_title").value = data.title || "";
    document.querySelector("#cat_locality").value = data.locality || "";

    const dims = (data.dimensions || "").match(/(\d+)[x×](\d+)[x×](\d+)/);
    if (dims) {
      document.querySelector("#cat_w").value = dims[1];
      document.querySelector("#cat_h").value = dims[2];
      document.querySelector("#cat_d").value = dims[3];
    }

    document.querySelector("#cat_source").value = data.source || "";
    document.querySelector("#cat_description").value = data.description || "";
    const notesField = document.querySelector("#cat_notes");
    if (notesField) notesField.value = data.notes || "";

    console.log("✅ Form autofilled from Google Sheet");
  } catch (err) {
    console.error("❌ Error fetching data:", err);
  }
})();
