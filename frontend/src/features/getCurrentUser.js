import api from "../../utils/axios";

const getCurrentUser = async () => {
    try {
        const res = await api.get("/me");
        if (res.data) {
            return res.data;
        }
    } catch (err) {
        console.log("Error fetching current user:", err);
        return null;
    }
}

export default getCurrentUser;