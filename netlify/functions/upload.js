const fetch = require('node-fetch');
const FormData = require('form-data');

exports.handler = async (event) => {
    console.log('Upload function triggered'); // לוג התחלתי

    // טיפול בבקשות OPTIONS
    if (event.httpMethod === 'OPTIONS') {
        console.log('Handling OPTIONS request');
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

    // טיפול בבקשות שאינן POST
    if (event.httpMethod !== 'POST') {
        console.error('Invalid method:', event.httpMethod);
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

        // בדוק אם הבקשה כוללת קובץ
        if (!event.headers['content-type'] || !event.headers['content-type'].startsWith('multipart/form-data')) {
            console.error('Invalid Content-Type:', event.headers['content-type']);
            return {
                statusCode: 400,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({ error: 'Invalid Content-Type. Expected multipart/form-data.' }),
            };
        }

        const boundary = event.headers['content-type'].split('boundary=')[1];
        const bodyBuffer = Buffer.from(event.body, 'base64'); // פענוח הבקשה
        console.log('Boundary:', boundary);

        const parsedData = parseMultipartFormData(bodyBuffer, boundary);
        console.log('Parsed data:', parsedData);

        const file = parsedData.files.file; // השגת הקובץ מתוך הבקשה
        if (!file) {
            console.error('No file found in the request');
            return {
                statusCode: 400,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({ error: 'No file found in the request' }),
            };
        }

        console.log('Uploading file to Cloudinary:', file.filename);

        // העלאת הקובץ ל-Cloudinary
        const formData = new FormData();
        formData.append('file', file.content, file.filename);
        formData.append('upload_preset', 'ycxh1g5i'); // Upload Preset שלך

        const cloudName = 'de1nxl62t'; // שם הענן שלך
        const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
            method: 'POST',
            body: formData,
        });

        const cloudinaryResponse = await response.json();
        console.log('Cloudinary response:', cloudinaryResponse);

        if (cloudinaryResponse.secure_url) {
            console.log('File uploaded successfully:', cloudinaryResponse.secure_url);
            return {
                statusCode: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({ url: cloudinaryResponse.secure_url }),
            };
        } else {
            console.error('Failed to upload to Cloudinary:', cloudinaryResponse);
            return {
                statusCode: 500,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({ error: 'Failed to upload to Cloudinary', details: cloudinaryResponse }),
            };
        }
    } catch (error) {
        console.error('Error during file upload:', error);
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({ error: 'Internal Server Error', details: error.message }),
        };
    }
};

// פונקציה לפענוח multipart/form-data
function parseMultipartFormData(body, boundary) {
    const parts = body.toString().split(`--${boundary}`);
    const files = {};
    const fields = {};

    parts.forEach((part) => {
        const [headers, content] = part.split('\r\n\r\n');
        if (!headers || !content) return;

        const contentDisposition = headers.match(/Content-Disposition: form-data; name="(.+?)"(; filename="(.+?)")?/);
        if (!contentDisposition) return;

        const fieldName = contentDisposition[1];
        const filename = contentDisposition[3];

        if (filename) {
            const contentType = headers.match(/Content-Type: (.+)/)[1];
            files[fieldName] = {
                filename,
                content: Buffer.from(content.trim(), 'binary'),
                contentType,
            };
        } else {
            fields[fieldName] = content.trim();
        }
    });

    return { files, fields };
}
