document.getElementById('transcribe-btn').addEventListener('click', async () => {
    const fileInput = document.getElementById('audio-file');
    const statusDiv = document.getElementById('status');
    const transcriptionDiv = document.getElementById('transcription');
    const spinner = document.getElementById('spinner');

    statusDiv.innerHTML = '';
    transcriptionDiv.innerHTML = '';
    spinner.style.display = 'block';

    if (!fileInput.files[0]) {
        alert('אנא בחר קובץ שמע.');
        spinner.style.display = 'none';
        return;
    }

    const file = fileInput.files[0];
    const formData = new FormData();
    formData.append('file', file);

    try {
        // שלב 1: העלאת קובץ לשרת האחסון
        statusDiv.innerHTML = 'מעלה את קובץ השמע לשרת האחסון הזמני...';
        const uploadResponse = await fetch('https://tempstoragenitzantry1.netlify.app/.netlify/functions/upload', {
    method: 'POST',
    body: formData
});

        const uploadData = await uploadResponse.json();
        if (!uploadData.url) {
            throw new Error('שגיאה ביצירת URL לקובץ.');
        }

        const audioUrl = uploadData.url;
        console.log('URL לקובץ:', audioUrl);

        // שלב 2: שליחת URL לתמלול
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
