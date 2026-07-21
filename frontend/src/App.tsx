import { InterviewPage } from './pages/InterviewPage';
import './index.css';

export function App() {
    return (
        <div className = "app">
            <header className = "app-header">
                <h1> Interview Practice</h1>
                <p>Practice Interviews with Real-time feedback</p>
            </header>

            <main className="app-main">
                <InterviewPage /> 
               
            </main>

            <footer className="app-main">
                <p> 2026 Interview Practice. All rights reserved. </p>
            </footer>
        </div>
    )
}

export default App;