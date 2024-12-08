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
    const reader = new FileReader();
    reader.onload = async () => {
        const base64File = reader.result.split(',')[1]; // הוצא את ה-base64
        const payload = {
            file: base64File,
            filename: file.name,
        };

        try {
            console.log('Sending file to server...');
            const response = await fetch('/.netlify/functions/upload', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
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
    };

    reader.readAsDataURL(file); // קורא את הקובץ כ-Data URL
});
