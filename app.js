// הקשב ללחיצה על כפתור "העלה קובץ"
document.getElementById('upload-btn').addEventListener('click', async () => {
    const fileInput = document.getElementById('file-input');
    const statusDiv = document.getElementById('status');
    const resultDiv = document.getElementById('result');

    // נקה את התוצאה הקודמת והראה הודעת מצב
    statusDiv.textContent = 'מעלה את הקובץ...';
    resultDiv.textContent = '';

    // בדוק אם נבחר קובץ
    if (!fileInput.files[0]) {
        alert('אנא בחר קובץ להעלאה.');
        return;
    }

    const file = fileInput.files[0];
    const formData = new FormData();
    formData.append('file', file);

    try {
        // שלח את הקובץ לפונקציה ב-Netlify
        const response = await fetch('/.netlify/functions/upload', {
            method: 'POST',
            body: formData,
        });

        if (response.ok) {
            // קבל את התוצאה מהשרת
            const data = await response.json();
            statusDiv.textContent = 'הקובץ הועלה בהצלחה!';
            resultDiv.innerHTML = `
                <p>הקובץ הועלה בהצלחה!</p>
                <p><a href="${data.url}" target="_blank">צפה בקובץ כאן</a></p>
            `;

            // שלח את ה-URL של הקובץ לתמלול (שלב נוסף)
            await sendForTranscription(data.url, statusDiv, resultDiv);
        } else {
            const errorData = await response.json();
            statusDiv.textContent = `שגיאה: ${errorData.error}`;
        }
    } catch (error) {
        console.error('Error:', error);
        statusDiv.textContent = 'שגיאה בהעלאת הקובץ.';
    }
});

// שלח את ה-URL לתמלול
async function sendForTranscription(fileUrl, statusDiv, resultDiv) {
    statusDiv.textContent = 'שולח את הקובץ לתמלול...';

    const payload = {
        input: {
            type: 'url',
            url: fileUrl,
        },
    };

    try {
        const response = await fetch('https://api.runpod.ai/v2/flsha1hfkp14sw/run', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer YOUR_RUNPOD_API_KEY`, // החלף במפתח ה-API שלך
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (response.ok) {
            const data = await response.json();
            statusDiv.textContent = 'הקובץ נשלח לתמלול. ממתין לתוצאה...';
            await checkTranscriptionStatus(data.id, statusDiv, resultDiv);
        } else {
            const errorData = await response.json();
            statusDiv.textContent = `שגיאה בשליחת הקובץ לתמלול: ${errorData.error}`;
        }
    } catch (error) {
        console.error('Error:', error);
        statusDiv.textContent = 'שגיאה בשליחת הקובץ לתמלול.';
    }
}

// בדוק את סטטוס התמלול
async function checkTranscriptionStatus(jobId, statusDiv, resultDiv) {
    let status = 'IN_QUEUE';
    let retryCount = 0;
    const maxRetries = 20;

    while (status === 'IN_QUEUE' || status === 'IN_PROGRESS') {
        try {
            const response = await fetch(`https://api.runpod.ai/v2/flsha1hfkp14sw/status/${jobId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer YOUR_RUNPOD_API_KEY`,
                },
            });

            const data = await response.json();
            status = data.status;

            if (status === 'COMPLETED') {
                statusDiv.textContent = 'התמלול הושלם!';
                displayTranscription(data.output.result.segments, resultDiv);
                return;
            } else if (status === 'FAILED') {
                statusDiv.textContent = 'שגיאה בתמלול. אנא נסה שוב.';
                return;
            }

            statusDiv.textContent = `סטטוס: ${status}. ממתין...`;
        } catch (error) {
            console.error('Error:', error);
            statusDiv.textContent = 'שגיאה בבדיקת סטטוס התמלול.';
            return;
        }

        retryCount++;
        if (retryCount >= maxRetries) {
            statusDiv.textContent = 'לא הצלחנו להשלים את התמלול לאחר ניסיונות רבים.';
            return;
        }

        await new Promise(resolve => setTimeout(resolve, 5000)); // המתן 5 שניות
    }
}

// הצג את התמלול
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
