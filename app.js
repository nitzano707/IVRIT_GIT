const uploadButton = document.getElementById('uploadButton');
const downloadButton = document.getElementById('downloadButton');
const statusDiv = document.getElementById('status');
const transcriptionDiv = document.getElementById('transcription');

let apiKey = localStorage.getItem('runpodApiKey') || null;

if (!apiKey) {
    apiKey = prompt('הזן את מפתח ה-API שלך ל-RunPod:');
    localStorage.setItem('runpodApiKey', apiKey);
}

uploadButton.addEventListener('click', async () => {
    const audioFile = document.getElementById('audioFile').files[0];
    if (!audioFile) {
        statusDiv.innerHTML = 'לא נבחר קובץ שמע. אנא נסה שנית.';
        return;
    }

    try {
        const jobId = await splitAndUpload(audioFile);
        if (jobId) {
            const transcription = await waitForJobReady(jobId, apiKey);
            if (transcription) {
                displayTranscription(transcription);
                enableDownload(transcription);
            }
        }
    } catch (error) {
        statusDiv.innerHTML = 'אירעה שגיאה: ' + error.message;
        console.error(error);
    }
});

async function splitAndUpload(audioFile) {
    statusDiv.innerHTML = 'מתחיל להעלות קובץ שמע...';

    const formData = new FormData();
    formData.append('file', audioFile);
    formData.append('type', 'file'); // וודא שזה נדרש
    formData.append('model', 'ivrit-ai/faster-whisper-v2-d4'); // דגם תמלול, למשל

    try {
        const response = await fetch('https://api.runpod.ai/v2/flsha1hfkp14sw/run', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${apiKey}` },
            body: formData
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('שגיאה בבקשת POST:', errorText);
            throw new Error('שגיאה בעת שליחת קובץ: ' + response.statusText);
        }

        const result = await response.json();
        return result.id; // מזהה העבודה
    } catch (error) {
        console.error('שגיאה בהעלאת קובץ:', error);
        throw error;
    }
}


async function waitForJobReady(jobId, apiKey) {
    const maxAttempts = 12; // 12 בדיקות, אחת כל 5 שניות
    let attempts = 0;

    while (attempts < maxAttempts) {
        try {
            const response = await fetch(`https://api.runpod.ai/v2/flsha1hfkp14sw/status/${jobId}`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${apiKey}` }
            });

            if (!response.ok) {
                throw new Error(`שגיאה בבדיקת סטטוס העבודה: ${response.statusText}`);
            }

            const result = await response.json();
            if (result.status === 'COMPLETED') {
                statusDiv.innerHTML = 'התמלול הושלם!';
                return result.output.result.segments;
            } else if (result.status === 'IN_QUEUE' || result.status === 'IN_PROGRESS') {
                statusDiv.innerHTML = `סטטוס עבודה: ${result.status}. בודק שוב בעוד 5 שניות...`;
            } else {
                statusDiv.innerHTML = `סטטוס עבודה לא צפוי: ${result.status}`;
                return null;
            }
        } catch (error) {
            console.error('שגיאה בבדיקת סטטוס העבודה:', error);
            statusDiv.innerHTML = 'שגיאה בבדיקת סטטוס העבודה. מנסה שוב...';
        }

        await new Promise((resolve) => setTimeout(resolve, 5000)); // המתנה של 5 שניות
        attempts++;
    }

    statusDiv.innerHTML = 'העבודה לא הושלמה בזמן. נסה שוב במועד מאוחר יותר.';
    throw new Error('העבודה לא הושלמה בזמן.');
}

function displayTranscription(segments) {
    transcriptionDiv.innerHTML = ''; // איפוס התמלול הקודם
    segments.forEach((segment, index) => {
        const segmentDiv = document.createElement('div');
        segmentDiv.style.marginBottom = '10px';
        segmentDiv.textContent = `${index + 1}: ${segment.text}`;
        transcriptionDiv.appendChild(segmentDiv);
    });
}

function enableDownload(segments) {
    downloadButton.style.display = 'inline-block';
    downloadButton.addEventListener('click', () => {
        const doc = new Blob(
            segments.map((seg, index) => `${index + 1}: ${seg.text}\n\n`),
            { type: 'text/plain;charset=utf-8' }
        );
        const url = URL.createObjectURL(doc);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'transcription.doc';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    });
}
