function countWords(text) {
    // Remove HTML tags
    const strippedText = text.replace(/<[^>]*>/g, ' ');
    // Remove special characters and extra spaces
    const cleanText = strippedText.replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
    // Split by spaces and count words
    return cleanText.split(' ').filter(word => word.length > 0).length;
}

async function copyContent() {
    const resultDiv = document.getElementById('result');
    const copyButton = document.getElementById('copyButton');
    
    try {
        await navigator.clipboard.writeText(resultDiv.innerText);
        
        // Change button text to show feedback
        const originalText = copyButton.innerHTML;
        copyButton.innerHTML = '<i class="fas fa-check"></i> Copied!';
        
        // Reset button text after 2 seconds
        setTimeout(() => {
            copyButton.innerHTML = originalText;
        }, 2000);
    } catch (err) {
        console.error('Failed to copy text: ', err);
        copyButton.innerHTML = '<i class="fas fa-times"></i> Failed to copy';
        
        setTimeout(() => {
            copyButton.innerHTML = '<i class="fas fa-copy"></i> Copy';
        }, 2000);
    }
}

async function generateArticle() {
    const apiKey = document.getElementById('apiKey').value;
    const topic = document.getElementById('topic').value;
    const targetUrl = document.getElementById('targetUrl').value;
    const websiteUrl = document.getElementById('websiteUrl').value;
    const inputLanguage = document.getElementById('inputLanguage').value;
    const outputLanguage = document.getElementById('outputLanguage').value;

    if (!apiKey || !topic || !targetUrl || !websiteUrl) {
        alert('Please fill in all fields');
        return;
    }

    const loading = document.getElementById('loading');
    const result = document.getElementById('result');
    const progressFill = document.querySelector('.progress-fill');
    const progressPercentage = document.getElementById('progress-percentage');
    
    // Reset and show loading state
    loading.classList.remove('hidden');
    result.innerHTML = '';
    progressFill.style.width = '0%';
    progressFill.classList.add('animate');

    // Start progress update
    let progress = 0;
    const progressInterval = setInterval(() => {
        if (progress < 90) {
            progress += 1;
            progressPercentage.textContent = `${progress}%`;
        }
    }, 600);

    // First, get focus keywords for the topic
    const keywordPrompt = `Generate 3-5 SEO-friendly focus keywords (each within 6 words) for the topic: "${topic}". 
    Format the response as a comma-separated list only, no explanations.`;

    try {
        // Get focus keywords first
        const keywordResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': websiteUrl,
                'X-Title': 'AI Article Generator'
            },
            body: JSON.stringify({
                model: 'nousresearch/hermes-3-llama-3.1-405b:free',
                messages: [{
                    role: 'user',
                    content: keywordPrompt
                }],
                max_tokens: 100,
                temperature: 0.3
            })
        });

        if (!keywordResponse.ok) {
            const errorText = await keywordResponse.text();
            let errorMessage;
            try {
                const errorData = JSON.parse(errorText);
                errorMessage = errorData.error?.message || 'Unknown API error';
            } catch {
                errorMessage = errorText || 'Unknown API error';
            }
            throw new Error(`Keyword API error: ${errorMessage}`);
        }

        const keywordData = await keywordResponse.json();
        
        // More detailed error checking for the keyword response
        if (!keywordData) {
            throw new Error('Empty response from keyword API');
        }
        if (!Array.isArray(keywordData.choices)) {
            console.error('Invalid keyword response structure:', keywordData);
            throw new Error('Invalid keyword API response structure');
        }
        if (keywordData.choices.length === 0) {
            throw new Error('No choices returned from keyword API');
        }
        if (!keywordData.choices[0]?.message?.content) {
            console.error('Invalid choice structure:', keywordData.choices[0]);
            throw new Error('Invalid keyword choice structure');
        }

        const focusKeywords = keywordData.choices[0].message.content.trim();
        if (!focusKeywords) {
            throw new Error('Empty keywords returned from API');
        }

        // Main article generation prompt with focus keywords
        const articlePrompt = `Please ignore all previous instructions. Following the guidelines provided by https://rankmath.com/kb/score-100-in-tests/. 
        I Want You To Act As A Content Writer Very Proficient SEO Writer Writes Fluently casual ${outputLanguage === 'en' ? 'English' : 'Bahasa Malaysia'}. 
        
        Use these focus keywords throughout the article: ${focusKeywords}
        
        Write a 2000-word 100% Unique, SEO-optimized, Human-Written article in ${outputLanguage === 'en' ? 'English' : 'Bahasa Malaysia'} 
        with at least 15 headings and subheadings (including H1, H2, H3, and H4 headings) that covers the topic "${topic}".
        
        Requirements:
        - Include the focus keywords naturally throughout the content
        - Use bullet points or numbered lists where appropriate
        - Write in your own words without copying from other sources
        - Consider perplexity and burstiness while maintaining context
        - Use formal "we" language with rich, detailed paragraphs
        - Write in a conversational style
        - End with a conclusion paragraph and 5 unique FAQs
        - Bold all titles and headings
        - Start with {start} tags and end with {finish} tags
        
        The article should be formatted in markdown and optimized to outrank "${targetUrl}" in Google.
        
        Include at the beginning:
        1) Focus Keywords: ${focusKeywords}
        2) SEO Title: Create an SEO title within 60 characters using the main focus keyword at the start
        3) Slug: Create a slug within 15 characters including the main focus keyword
        4) Meta Description: Write a meta description within 155 characters including the main focus keyword
        5) Alt text image: Create descriptive alt text that represents the article's theme`;

        // Generate the article
        const articleResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': websiteUrl,
                'X-Title': 'AI Article Generator'
            },
            body: JSON.stringify({
                model: 'nousresearch/hermes-3-llama-3.1-405b:free',
                messages: [{
                    role: 'user',
                    content: articlePrompt
                }],
                max_tokens: 4000,
                temperature: 0.7,
                stream: false
            })
        });

        if (!articleResponse.ok) {
            const errorText = await articleResponse.text();
            let errorMessage;
            try {
                const errorData = JSON.parse(errorText);
                errorMessage = errorData.error?.message || 'Unknown API error';
            } catch {
                errorMessage = errorText || 'Unknown API error';
            }
            throw new Error(`Article API error: ${errorMessage}`);
        }

        const articleData = await articleResponse.json();
        
        // Add thorough error checking for article response
        if (!articleData?.choices?.[0]?.message?.content) {
            console.error('Invalid API response:', articleData);
            throw new Error('Invalid article response format from API');
        }

        // Complete the progress bar
        progress = 100;
        progressPercentage.textContent = '100%';
        progressFill.style.width = '100%';
        
        const articleContent = articleData.choices[0].message.content;
        
        // Configure marked to interpret the content correctly
        marked.setOptions({
            breaks: true,
            gfm: true
        });
        
        // Render the markdown content
        result.innerHTML = marked.parse(articleContent);
        
        // Update word count
        const wordCount = countWords(result.innerText);
        document.getElementById('wordCount').textContent = `Words: ${wordCount}`;
        
        // Update word count color
        const wordCountElement = document.getElementById('wordCount');
        if (wordCount < 1800) {
            wordCountElement.style.color = '#ff4444';
        } else if (wordCount > 2200) {
            wordCountElement.style.color = '#ffbb33';
        } else {
            wordCountElement.style.color = '#00C851';
        }

    } catch (error) {
        console.error('Error details:', error);
        result.innerHTML = `<p class="error">Error: ${error.message}</p>`;
        document.getElementById('wordCount').textContent = 'Words: 0';
        
        // Reset progress bar on error
        progress = 0;
        progressPercentage.textContent = '0%';
        progressFill.style.width = '0%';
    } finally {
        clearInterval(progressInterval);
        setTimeout(() => {
            loading.classList.add('hidden');
            progressFill.classList.remove('animate');
        }, 1000);
    }
}

// Add this function to update word count in real-time as content changes
function updateWordCount() {
    const content = document.getElementById('result').innerText;
    const wordCount = countWords(content);
    document.getElementById('wordCount').textContent = `Words: ${wordCount}`;
}

// Optional: Add real-time word count updates
document.getElementById('result').addEventListener('input', updateWordCount); 