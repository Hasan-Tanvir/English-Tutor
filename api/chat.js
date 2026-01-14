// api/chat.js - Vercel Serverless Function
export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ 
            error: 'Method not allowed. Use POST.' 
        });
    }

    try {
        const { message } = req.body;
        
        if (!message) {
            return res.status(400).json({ 
                error: 'Message is required in request body' 
            });
        }

        // Get API key from Vercel environment variables
        const apiKey = process.env.DEEPSEEK_API_KEY;
        
        if (!apiKey) {
            console.error('DEEPSEEK_API_KEY is not set in environment variables');
            return res.status(500).json({ 
                error: 'API key not configured',
                hint: 'Please add DEEPSEEK_API_KEY to Vercel environment variables'
            });
        }

        // Log for debugging (won't show API key)
        console.log('Processing message:', message.substring(0, 50) + '...');
        
        // Call DeepSeek API
        const response = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [
                    {
                        role: 'system',
                        content: `You are a friendly, patient English tutor. Help the user practice English. 
                        Correct their mistakes gently. Explain grammar simply. Use examples. 
                        Keep responses conversational and helpful. Be encouraging and positive.
                        Always respond in English.`
                    },
                    {
                        role: 'user',
                        content: message
                    }
                ],
                max_tokens: 500,
                temperature: 0.7,
                stream: false
            })
        });

        // Check if API call was successful
        if (!response.ok) {
            const errorText = await response.text();
            console.error('DeepSeek API error:', response.status, errorText);
            return res.status(response.status).json({ 
                error: `DeepSeek API error: ${response.status}`,
                details: errorText
            });
        }

        const data = await response.json();
        
        // Check if we got a valid response
        if (!data.choices || !data.choices[0]) {
            console.error('Invalid response from DeepSeek:', data);
            return res.status(500).json({ 
                error: 'Invalid response from AI service' 
            });
        }

        // Return successful response
        return res.status(200).json(data);
        
    } catch (error) {
        console.error('Server error:', error);
        return res.status(500).json({ 
            error: 'Internal server error',
            message: error.message
        });
    }
}
