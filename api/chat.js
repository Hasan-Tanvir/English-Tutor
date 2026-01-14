// api/chat.js
export default async function handler(req, res) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { message } = req.body;
        
        // Get API key from Vercel environment variable
        const apiKey = process.env.DEEPSEEK_API_KEY;
        
        if (!apiKey) {
            return res.status(500).json({ 
                error: 'API key not configured. Please add DEEPSEEK_API_KEY to environment variables.' 
            });
        }

        // Call DeepSeek API
        const response = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [
                    {
                        role: 'system',
                        content: `You are a friendly, patient English tutor. Help the user practice English. 
                        Correct their mistakes gently. Explain grammar simply. Use examples. 
                        Keep responses under 150 words. Speak at an intermediate English level.
                        Be encouraging and positive.`
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

        const data = await response.json();
        
        // Return the AI response
        res.status(200).json(data);
        
    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ 
            error: 'Failed to get response from AI service',
            details: error.message 
        });
    }
}
