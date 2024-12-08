const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
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
        formData.append('file', event.body); // הבקשה כבר כוללת את הקובץ כ-Binary
        formData.append('upload_preset', 'ycxh1g5i'); // Update with your Cloudinary preset

        const cloudinaryResponse = await fetch(`https://api.cloudinary.com/v1_1/de1nxl62t/auto/upload`, {
            method: 'POST',
            body: formData,
        });

        const responseJson = await cloudinaryResponse.json();
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
            return {
                statusCode: 500,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({ error: 'Failed to upload to Cloudinary', details: responseJson }),
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
