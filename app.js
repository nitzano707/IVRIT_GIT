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

    console.log('התחלת תהליך התמלול...');
    statusDiv.innerHTML = 'מעלה את קובץ השמע...';

    if (!fileInput.files[0]) {
        alert('אנא בחר קובץ שמע.');
        spinner.style.display = 'none';
        return;
    }

    const apiKey = getApiKey();
    if (!apiKey) {
        alert('אנא הזן מפתח API חוקי.');
        spinner.style.display = 'none';
        return;
    }

    const file = fileInput.files[0];
    const base64Audio = await fileToBase64(file);

    const payload = {
        input: {
            type: 'blob',
            data: base64Audio,
            model: 'ivrit-ai/faster-whisper-v2-d4'
        }
    };

    try {
        console.log('שולח בקשה ל-RunPod...');
        statusDiv.innerHTML = 'שולח בקשת תמלול ל-RunPod...';
        const response = await fetch('https://api.runpod.ai/v2/flsha1hfkp14sw/run', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        console.log('תגובה התקבלה:', data);

        if (data.id) {
            console.log('מזהה עבודה התקבל:', data.id);
            await checkJobStatus(data.id, apiKey);
        } else {
            console.error('שגיאה: לא התקבל מזהה עבודה.');
            statusDiv.innerHTML = 'שגיאה בהתחלת התמלול.';
        }
    } catch (error) {
        console.error('שגיאה בחיבור ל-API:', error);
        statusDiv.innerHTML = 'שגיאה בחיבור ל-API.';
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

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
    });
}

async function checkJobStatus(jobId, apiKey) {
    const statusDiv = document.getElementById('status');
    const transcriptionDiv = document.getElementById('transcription');

    console.log('בודק את מצב העבודה...');
    statusDiv.innerHTML = 'בודק את מצב העבודה...';

    let status = 'IN_QUEUE';
    while (status === 'IN_QUEUE' || status === 'PROCESSING') {
        try {
            const response = await fetch(`https://api.runpod.ai/v2/flsha1hfkp14sw/status/${jobId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiKey}`
                }
            });

            const data = await response.json();
            console.log('סטטוס עבודה:', data);
            status = data.status;

            if (status === 'COMPLETED') {
                console.log('העבודה הושלמה. מציג את התמלול...');
                statusDiv.innerHTML = 'העבודה הושלמה. מציג את התמלול...';
                displayTranscription(data.output.result.segments);
                prepareDownload(data.output.result.segments);
                return;
            } else if (status === 'FAILED') {
                console.error('העבודה נכשלה.');
                statusDiv.innerHTML = 'העבודה נכשלה. אנא נסה שוב.';
                return;
            }

            console.log(`סטטוס עבודה: ${status}. בודק שוב בעוד 5 שניות...`);
            statusDiv.innerHTML = `סטטוס עבודה: ${status}. בודק שוב בעוד 5 שניות...`;
        } catch (error) {
            console.error('שגיאה בבדיקת מצב העבודה:', error);
            statusDiv.innerHTML = 'שגיאה בבדיקת מצב העבודה.';
            return;
        }

        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds before retrying
    }
}

function displayTranscription(segments) {
    const transcriptionDiv = document.getElementById('transcription');
    transcriptionDiv.innerHTML = '<h2>תמלול:</h2>';
    segments.forEach(segment => {
        const startTime = formatTime(segment.start);
        const endTime = formatTime(segment.end);
        const speakerClass = segment.id % 2 === 0 ? 'speaker-2' : 'speaker-1';
        const speakerText = `
            <p class="${speakerClass}">
                <strong>דובר ${segment.id}:</strong> 
                [${startTime} - ${endTime}] 
                ${segment.text}
            </p>`;
        transcriptionDiv.innerHTML += speakerText;
    });
    console.log('התמלול הוצג בהצלחה.');
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
            `דובר ${segment.id} [${formatTime(segment.start)} - ${formatTime(segment.end)}]:\n${segment.text}\n\n`
        ).join('');
        const blob = new Blob([content], { type: 'application/msword' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'תמלול.doc';
        a.click();
    });
}
