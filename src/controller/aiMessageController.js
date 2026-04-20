/**
 * Improve a message using OpenAI
 */
const improveMessage = async (req, res) => {
    try {
        const { message } = req.body;

        if (!message || !message.trim()) {
            return res.status(400).json({
                status: 400,
                success: false,
                message: 'Message is required'
            });
        }

        // Check if API key is configured
        if (!process.env.OPENAI_API_KEY) {
            return res.status(500).json({
                status: 500,
                success: false,
                message: 'OpenAI API key is not configured'
            });
        }

        // Initialize OpenAI client only when needed (lazy initialization)
        const OpenAI = require('openai');
        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });

        const completion = await openai.chat.completions.create({
            model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
            messages: [
                {
                    role: 'system',
                    content: `You are a helpful assistant that improves customer service messages.
                    Your task is to:
                    - Make the message more professional and polite
                    - Fix any grammar or spelling errors
                    - Keep the same meaning and intent
                    - Keep it concise and clear
                    - Maintain a friendly but professional tone
                    - Do not add any explanations, just return the improved message only`
                },
                {
                    role: 'user',
                    content: `Improve this customer service message:\n\n${message}`
                }
            ],
            max_tokens: 500,
            temperature: 0.7
        });

        const improvedMessage = completion.choices[0]?.message?.content?.trim();

        if (!improvedMessage) {
            return res.status(500).json({
                status: 500,
                success: false,
                message: 'Failed to generate improved message'
            });
        }

        res.status(200).json({
            status: 200,
            success: true,
            originalMessage: message,
            improvedMessage: improvedMessage
        });

    } catch (error) {
        console.error('Error improving message with OpenAI:', error);

        // Handle specific OpenAI errors
        if (error?.status === 401) {
            return res.status(401).json({
                status: 401,
                success: false,
                message: 'Invalid OpenAI API key'
            });
        }

        if (error?.status === 429) {
            return res.status(429).json({
                status: 429,
                success: false,
                message: 'OpenAI rate limit exceeded. Please try again later.'
            });
        }

        res.status(500).json({
            status: 500,
            success: false,
            message: 'Failed to improve message',
            error: error.message
        });
    }
};

module.exports = {
    improveMessage
};
