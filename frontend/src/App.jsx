import { useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { setUser, clearUser } from './redux/userSlice'
import Home from './pages/Home'
import getCurrentUser from './features/getCurrentUser'

function App() {
  const dispatch = useDispatch()

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await getCurrentUser();
        if (res) {
          dispatch(setUser(res))
        } else {
          dispatch(clearUser())
        }
      } catch (err) {
        dispatch(clearUser())
      }
    }

    fetchUser()
  }, [dispatch])

  return (
    <>
      <Home />
    </>
  )
}

export default App