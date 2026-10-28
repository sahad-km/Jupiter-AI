import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../../utils/firebase';
import api from '../../utils/axios';
import { FcGoogle } from "react-icons/fc";
import { useSelector, useDispatch } from 'react-redux';
import { setUser } from '../redux/userSlice';
import SideBar from '../components/SideBar';
import ChatArea from '../components/ChatArea';
import Artifact from '../components/Artifact';

function Home() {
    const dispatch = useDispatch();
    const { userData, loading } = useSelector((state) => state.user);

    const handleLogin = async (token) => {
        try {
            const res = await api.post("/auth/login", { token });
            if (res.data) {
                if (res.data.token) {
                    localStorage.setItem("jupiter_session_token", res.data.token);
                }
                dispatch(setUser(res.data));
            }
        } catch (err) {
            console.error("Login failed:", err);
        }
    };

    const googleLogin = async () => {
        try {
            const data = await signInWithPopup(auth, googleProvider);
            const token = await data?.user?.getIdToken();
            await handleLogin(token);
        } catch (err) {
            console.error("Google sign in error:", err);
        }
    };

    if (loading) {
        return (
            <div className='h-screen flex items-center justify-center bg-[#0d0f14] text-white'>
                <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className='h-screen w-screen flex bg-[#0d0f14] text-white overflow-hidden'>
            {userData ? (
                <>
                    <SideBar />
                    <ChatArea />
                    <Artifact />
                </>
            ) : (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className='w-[340px] bg-[#13151c] border border-white/[0.08] rounded-2xl p-7 flex flex-col gap-5 shadow-2xl'>
                        <div className='flex flex-col gap-1'>
                            <h2 className='text-[17px] font-semibold text-slate-100 tracking-tight'>Welcome to JupiterAI</h2>
                            <p className='text-[13px] text-slate-500'>Please sign in to continue.</p>
                        </div>
                        <button
                            onClick={googleLogin}
                            className="w-full flex items-center justify-center gap-3 py-[11px] rounded-xl text-sm font-medium text-white
                            bg-gradient-to-br from-indigo-500 to-violet-700 hover:from-indigo-400 hover:to-violet-600 active:from-indigo-600 active:to-violet-800 border border-indigo-500/30 shadow-lg shadow-indigo-500/25 transition cursor-pointer"
                        >
                            <FcGoogle size={18} />
                            Continue with Google
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Home;
