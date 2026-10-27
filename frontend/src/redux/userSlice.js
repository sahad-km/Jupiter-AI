import { createSlice } from '@reduxjs/toolkit'

const initialState = {
    userData: null,
    loading: true,
}

export const userSlice = createSlice({
    name: 'user',
    initialState,
    reducers: {
        setUser: (state, action) => {
            state.userData = action.payload;
            state.loading = false;
        },
        clearUser: (state) => {
            state.userData = null;
            state.loading = false;
        },
        setLoading: (state, action) => {
            state.loading = action.payload;
        },
    },
})

export const { setUser, clearUser, setLoading } = userSlice.actions

export default userSlice.reducer
