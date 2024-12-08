document.getElementById('upload-btn').addEventListener('click', async () => {
    const fileInput = document.getElementById('file-input');
    const statusDiv = document.getElementById('status');
    const resultDiv = document.getElementById('result');

    // נקה את המצב הקודם
    statusDiv.textContent = 'מעלה את הקובץ...';
    resultDiv.textContent = '';

    // בדוק אם נבחר קובץ
    if (!fileInput.files[0]) {
        alert('אנא בחר קובץ להעלאה.');
        console.error('No file selected for upload.');
        return;
    }

    const file = fileInput.files[0];
    const formData = new FormData();
    formData.append('file', file);

    try {
        console.log('Sending file to server...');
        // שליחת הקובץ לשרת
        const response = await fetch('/.netlify/functions/upload', {
            method: 'POST',
            body: formData,
        });

        if (response.ok) {
            // קבלת תגובה מהשרת
            const data = await response.json();
            console.log('File uploaded successfully:', data.url);

            // הצגת קישור להורדת הקובץ
            statusDiv.textContent = 'הקובץ הועלה בהצלחה!';
            resultDiv.innerHTML = `<a href="${data.url}" target="_blank">צפה בקובץ כאן</a>`;

            // המשך שליחה לתמלול
            await sendForTranscription(data.url, statusDiv, resultDiv);
        } else {
            const errorData = await response.json();
            console.error('Error response from server:', errorData);
            statusDiv.textContent = `שגיאה: ${errorData.error}`;
        }
    } catch (error) {
        console.error('Error during upload:', error);
        statusDiv.textContent = 'שגיאה בהעלאת הקובץ.';
    }
});

// שליחה ל-API לתמלול
async function sendForTranscription(fileUrl, statusDiv, resultDiv) {
    statusDiv.textContent = 'שולח את הקובץ לתמלול...';

    const payload = {
        input: {
            type: 'url',
            url: fileUrl,
        },
    };

    try {
        console.log('Sending file for transcription...');
        const response = await fetch('https://api.runpod.ai/v2/flsha1hfkp14sw/run', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer YOUR_RUNPOD_API_KEY`, // החלף במפתח שלך
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (response.ok) {
            const data = await response.json();
            console.log('Transcription job started:', data.id);

            // בדיקת סטטוס העבודה
            statusDiv.textContent = 'הקובץ נשלח לתמלול. ממתין לתוצאה...';
            await checkTranscriptionStatus(data.id, statusDiv, resultDiv);
        } else {
            const errorData = await response.json();
            console.error('Error response from transcription API:', errorData);
            statusDiv.textContent = `שגיאה בשליחת הקובץ לתמלול: ${errorData.error}`;
        }
    } catch (error) {
        console.error('Error during transcription request:', error);
        statusDiv.textContent = 'שגיאה בשליחת הקובץ לתמלול.';
    }
}

// בדיקת סטטוס של עבודת התמלול
async function checkTranscriptionStatus(jobId, statusDiv, resultDiv) {
    let status = 'IN_QUEUE';
    let retryCount = 0;
    const maxRetries = 20;

    while (status === 'IN_QUEUE' || status === 'IN_PROGRESS') {
        try {
            console.log(`Checking transcription status (attempt ${retryCount + 1})...`);
            const response = await fetch(`https://api.runpod.ai/v2/flsha1hfkp14sw/status/${jobId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer YOUR_RUNPOD_API_KEY`,
                },
            });

            const data = await response.json();
            status = data.status;
            console.log(`Transcription status: ${status}`);

            if (status === 'COMPLETED') {
                statusDiv.textContent = 'התמלול הושלם!';
                displayTranscription(data.output.result.segments, resultDiv);
                return;
            } else if (status === 'FAILED') {
                console.error('Transcription job failed.');
                statusDiv.textContent = 'שגיאה בתמלול. אנא נסה שוב.';
                return;
            }

            statusDiv.textContent = `סטטוס: ${status}. ממתין...`;
        } catch (error) {
            console.error('Error checking transcription status:', error);
            statusDiv.textContent = 'שגיאה בבדיקת סטטוס התמלול.';
            return;
        }

        retryCount++;
        if (retryCount >= maxRetries) {
            console.error('Max retries reached for transcription status.');
            statusDiv.textContent = 'לא הצלחנו להשלים את התמלול לאחר ניסיונות רבים.';
            return;
        }

        await new Promise(resolve => setTimeout(resolve, 5000)); // המתן 5 שניות
    }
}

// הצגת תוצאה של התמלול
function displayTranscription(segments, resultDiv) {
    const transcriptionHtml = segments
        .map(
            (segment, index) => `
            <p><strong>סגמנט ${index + 1}</strong> [${formatTime(segment.start)} - ${formatTime(segment.end)}]:</p>
            <p>${segment.text}</p>
        `
        )
        .join('');
    resultDiv.innerHTML = `<h2>תמלול:</h2>${transcriptionHtml}`;
}

// עזר: פורמט זמן
function formatTime(seconds) {
    const date = new Date(0);
    date.setSeconds(seconds);
    return date.toISOString().substr(11, 8);
}
