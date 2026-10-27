import { getModel } from "../config/llmModels.js";

export const codingAgent = async (state) => {

    try {
        const llm = await getModel("coding");
        const intentLlm = await getModel("intent");
        const intentRes = await intentLlm.invoke(`
        You are an intent classifier.

        Return ONLY on of these values.

        CODE_GENERATION
        CODE_REVIEW
        CODE_EXPLANATION
        DEBUGGING
        OPTIMIZATION
        COVERSATION
        DOCUMENTATION
        
        User Request: ${state.prompt}`)

        const intent = intentRes.content;

        if (intent === "CODE_GENERATION") {
            const prompt = `
            You are JupiterAI coding agent.

            Generate the requested project.

            Default stack:
            - HTML
            - CSS
            - Javascript

            Use React / Next.js / Vue ONLY if explicitly requested.

            Rules:

            - Responsive
            - Modern UI
            - CSS Variables
            - Flexbox/Grid
            - Smooth scroll
            - Hover effects
            - Beautiful spacing
            - Single page unless user asks otherwise.

            IMAGES
            =============

            Always use real unpslash images.

            Never use placeholder images.

            Always use best practices.

            Return only valid JSON.

            Schema:

            {
                "files": [
                    {
                        "path": "index.html",
                        "content": "..."
                    },
                    {
                        "path": "style.css",
                        "content": "..."
                    },
                    {
                        "path": "script.js",
                        "content": "..."
                    }
                ]
            }

            Rules;
            - Ouput must start with {
            - Output must end with }
            - No markdown
            - No explanation
            - No extra text
            - No \`\`\`
            - Never mention intent

            User Request: ${state.prompt}
            `

            const response = await llm.invoke(prompt);
            const content = JSON.parse(response.content);

            return {
                ...state,
                aiResponse: "Code Generated Successfully",
                artifacts: [
                    {
                        id: Date.now(),
                        type: "Project",
                        files: content.files || [],
                        title: state.prompt
                    }
                ]
            }

        }

        const res = await llm.invoke(
            `
            The user's request is: ${intent}

            Return Markdown only.

            Never generate project files.

            Use headings like:

            # Overview

            ## Explanation

            ## Problems

            ## Improvements

            ## Best practices

            ## Optimize Code (if needed)

            User Request: ${state.prompt}

            `
        );

        const data = res.content;

        return {
            ...state,
            aiResponse: data,
            artifacts: []
        };
    } catch (err) {
        console.log(err)
        return {
            ...state,
            aiResponse: "Error generating code. Please try again.",
        };
    }

};