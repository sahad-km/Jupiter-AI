import { searchTool } from '../config/tavily.js'

export const searchAgent = async (state) => {
    try {

        const response = await searchTool.invoke({
            query: state.prompt
        })

        return {
            ...state,
            searchResults: response,
            images: response.images
        }

    } catch (error) {
        return {
            ...state,
            searchResults: [],
            images: []
        }
    }
};