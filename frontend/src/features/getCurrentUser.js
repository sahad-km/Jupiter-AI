import api from "../../utils/axios";

const getCurrentUser = async () => {
    try {
        const res = await api.get("/me");
        if (res.data) {
            return res.data;
        }
    } catch (err) {
        console.log("Error fetching current user:", err);
        // Clear expired or invalid session token
        localStorage.removeItem("jupiter_session_token");
        return null;
    }
}

export default getCurrentUser;