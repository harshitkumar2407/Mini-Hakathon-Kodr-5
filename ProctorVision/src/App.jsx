import Navbar from './components/Navbar.jsx'
import AppRouter from './routes/AppRouter.jsx'

function App() {
  return (
    <>
      <Navbar />
      <main className="app-main">
        <AppRouter />
      </main>
    </>
  )
}

export default App