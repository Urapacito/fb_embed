document.getElementById('embed-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const url = document.getElementById('fb-url').value;
  const resultDiv = document.getElementById('embed-result');
  resultDiv.textContent = 'Loading...';
  try {
    const res = await fetch(`/api/embed?url=${encodeURIComponent(url)}`);
    const data = await res.json();
    if (data.error) {
      resultDiv.textContent = data.error;
    } else {
      resultDiv.innerHTML = data.html || JSON.stringify(data, null, 2);
    }
  } catch (err) {
    resultDiv.textContent = 'Error: ' + err.message;
  }
});
