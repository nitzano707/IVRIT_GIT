document.getElementById('upload-btn').addEventListener('click', async () => {
    const fileInput = document.getElementById('file-input');
    const statusDiv = document.getElementById('status');
    const resultDiv = document.getElementById('result');

    statusDiv.textContent = 'מעלה את הקובץ...';
    resultDiv.textContent = '';

    if (!fileInput.files[0]) {
        alert('אנא בחר קובץ להעלאה.');
        return;
    }

    const file = fileInput.files[0];
    const formData = new FormData();
    formData.append('file', file);

    try {
        console.log('Sending file to server...');
        const response = await fetch('/.netlify/functions/upload', {
            method: 'POST',
            body: formData,
        });

        if (response.ok) {
            const data = await response.json();
            statusDiv.textContent = 'הקובץ הועלה בהצלחה!';
            resultDiv.innerHTML = `<a href="${data.url}" target="_blank">צפה בקובץ כאן</a>`;
        } else {
            const errorData = await response.json();
            statusDiv.textContent = `שגיאה: ${errorData.error}`;
        }
    } catch (error) {
        console.error('Error:', error);
        statusDiv.textContent = 'שגיאה בהעלאת הקובץ.';
    }
});

