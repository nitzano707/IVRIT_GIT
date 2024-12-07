document.getElementById('transcribeButton').addEventListener('click', async () => {
    const file = document.getElementById('audioFile').files[0];
    if (!file) {
        alert('בחר קובץ אודיו.');
        return;
    }

    const apiKey = localStorage.getItem('runpodApiKey') || prompt('הזן את ה-API Key של RunPod:');
    if (!apiKey) {
        alert('API Key דרוש להמשך.');
        return;
    }
    localStorage.setItem('runpodApiKey', apiKey);

    await splitAndTranscribe(file, apiKey);
});

// פונקציה לפיצול ותמלול
async function splitAndTranscribe(file, apiKey) {
    const statusDiv = document.getElementById('status');
    const transcriptionDiv = document.getElementById('transcription');
    transcriptionDiv.innerHTML = '';
    statusDiv.innerHTML = 'מכין קטעים מהקובץ...';

    try {
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
                transcriptions.push(result.output.result.segments);
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

// פונקציה להמרת קובץ ל-Base64
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
    });
}

// פונקציה לפיצול קובץ
async function splitAudioFile(file, maxChunkSize) {
    const chunks = [];
    const buffer = await file.arrayBuffer();
    let offset = 0;

    while (offset < buffer.byteLength) {
        const chunk = buffer.slice(offset, offset + maxChunkSize);
        chunks.push(new Blob([chunk], { type: file.type }));
        offset += maxChunkSize;
    }

    console.log(`הקובץ פוצל ל-${chunks.length} חלקים בגודל של עד ${maxChunkSize / (1024 * 1024)}MB.`);
    return chunks;
}

// פונקציה להצגת תמלול
function displayTranscription(segments) {
    const transcriptionDiv = document.getElementById('transcription');
    transcriptionDiv.innerHTML = '<h2>תמלול:</h2>';
    
    segments.forEach((segment, index) => {
        const startTime = formatTime(segment.start);
        const endTime = formatTime(segment.end);

        transcriptionDiv.innerHTML += `
            <p><strong>סגמנט ${index + 1}:</strong> 
            [${startTime} - ${endTime}] ${segment.text}</p><br>`;
    });
}

// פונקציה לעקוב אחרי סטטוס עבודה
async function checkJobStatus(jobId, apiKey) {
    const statusDiv = document.getElementById('status');
    let status = 'IN_QUEUE';

    while (status === 'IN_QUEUE' || status === 'IN_PROGRESS') {
        const response = await fetch(`https://api.runpod.ai/v2/flsha1hfkp14sw/status/${jobId}`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });

        const result = await response.json();
        status = result.status;

        if (status === 'COMPLETED') {
            return result;
        }

        statusDiv.innerHTML = `סטטוס עבודה: ${status}. בדוק שוב בעוד 5 שניות...`;
        await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    throw new Error('העבודה נכשלה או לא הושלמה.');
}

// פונקציה לעיצוב זמנים
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}
