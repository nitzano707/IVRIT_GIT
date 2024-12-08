document.getElementById('transcribe-btn').addEventListener('click', async () => {
    const fileInput = document.getElementById('audio-file');
    const statusDiv = document.getElementById('status');
    const transcriptionDiv = document.getElementById('transcription');
    const spinner = document.getElementById('spinner');
    const downloadBtn = document.getElementById('download-btn');

    statusDiv.innerHTML = '';
    transcriptionDiv.innerHTML = '';
    spinner.style.display = 'block';
    downloadBtn.style.display = 'none';

    if (!fileInput.files[0]) {
        alert('אנא בחר קובץ שמע.');
        spinner.style.display = 'none';
        return;
    }

    const file = fileInput.files[0];
    const formData = new FormData();
    formData.append('file', file);

    try {
        // שלב 1: העלאת קובץ ל-Netlify לקבלת URL
        statusDiv.innerHTML = 'מעלה את קובץ השמע לשרת...';
        const uploadResponse = await fetch('/.netlify/functions/upload', {
            method: 'POST',
            body: formData
        });

        const uploadData = await uploadResponse.json();
        if (!uploadData.url) {
            throw new Error('שגיאה ביצירת URL לקובץ.');
        }

        const audioUrl = uploadData.url;
        console.log('URL לקובץ:', audioUrl);

        // שלב 2: שליחת URL לסרברלס לתמלול
        statusDiv.innerHTML = 'שולח בקשת תמלול...';
        const transcriptionResponse = await fetch('https://api.runpod.ai/v2/flsha1hfkp14sw/run', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${getApiKey()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                input: { type: 'url', url: audioUrl }
            })
        });

        const transcriptionData = await transcriptionResponse.json();
        if (!transcriptionData.id) {
            throw new Error('שגיאה בקבלת מזהה עבודה.');
        }

        console.log('מזהה עבודה:', transcriptionData.id);
        statusDiv.innerHTML = 'ממתין לסיום העבודה...';

        await checkJobStatus(transcriptionData.id);

    } catch (error) {
        console.error('שגיאה:', error);
        statusDiv.innerHTML = 'שגיאה: ' + error.message;
    } finally {
        spinner.style.display = 'none';
    }
});

function getApiKey() {
    let apiKey = localStorage.getItem('runpodApiKey');
    if (!apiKey) {
        apiKey = prompt('אנא הזן את מפתח ה-API שלך:');
        if (apiKey) {
            localStorage.setItem('runpodApiKey', apiKey);
        }
    }
    return apiKey;
}

async function checkJobStatus(jobId) {
    const statusDiv = document.getElementById('status');
    const transcriptionDiv = document.getElementById('transcription');
    const downloadBtn = document.getElementById('download-btn');

    let status = 'IN_QUEUE';
    let retryCount = 0;
    const maxRetries = 30;

    while (status === 'IN_QUEUE' || status === 'IN_PROGRESS') {
        try {
            const response = await fetch(`https://api.runpod.ai/v2/flsha1hfkp14sw/status/${jobId}`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${getApiKey()}` }
            });
            const data = await response.json();
            status = data.status;

            if (status === 'COMPLETED') {
                statusDiv.innerHTML = 'העבודה הושלמה. מציג את התמלול...';
                displayTranscription(data.output.result.segments);
                prepareDownload(data.output.result.segments);
                return;
            } else if (status === 'FAILED') {
                statusDiv.innerHTML = 'העבודה נכשלה. אנא נסה שוב.';
                return;
            }

            statusDiv.innerHTML = `סטטוס עבודה: ${status}. בודק שוב...`;
        } catch (error) {
            console.error('שגיאה בבדיקת מצב העבודה:', error);
            statusDiv.innerHTML = 'שגיאה בבדיקת מצב העבודה.';
            return;
        }

        retryCount++;
        if (retryCount >= maxRetries) {
            statusDiv.innerHTML = 'לא הצלחנו לקבל תוצאה לאחר ניסיונות רבים.';
            return;
        }

        await new Promise(resolve => setTimeout(resolve, 5000));
    }
}

function displayTranscription(segments) {
    const transcriptionDiv = document.getElementById('transcription');
    transcriptionDiv.innerHTML = '<h2>תמלול:</h2>';
    segments.forEach(segment => {
        transcriptionDiv.innerHTML += `<p>[${formatTime(segment.start)} - ${formatTime(segment.end)}]: ${segment.text}</p>`;
    });
}

function formatTime(seconds) {
    const date = new Date(0);
    date.setSeconds(seconds);
    return date.toISOString().substr(11, 8);
}

function prepareDownload(segments) {
    const downloadBtn = document.getElementById('download-btn');
    downloadBtn.style.display = 'block';

    downloadBtn.addEventListener('click', () => {
        const content = segments.map(segment =>
            `דובר [${formatTime(segment.start)} - ${formatTime(segment.end)}]:\n${segment.text}\n\n`
        ).join('');
        const blob = new Blob([content], { type: 'application/msword' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'תמלול.doc';
        a.click();
    });
}
