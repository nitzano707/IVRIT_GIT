const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const FormData = require('form-data');

exports.handler = async (event) => {
    console.log('Upload function triggered');

    // טיפול בבקשות OPTIONS
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
            },
            body: '',
        };
    }

    // טיפול בבקשות POST בלבד
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers: {
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({ error: 'Method Not Allowed' }),
        };
    }

    try {
        console.log('Processing POST request');
        const formData = new FormData();

        // הוסף קובץ וטען Preset ממשתני הסביבה
        const uploadPreset = process.env.UPLOAD_PRESET || 'audio_uploads';
        formData.append('upload_preset', uploadPreset);

        // ניתוח תוכן הבקשה
        formData.append('file', Buffer.from(event.body, 'base64'), {
            filename: 'uploaded_file',
        });

        const response = await fetch(`${process.env.CLOUDINARY_URL}/auto/upload`, {
            method: 'POST',
            body: formData,
        });

        const responseJson = await response.json();
        console.log('Cloudinary response:', responseJson);

        if (responseJson.secure_url) {
            return {
                statusCode: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({ url: responseJson.secure_url }),
            };
        } else {
            console.error('Cloudinary upload failed:', responseJson);
            return {
                statusCode: 500,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({ error: 'Upload failed', details: responseJson }),
            };
        }
    } catch (error) {
        console.error('Error occurred:', error);
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({ error: 'Internal Server Error', details: error.message }),
        };
    }
};
