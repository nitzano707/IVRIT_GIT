// פונקציה להמרת קובץ ל-Base64
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
    });
}

// פונקציה לפיצול קובץ למקטעים בגודל מסוים
async function splitAudioFile(file, chunkSize) {
    const chunks = [];
    let offset = 0;
    while (offset < file.size) {
        const chunk = file.slice(offset, offset + chunkSize);
        chunks.push(chunk);
        offset += chunkSize;
    }
    return chunks;
}

// פונקציה לבדוק אם השרת מוכן
async function waitForServerReady(apiKey) {
    const statusDiv = document.getElementById('status');
    const maxAttempts = 12; // בדיקות כל 5 שניות למשך דקה
    let attempts = 0;

    while (attempts < maxAttempts) {
        try {
            const response = await fetch('https://api.runpod.ai/v2/flsha1hfkp14sw/ready', {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${apiKey}` }
            });

            const textResponse = await response.text(); // נקרא את התגובה כטקסט
            try {
                const result = JSON.parse(textResponse); // ננסה לפענח את הטקסט כ-JSON
                if (result.status === 'READY') {
                    statusDiv.innerHTML = 'השרת מוכן. מתחיל תהליך התמלול...';
                    return true; // השרת זמין
                }
                statusDiv.innerHTML = `סטטוס שרת: ${result.status}. בדיקה נוספת בעוד 5 שניות...`;
            } catch (jsonError) {
                console.error('תשובה לא צפויה מהשרת:', textResponse);
                statusDiv.innerHTML = 'תשובה לא צפויה מהשרת. מנסה שוב...';
            }
        } catch (error) {
            console.warn('שגיאה בבדיקת זמינות השרת:', error);
            statusDiv.innerHTML = 'שגיאה בבדיקת זמינות השרת. מנסה שוב...';
        }

        await new Promise((resolve) => setTimeout(resolve, 5000));
        attempts++;
    }

    // אם השרת עדיין לא מוכן
    statusDiv.innerHTML = 'השרת אינו זמין כרגע. אנא נסה שוב במועד מאוחר יותר.';
    throw new Error('Server not ready');
}



// פונקציה לבדוק סטטוס עבודה
async function checkJobStatus(jobId, apiKey) {
    const statusDiv = document.getElementById('status');

    while (true) {
        const response = await fetch(`https://api.runpod.ai/v2/flsha1hfkp14sw/status/${jobId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`
            }
        });

        const result = await response.json();

        if (result.status === 'COMPLETED') {
            return result.output.result;
        } else if (result.status === 'FAILED') {
            throw new Error('תהליך נכשל.');
        }

        statusDiv.innerHTML = `סטטוס עבודה: ${result.status}. בדיקה שוב בעוד 5 שניות...`;
        await new Promise((resolve) => setTimeout(resolve, 5000));
    }
}

// פונקציה להצגת התמלול
function displayTranscription(segments) {
    const transcriptionDiv = document.getElementById('transcription');
    transcriptionDiv.innerHTML = '';
    segments.forEach((segment, index) => {
        const segmentDiv = document.createElement('div');
        segmentDiv.textContent = `סגמנט ${index + 1}: ${segment.text}`;
        segmentDiv.style.marginBottom = '20px';
        transcriptionDiv.appendChild(segmentDiv);
    });
}

// הפונקציה הראשית לתהליך התמלול
async function splitAndTranscribe(file, apiKey) {
    const statusDiv = document.getElementById('status');
    const transcriptionDiv = document.getElementById('transcription');
    transcriptionDiv.innerHTML = '';
    statusDiv.innerHTML = 'מכין קטעים מהקובץ...';

    try {
        // בדיקה אם השרת מוכן
        await waitForServerReady(apiKey);

        // פיצול הקובץ למקטעים של 8MB
        const chunks = await splitAudioFile(file, 8 * 1024 * 1024);
        const transcriptions = [];

        for (let i = 0; i < chunks.length; i++) {
            statusDiv.innerHTML = `מעלה קטע ${i + 1} מתוך ${chunks.length}...`;
            const chunkBase64 = await fileToBase64(chunks[i]);

            const payload = {
                type: 'blob',
                data: chunkBase64,
                model: 'ivrit-ai/faster-whisper-v2-d4'
            };

            const response = await fetch('https://api.runpod.ai/v2/flsha1hfkp14sw/run', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const job = await response.json();
            const jobId = job.id;

            const result = await checkJobStatus(jobId, apiKey); // בדיקת סטטוס
            if (result) {
                transcriptions.push(result.segments);
            }
        }

        // איחוד התמלולים
        const mergedTranscription = transcriptions.flat();
        displayTranscription(mergedTranscription);

        statusDiv.innerHTML = 'התמלול הושלם בהצלחה.';
    } catch (error) {
        console.error('שגיאה:', error);
        statusDiv.innerHTML = 'שגיאה בעיבוד הקובץ. נסה שוב.';
    }
}

// האזנה לאירוע לחיצה על כפתור ההתחלה
document.getElementById('uploadBtn').addEventListener('click', async () => {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];
    if (!file) {
        alert('אנא בחר קובץ.');
        return;
    }

    let apiKey = localStorage.getItem('runpodApiKey');
    if (!apiKey) {
        apiKey = prompt('הזן את ה-API Key שלך:');
        localStorage.setItem('runpodApiKey', apiKey);
    }

    await splitAndTranscribe(file, apiKey);
});
