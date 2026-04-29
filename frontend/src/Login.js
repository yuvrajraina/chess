import { useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from './api';

const showcasePieces = {
    3: '\u265A',
    10: '\u265F',
    21: '\u2658',
    36: '\u2655',
};

const showcaseSquares = Array.from({ length: 64 }, (_, index) => ({
    piece: showcasePieces[index] || '',
    tone: (Math.floor(index / 8) + index) % 2 === 0 ? 'light' : 'dark',
}));

function Login({ onLogin }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [isRegister, setIsRegister] = useState(false);
    const [email, setEmail] = useState('');
    const [submitting, setSubmitting] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        setError(null);
        setSubmitting(true);

        try {
            if (isRegister) {
                await axios.post(`${API_BASE_URL}/register/`, { username, password, email });
            }

            const response = await axios.post(`${API_BASE_URL}/auth/login/`, { username, password });
            localStorage.setItem('access', response.data.access);
            localStorage.setItem('refresh', response.data.refresh);

            onLogin(response.data.access);
        } catch (err) {
            setError(err.response?.data?.detail || err.response?.data?.non_field_errors?.[0] || 'An error occurred. Please try again.');
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <main className="auth-page">
            <section className="auth-visual" aria-label="Chess Arena">
                <div>
                    <p className="eyebrow">Live chess room</p>
                    <h1>Chess Arena</h1>
                    <p className="auth-copy">Create a board, make your move, and keep the tempo.</p>
                </div>

                <div className="showcase-board" aria-hidden="true">
                    {showcaseSquares.map((square, index) => (
                        <span className={square.tone} key={index}>{square.piece}</span>
                    ))}
                </div>
            </section>

            <section className="auth-card">
                <div className="panel-heading">
                    <p className="eyebrow">{isRegister ? 'New player' : 'Welcome back'}</p>
                    <h2>{isRegister ? 'Create account' : 'Sign in'}</h2>
                </div>

                <form onSubmit={handleSubmit} className="stacked-form">
                    <label>
                        Username
                        <input
                            placeholder="Your username"
                            value={username}
                            autoComplete="username"
                            onChange={e => setUsername(e.target.value)}
                            required
                        />
                    </label>

                    {isRegister && (
                        <label>
                            Email
                            <input
                                type="email"
                                placeholder="you@example.com"
                                value={email}
                                autoComplete="email"
                                onChange={e => setEmail(e.target.value)}
                            />
                        </label>
                    )}

                    <label>
                        Password
                        <input
                            type="password"
                            placeholder="Your password"
                            value={password}
                            autoComplete={isRegister ? 'new-password' : 'current-password'}
                            onChange={e => setPassword(e.target.value)}
                            required
                        />
                    </label>

                    <button className="button primary" type="submit" disabled={submitting}>
                        {submitting ? 'Working...' : isRegister ? 'Create account' : 'Sign in'}
                    </button>
                </form>

                <button className="button ghost full-width" onClick={() => setIsRegister(!isRegister)}>
                    {isRegister ? 'I already have an account' : 'Create a new account'}
                </button>

                {error && <p className="notice error">{error}</p>}
            </section>
        </main>
    );
}

export default Login;
